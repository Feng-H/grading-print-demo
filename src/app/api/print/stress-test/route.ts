/**
 * POST /api/print/stress-test - 打印压测：复制N份生成大PDF一次性发送
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue/dispatcher';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await req.json();
    const { submissionId, kind = 'merged', copies = 10 } = body;

    if (!submissionId) return NextResponse.json({ error: '缺少submissionId' }, { status: 400 });
    if (copies < 1 || copies > 500) return NextResponse.json({ error: 'copies范围1-500' }, { status: 400 });

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { generatedPdfs: true },
    });
    if (!submission) return NextResponse.json({ error: 'Submission不存在' }, { status: 404 });

    const pdf = submission.generatedPdfs.find(p => p.kind === kind);
    if (!pdf) return NextResponse.json({ error: 'PDF尚未生成' }, { status: 400 });

    const host = process.env.PRINTER_HOST;
    const port = Number(process.env.PRINTER_PORT ?? 9100);
    const protocol = (process.env.PRINTER_PROTOCOL as 'raw' | 'ipp') || 'raw';
    if (!host) return NextResponse.json({ error: '未配置打印机地址' }, { status: 400 });

    const printJob = await prisma.printJob.create({
      data: {
        submissionId,
        pdfId: pdf.id,
        printerHost: host,
        printerPort: port,
        protocol,
        copies: 1, // stress_gen会重新生成大PDF，最终是1份
        isStressTest: true,
        stressTestCopies: copies,
        status: 'pending',
        requestedById: session.user.id,
      },
    });

    // 先生成大PDF，再打印
    await enqueueJob('stress_gen', 'printjob', printJob.id, 5);

    return NextResponse.json({ printJobId: printJob.id, estimatedPages: copies * (submission.sheetId ? 2 : 1) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
