/**
 * POST /api/submissions/:id/print - 创建打印任务
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue/dispatcher';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const kind: 'merged' | 'overlay' = body.kind || 'merged';
    const copies = Math.max(1, Number(body.copies) || 1);
    const approveFirst = body.approveFirst !== false;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { generatedPdfs: true },
    });
    if (!submission) return NextResponse.json({ error: 'Submission不存在' }, { status: 404 });

    const pdf = submission.generatedPdfs.find(p => p.kind === kind);
    if (!pdf) return NextResponse.json({ error: 'PDF尚未生成，请等待渲染完成' }, { status: 400 });

    const host = process.env.PRINTER_HOST;
    const port = Number(process.env.PRINTER_PORT ?? 9100);
    const protocol = (process.env.PRINTER_PROTOCOL as 'raw' | 'ipp') || 'raw';

    if (!host) return NextResponse.json({ error: '未配置打印机地址' }, { status: 400 });

    // 自动approve
    if (approveFirst && !submission.teacherApprovedAt) {
      await prisma.submission.update({
        where: { id },
        data: { teacherApprovedAt: new Date(), teacherApprovedBy: session.user.id, status: 'approved' },
      });
    }

    // 创建打印任务
    const printJob = await prisma.printJob.create({
      data: {
        submissionId: id,
        pdfId: pdf.id,
        printerHost: host,
        printerPort: port,
        protocol,
        copies,
        status: 'pending',
        requestedById: session.user.id,
      },
    });

    await enqueueJob('print', 'printjob', printJob.id, 10); // 打印任务优先级高

    return NextResponse.json({ printJobId: printJob.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
