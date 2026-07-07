/**
 * Print Job Handler: 发送PDF到打印机
 */
import prisma from '../../prisma';
import { loadBuffer } from '../../storage/local';
import { printPdf } from '../../print';

export async function handlePrintJob(job: { refId: string }) {
  const printJob = await prisma.printJob.findUnique({
    where: { id: job.refId },
    include: { pdf: true },
  });
  if (!printJob) throw new Error('PrintJob不存在');

  await prisma.printJob.update({
    where: { id: printJob.id },
    data: { status: 'printing', attempts: { increment: 1 }, sentAt: new Date() },
  });

  if (!printJob.pdf) throw new Error('PrintJob没有关联PDF');

  const pdfBuffer = await loadBuffer(printJob.pdf.path);
  await prisma.printJob.update({
    where: { id: printJob.id },
    data: { fileSizeBytes: pdfBuffer.length },
  });

  const host = printJob.printerHost || process.env.PRINTER_HOST;
  const port = printJob.printerPort || Number(process.env.PRINTER_PORT ?? 9100);
  if (!host) throw new Error('未配置打印机地址');

  await printPdf(pdfBuffer, {
    host,
    port,
    protocol: (printJob.protocol as any) || (process.env.PRINTER_PROTOCOL as any) || 'raw',
    jobName: `swp-${printJob.id.slice(0, 8)}`,
    timeoutMs: Number(process.env.PRINTER_TIMEOUT_MS ?? 60000),
  });

  await prisma.printJob.update({
    where: { id: printJob.id },
    data: { status: 'success', finishedAt: new Date() },
  });

  // 如果不是压测任务且关联submission，更新submission状态为printed
  if (!printJob.isStressTest && printJob.submissionId) {
    await prisma.submission.update({
      where: { id: printJob.submissionId },
      data: { status: 'printed' },
    });
  }
}
