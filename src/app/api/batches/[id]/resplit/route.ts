/**
 * POST /api/batches/:id/resplit - 按新pagesPerStudent重新拆分
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { loadBuffer } from '@/lib/storage/local';
import { splitPdf } from '@/lib/pdf/split';
import { rasterizeAndSave } from '@/lib/pdf/rasterize';
import { enqueueJob } from '@/lib/queue/dispatcher';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const pagesPerStudent = Number(body.pagesPerStudent || 2);

    const batch = await prisma.paperBatch.findUnique({ where: { id } });
    if (!batch) return NextResponse.json({ error: '批次不存在' }, { status: 404 });

    // 删除旧sheets和submissions
    const oldSubmissions = await prisma.submission.findMany({
      where: { sheet: { batchId: id } },
      select: { id: true },
    });
    for (const s of oldSubmissions) {
      await prisma.submission.delete({ where: { id: s.id } });
    }
    await prisma.paperSheet.deleteMany({ where: { batchId: id } });

    const pdfBuffer = await loadBuffer(batch.originalPdfPath);
    const { sheets } = await splitPdf(pdfBuffer, { pagesPerStudent });

    for (const s of sheets) {
      const { key: sheetPdfKey } = await (await import('@/lib/storage/local')).saveBuffer(
        s.pdfBuffer,
        `batches/${batch.id}/sheet-${String(s.orderIndex).padStart(3, '0')}.pdf`
      );
      const { storageKeys } = await rasterizeAndSave(s.pdfBuffer, `batches/${batch.id}/sheet-${String(s.orderIndex).padStart(3, '0')}`);

      const created = await prisma.paperSheet.create({
        data: {
          batchId: batch.id,
          orderIndex: s.orderIndex,
          pageRangeStart: s.pageRangeStart,
          pageRangeEnd: s.pageRangeEnd,
          pageImagePaths: storageKeys,
          detectedName: s.detectedName,
          detectedStudentNo: s.detectedStudentNo,
          status: 'queued',
        },
      });
      await enqueueJob('ocr', 'sheet', created.id);
    }

    await prisma.paperBatch.update({
      where: { id },
      data: { pagesPerStudent, status: 'ocr', error: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
