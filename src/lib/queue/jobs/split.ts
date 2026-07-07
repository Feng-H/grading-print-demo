/**
 * Split Job Handler: 拆分Batch PDF为单学生sheet
 */
import prisma from '../../prisma';
import { loadBuffer } from '../../storage/local';
import { splitPdf } from '../../pdf/split';
import { rasterizeAndSave } from '../../pdf/rasterize';
import { enqueueJob } from '../dispatcher';

export async function handleSplitJob(job: { refId: string }) {
  const batch = await prisma.paperBatch.findUnique({ where: { id: job.refId } });
  if (!batch) throw new Error('Batch不存在');

  await prisma.paperBatch.update({
    where: { id: batch.id },
    data: { status: 'splitting' },
  });

  const pdfBuffer = await loadBuffer(batch.originalPdfPath);
  const pagesPerStudent = batch.pagesPerStudent || 2;

  // fixed策略拆分（AI策略在OCR后用检测结果调整）
  const { sheets } = await splitPdf(pdfBuffer, {
    pagesPerStudent,
    expectedStudentCount: batch.expectedStudentCount ?? undefined,
  });

  // 保存每份PDF和页图
  for (const s of sheets) {
    // 保存单份PDF
    const { key: sheetPdfKey } = await (await import('../../storage/local')).saveBuffer(
      s.pdfBuffer,
      `batches/${batch.id}/sheet-${String(s.orderIndex).padStart(3, '0')}.pdf`
    );

    // 光栅化每页为JPG
    const { storageKeys } = await rasterizeAndSave(
      s.pdfBuffer,
      `batches/${batch.id}/sheet-${String(s.orderIndex).padStart(3, '0')}`,
      { scale: 1.5, quality: 0.85 }
    );

    const created = await prisma.paperSheet.create({
      data: {
        batchId: batch.id,
        orderIndex: s.orderIndex,
        pageRangeStart: s.pageRangeStart,
        pageRangeEnd: s.pageRangeEnd,
        pageImagePaths: storageKeys,
        detectedName: s.detectedName,
        detectedStudentNo: s.detectedStudentNo,
        nameConfidence: s.nameConfidence,
        status: 'queued',
      },
    });

    // 每个sheet入队OCR
    await enqueueJob('ocr', 'sheet', created.id);
  }

  await prisma.paperBatch.update({
    where: { id: batch.id },
    data: { status: 'ocr' },
  });
}
