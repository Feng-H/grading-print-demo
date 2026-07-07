/**
 * GET /api/storage/[...key] - 受保护的存储文件访问（原卷JPG等）
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadBuffer, getStorageRoot } from '@/lib/storage/local';
import path from 'node:path';
import { Readable } from 'node:stream';

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { key } = await params;
    const keyPath = key.join('/');

    // 路径安全检查
    const resolved = path.resolve(getStorageRoot(), keyPath);
    if (!resolved.startsWith(getStorageRoot())) {
      return NextResponse.json({ error: '非法路径' }, { status: 400 });
    }

    const buf = await loadBuffer(keyPath);
    const ext = path.extname(keyPath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(Readable.from(buf) as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buf.length),
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
