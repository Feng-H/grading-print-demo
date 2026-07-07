/**
 * GET /api/batches - 获取批次列表
 * POST /api/batches - 手动上传PDF创建batch
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { saveBuffer } from '@/lib/storage/local';
import { getPdfPageCount } from '@/lib/pdf/rasterize';
import { enqueueJob } from '@/lib/queue/dispatcher';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where: any = { teacherId: session.user.id };
    if (status) where.status = status;

    const includeSheets = !status;
    const batches = await prisma.paperBatch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sheets: true } },
        class: { select: { name: true, grade: true } },
        sheets: includeSheets ? {
          include: {
            student: { select: { id: true, name: true, studentNo: true } },
            submission: { select: { id: true, status: true, totalScore: true } },
          },
          orderBy: { orderIndex: 'asc' },
        } : false,
      },
      take: 50,
    });

    return NextResponse.json({ batches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const classId = formData.get('classId') as string | null;
    const pagesPerStudent = Number(formData.get('pagesPerStudent') || 2);
    const expectedStudentCount = formData.get('expectedStudentCount') ? Number(formData.get('expectedStudentCount')) : undefined;

    if (!file) {
      return NextResponse.json({ error: '请上传PDF文件' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: '仅支持PDF文件' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const pageCount = await getPdfPageCount(buf);
    const saved = await saveBuffer(buf, `uploads/${Date.now()}-${file.name}`);

    const batch = await prisma.paperBatch.create({
      data: {
        sourceType: 'manual',
        sourceUri: file.name,
        originalPdfPath: saved.key,
        pageCount,
        pagesPerStudent,
        expectedStudentCount,
        splitStrategy: 'fixed',
        status: 'uploading',
        teacherId: session.user.id,
        classId: classId || undefined,
      },
    });

    await enqueueJob('split', 'batch', batch.id);

    return NextResponse.json({ batchId: batch.id, pageCount });
  } catch (error: any) {
    console.error('[batches] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
