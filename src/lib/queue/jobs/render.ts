/**
 * Render Job Handler: 生成merged和overlay两种PDF
 */
import prisma from '../../prisma';
import { loadBuffer, saveBuffer } from '../../storage/local';
import { renderMergedPdf, renderOverlayPdf } from '../../pdf/render';
import crypto from 'node:crypto';
import { enqueueJob } from '../dispatcher';

export async function handleRenderJob(job: { refId: string }) {
  const submission = await prisma.submission.findUnique({
    where: { id: job.refId },
    include: {
      sheet: true,
      annotations: true,
      homework: true,
    },
  });
  if (!submission) throw new Error('Submission不存在');
  if (!submission.sheet) throw new Error('Submission没有关联sheet');

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: 'rendered' },
  });

  // 读取sheet的原PDF
  const sheetPdfKey = `batches/${submission.sheet.batchId}/sheet-${String(submission.sheet.orderIndex).padStart(3, '0')}.pdf`;
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await loadBuffer(sheetPdfKey);
  } catch {
    throw new Error(`无法加载试卷PDF: ${sheetPdfKey}`);
  }

  // 转换annotations为render格式
  const annotations = submission.annotations.map(a => ({
    page: a.page,
    kind: a.kind,
    xPct: a.xPct,
    yPct: a.yPct,
    wPct: a.wPct,
    hPct: a.hPct,
    text: a.text,
    color: a.color,
    fontSize: a.fontSize,
    strokeWidth: a.strokeWidth,
    strokePath: a.strokePath,
  }));

  const sheet = { pdfBuffer, pageCount: submission.sheet.pageImagePaths.length };

  // 渲染两种PDF
  const [mergedBuf, overlayBuf] = await Promise.all([
    renderMergedPdf(sheet, annotations),
    renderOverlayPdf(sheet, annotations),
  ]);

  const batchId = submission.sheet.batchId;
  const sheetIdx = String(submission.sheet.orderIndex).padStart(3, '0');

  // 删除旧PDF
  await prisma.generatedPdf.deleteMany({ where: { submissionId: submission.id } });

  // 保存merged
  const mergedKey = `batches/${batchId}/sheet-${sheetIdx}.merged.pdf`;
  const mergedChecksum = crypto.createHash('sha256').update(mergedBuf).digest('hex');
  await saveBuffer(mergedBuf, mergedKey);
  await prisma.generatedPdf.create({
    data: {
      submissionId: submission.id,
      kind: 'merged',
      path: mergedKey,
      sizeBytes: mergedBuf.length,
      checksum: mergedChecksum,
    },
  });

  // 保存overlay
  const overlayKey = `batches/${batchId}/sheet-${sheetIdx}.overlay.pdf`;
  const overlayChecksum = crypto.createHash('sha256').update(overlayBuf).digest('hex');
  await saveBuffer(overlayBuf, overlayKey);
  await prisma.generatedPdf.create({
    data: {
      submissionId: submission.id,
      kind: 'overlay',
      path: overlayKey,
      sizeBytes: overlayBuf.length,
      checksum: overlayChecksum,
    },
  });

  // 标记submission和sheet为待复核
  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: 'needs_review' },
  });
  if (submission.sheet) {
    await prisma.paperSheet.update({
      where: { id: submission.sheet.id },
      data: { status: 'needs_review' },
    });
  }

  // 检查是否整个batch所有sheet都完成了
  const totalSheets = await prisma.paperSheet.count({ where: { batchId } });
  const completedSheets = await prisma.paperSheet.count({
    where: {
      batchId,
      status: { in: ['needs_review', 'failed', 'submitted', 'rendered'] },
    },
  });
  if (completedSheets >= totalSheets) {
    const failedCount = await prisma.paperSheet.count({ where: { batchId, status: 'failed' } });
    await prisma.paperBatch.update({
      where: { id: batchId },
      data: {
        status: failedCount > 0 ? 'partial' : 'ready',
      },
    });
  }
}
