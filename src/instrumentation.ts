/**
 * Next.js instrumentation hook
 * 服务器启动时启动队列调度器
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // 动态导入避免edge runtime报错
    const { startScheduler } = await import('./lib/queue/scheduler');
    startScheduler();
  }
}
