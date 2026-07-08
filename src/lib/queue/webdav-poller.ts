/**
 * WebDAV轮询器：定期扫描WebDAV文件夹，发现新PDF创建batch入队
 */
import prisma from '../prisma';
import { listNewFiles, downloadFile } from '../webdav/client';
import { saveBuffer } from '../storage/local';
import { enqueueJob } from './dispatcher';
import { getPdfPageCount } from '../pdf/rasterize';

export async function pollWebdav() {
  if (!process.env.WEBDAV_BASE_URL) return;
  try {
    // 找到最近一次处理时间
    const last = await prisma.webdavSeen.findFirst({
      orderBy: { mtime: 'desc' },
    });
    const since = last?.mtime ?? new Date(Date.now() - 24 * 3600 * 1000);

    const files = await listNewFiles(undefined, since);
    for (const f of files) {
      // 去重
      const seen = await prisma.webdavSeen.findUnique({ where: { path: f.filename } });
      if (seen) continue;

      // 跳过0字节文件（可能还在上传中）
      if (f.size === 0) {
        console.log(`[webdav] 跳过0字节文件: ${f.filename}（可能还在上传中）`);
        continue;
      }

      console.log(`[webdav] 发现新文件: ${f.filename} (${f.size} bytes)`);
      try {
        const pdfBuffer = await downloadFile(f.filename);
        const pageCount = await getPdfPageCount(pdfBuffer);
        const saved = await saveBuffer(pdfBuffer, `webdav/${Date.now()}-${f.basename}`);

        const teacherUsers = await prisma.user.findFirst({ where: { role: 'teacher' } });
        const teacherId = teacherUsers?.id;
        if (!teacherId) {
          console.warn('[webdav] 没有老师账号，无法创建batch');
          continue;
        }

        const batch = await prisma.paperBatch.create({
          data: {
            sourceType: 'webdav',
            sourceUri: f.filename,
            originalPdfPath: saved.key,
            pageCount,
            pagesPerStudent: 2,
            splitStrategy: 'fixed',
            status: 'uploading',
            teacherId,
          },
        });

        await prisma.webdavSeen.create({
          data: { path: f.filename, mtime: new Date(f.lastmod) },
        });

        await enqueueJob('split', 'batch', batch.id);
        console.log(`[webdav] 创建batch ${batch.id}，已入队拆分`);
      } catch (err: any) {
        console.error(`[webdav] 处理文件失败 ${f.filename}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error('[webdav] 轮询失败:', err.message);
  }
}
