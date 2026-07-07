/**
 * POST /api/webhooks/webdav - 接收扫描仪webhook通知，触发处理
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { saveBuffer } from '@/lib/storage/local';
import { getPdfPageCount } from '@/lib/pdf/rasterize';
import { enqueueJob } from '@/lib/queue/dispatcher';
import { downloadFile } from '@/lib/webdav/client';

const WEBHOOK_TOKEN = process.env.WEBDAV_WEBHOOK_TOKEN;

export async function POST(req: Request) {
  try {
    // Token验证
    if (WEBHOOK_TOKEN) {
      const token = req.headers.get('X-Webhook-Token') || new URL(req.url).searchParams.get('token');
      if (token !== WEBHOOK_TOKEN) {
        return NextResponse.json({ error: '无效token' }, { status: 403 });
      }
    }

    const body = await req.json().catch(() => ({})) as any;
    const filePath = body.path || body.filename || body.file;
    if (!filePath) {
      return NextResponse.json({ error: '缺少path参数' }, { status: 400 });
    }

    // 去重
    const seen = await prisma.webdavSeen.findUnique({ where: { path: filePath } });
    if (seen) {
      return NextResponse.json({ ok: true, skipped: 'already processed' });
    }

    // 下载PDF
    const pdfBuffer = await downloadFile(filePath);
    const pageCount = await getPdfPageCount(pdfBuffer);
    const saved = await saveBuffer(pdfBuffer, `webdav/${Date.now()}-${path.basename(filePath)}`);

    const teacher = await prisma.user.findFirst({ where: { role: 'teacher' } });
    if (!teacher) return NextResponse.json({ error: '无老师账号' }, { status: 500 });

    const batch = await prisma.paperBatch.create({
      data: {
        sourceType: 'webdav',
        sourceUri: filePath,
        originalPdfPath: saved.key,
        pageCount,
        pagesPerStudent: 2,
        splitStrategy: 'fixed',
        status: 'uploading',
        teacherId: teacher.id,
      },
    });

    await prisma.webdavSeen.create({
      data: { path: filePath, mtime: new Date() },
    });

    await enqueueJob('split', 'batch', batch.id);

    return NextResponse.json({ ok: true, batchId: batch.id });
  } catch (error: any) {
    console.error('[webdav webhook] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 需要path module
import path from 'node:path';
