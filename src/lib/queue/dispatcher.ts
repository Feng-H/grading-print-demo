/**
 * 队列任务分发器：根据kind路由到对应handler
 */
import prisma from '../prisma';
import { handleSplitJob } from './jobs/split';
import { handleOcrJob } from './jobs/ocr';
import { handleGradeJob } from './jobs/grade';
import { handleAnnotateJob } from './jobs/annotate';
import { handleRenderJob } from './jobs/render';
import { handleStressGenJob } from './jobs/stress-gen';
import { handlePrintJob } from './jobs/print';

export type JobKind = 'split' | 'ocr' | 'grade' | 'annotate' | 'render' | 'stress_gen' | 'print';

export async function dispatchJob(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  console.log(`[queue] 处理任务 ${job.kind} ${job.refType}:${job.refId}`);

  try {
    switch (job.kind as JobKind) {
      case 'split': await handleSplitJob(job); break;
      case 'ocr': await handleOcrJob(job); break;
      case 'grade': await handleGradeJob(job); break;
      case 'annotate': await handleAnnotateJob(job); break;
      case 'render': await handleRenderJob(job); break;
      case 'stress_gen': await handleStressGenJob(job); break;
      case 'print': await handlePrintJob(job); break;
      default:
        throw new Error(`未知任务类型: ${job.kind}`);
    }
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'done', attempts: { increment: 1 }, lastError: null },
    });
    console.log(`[queue] 任务完成 ${job.kind}`);
  } catch (err: any) {
    console.error(`[queue] 任务失败 ${job.kind}:`, err);
    const newAttempts = job.attempts + 1;
    const maxRetries = 3;
    if (newAttempts >= maxRetries) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          attempts: newAttempts,
          lastError: err.message?.slice(0, 500) || String(err),
        },
      });
      // 标记关联对象为needs_review/failed
      await markRefFailed(job.refType, job.refId, err.message);
    } else {
      // 指数退避重试：10s, 30s, 60s
      const delays = [10000, 30000, 60000];
      const delay = delays[Math.min(newAttempts - 1, delays.length - 1)];
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'pending',
          attempts: newAttempts,
          lastError: err.message?.slice(0, 500) || String(err),
          nextRunAt: new Date(Date.now() + delay),
        },
      });
    }
  }
}

async function markRefFailed(refType: string, refId: string, error: string) {
  try {
    const err = error?.slice(0, 500) || '处理失败';
    if (refType === 'batch') {
      await prisma.paperBatch.update({ where: { id: refId }, data: { status: 'failed', error: err } });
    } else if (refType === 'sheet') {
      await prisma.paperSheet.update({ where: { id: refId }, data: { status: 'failed', error: err } });
    } else if (refType === 'submission') {
      await prisma.submission.update({ where: { id: refId }, data: { status: 'failed' } });
    } else if (refType === 'printjob') {
      await prisma.printJob.update({ where: { id: refId }, data: { status: 'failed', lastError: err } });
    }
  } catch {}
}

/**
 * 入队工具
 */
export async function enqueueJob(kind: JobKind, refType: string, refId: string, priority = 0) {
  try {
    return await prisma.job.create({
      data: { kind, refType, refId, priority, nextRunAt: new Date() },
    });
  } catch (err: any) {
    // 唯一约束冲突说明任务已存在
    if (err.code === 'P2002') {
      console.log(`[queue] 任务已存在，跳过: ${kind} ${refType}:${refId}`);
      return null;
    }
    throw err;
  }
}
