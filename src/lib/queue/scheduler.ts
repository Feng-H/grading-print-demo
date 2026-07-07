/**
 * 内置队列调度器
 * 使用setInterval轮询Postgres Job表，单进程消费
 * 多副本部署依赖FOR UPDATE SKIP LOCKED保证不重复消费
 */
import prisma from '../prisma';
import { dispatchJob } from './dispatcher';

let started = false;
let pollTimer: NodeJS.Timeout | null = null;
let running = false;

const POLL_INTERVAL = 2000; // 2秒轮询一次

export function startScheduler() {
  if (started) return;
  if (process.env.RUN_QUEUE !== '1') {
    console.log('[scheduler] RUN_QUEUE≠1，队列调度器未启动');
    return;
  }
  started = true;
  console.log('[scheduler] 队列调度器启动');

  // 启动时先做一次WebDAV扫描
  setTimeout(pollWebdav, 5000);
  // 每分钟轮询WebDAV
  setInterval(pollWebdav, Number(process.env.WEBDAV_POLL_INTERVAL_MS ?? 60000));

  // 主轮询循环
  pollTimer = setInterval(pollQueue, POLL_INTERVAL);

  // 优雅关闭
  process.on('SIGTERM', stopScheduler);
  process.on('SIGINT', stopScheduler);
}

export function stopScheduler() {
  if (pollTimer) clearInterval(pollTimer);
  started = false;
  running = false;
  console.log('[scheduler] 调度器已停止');
}

async function pollQueue() {
  if (running) return;
  running = true;
  try {
    // 抢占一个pending job
    const job = await prisma.$transaction(async (tx) => {
      const jobs = await tx.$queryRaw<any[]>`
        SELECT id FROM "Job"
        WHERE status = 'pending' AND "nextRunAt" <= NOW()
        ORDER BY priority DESC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `;
      if (jobs.length === 0) return null;
      const jobId = jobs[0].id as string;
      await tx.job.update({
        where: { id: jobId },
        data: { status: 'running' },
      });
      return jobId;
    });

    if (job) {
      // 异步执行，不阻塞poller循环
      dispatchJob(job).catch(err => {
        console.error('[scheduler] dispatch error:', err);
      });
    }
  } catch (err) {
    console.error('[scheduler] poll error:', err);
  } finally {
    running = false;
  }
}

// WebDAV轮询逻辑在webdav poller中实现，避免循环引用
import { pollWebdav } from './webdav-poller';
