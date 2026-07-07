/**
 * POST /api/print-jobs/:id/retry - 重试失败的打印任务
 * DELETE /api/print-jobs/:id - 取消待打印任务
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue/dispatcher';

async function getJob(id: string) {
  return prisma.printJob.findUnique({ where: { id } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  if (job.status === 'printing') return NextResponse.json({ error: '正在打印中' }, { status: 400 });

  await prisma.printJob.update({
    where: { id },
    data: { status: 'pending', lastError: null },
  });
  await enqueueJob('print', 'printjob', id, 10);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  if (job.status === 'success' || job.status === 'printing') {
    return NextResponse.json({ error: '无法取消已发送/正在打印的任务' }, { status: 400 });
  }
  await prisma.printJob.update({ where: { id }, data: { status: 'canceled' } });
  return NextResponse.json({ success: true });
}
