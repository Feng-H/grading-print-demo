/**
 * Stress-Gen Job Handler: 复制PDF N份生成大体积压测PDF
 */
import prisma from '../../prisma';
import { loadBuffer, saveBuffer } from '../../storage/local';
import { duplicatePdf } from '../../pdf/render';
import crypto from 'node:crypto';
import { enqueueJob } from '../dispatcher';

export async function handleStressGenJob(job: { refId: string }) {
  const printJob = await prisma.printJob.findUnique({
    where: { id: job.refId },
    include: { pdf: true },
  });
  if (!printJob) throw new Error('PrintJob不存在');
  if (!printJob.pdf) throw new Error('PrintJob没有关联PDF');

  await prisma.printJob.update({
    where: { id: printJob.id },
    data: { status: 'generating' },
  });

  const copies = printJob.stressTestCopies || 10;

  // 取源PDF
  let sourcePdfPath: string;
  if (printJob.submissionId && printJob.pdfId) {
    sourcePdfPath = printJob.pdf.path;
  } else {
    throw new Error('压测任务缺少源PDF');
  }

  const sourceBuf = await loadBuffer(sourcePdfPath);
  const bigPdfBuf = await duplicatePdf(sourceBuf, copies);

  const stressKey = `stress/${printJob.id}/stress-${copies}x.pdf`;
  const checksum = crypto.createHash('sha256').update(bigPdfBuf).digest('hex');
  const saved = await saveBuffer(bigPdfBuf, stressKey);

  // 创建一个GeneratedPdf记录关联到stress PDF
  // 由于GeneratedPdf需要submissionId，这里直接更新PrintJob的pdfId指向一个临时记录
  // 简单做法：直接记录path到PrintJob，不建GeneratedPdf（因为它不属于某个submission）
  // 我们扩展PrintJob使用一个临时pdf路径
  // 用raw SQL更新避免schema不匹配（或者用GeneratedPdf存，submissionId用源submissionId）
  // 用kind='stress'避免与原merged/overlay PDF的 (submissionId, kind) unique约束冲突
  const stressPdf = await prisma.generatedPdf.create({
    data: {
      submissionId: printJob.submissionId!,
      kind: 'stress',
      path: stressKey,
      sizeBytes: bigPdfBuf.length,
      checksum,
    },
  });

  await prisma.printJob.update({
    where: { id: printJob.id },
    data: {
      pdfId: stressPdf.id,
      fileSizeBytes: bigPdfBuf.length,
      copies: 1, // 大PDF是一个文件
      status: 'pending',
    },
  });

  // 入队打印
  await enqueueJob('print', 'printjob', printJob.id);
}
