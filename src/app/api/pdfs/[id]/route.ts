/**
 * GET /api/pdfs/:id - stream PDF文件
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { loadBuffer } from '@/lib/storage/local';
import { Readable } from 'node:stream';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { id } = await params;

    const pdf = await prisma.generatedPdf.findUnique({ where: { id } });
    if (!pdf) return NextResponse.json({ error: 'PDF不存在' }, { status: 404 });

    const buf = await loadBuffer(pdf.path);
    const filename = `${pdf.kind}-${pdf.submissionId.slice(0, 8)}.pdf`;

    return new NextResponse(Readable.from(buf) as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buf.length),
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
