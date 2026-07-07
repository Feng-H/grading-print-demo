/**
 * GET /api/submissions/:id/annotations - 获取批注
 * PUT /api/submissions/:id/annotations - 覆盖保存批注→触发重新render
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue/dispatcher';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { id } = await params;
    const annotations = await prisma.annotation.findMany({
      where: { submissionId: id },
      orderBy: [{ page: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json({ annotations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const { annotations } = body as { annotations: any[] };

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) return NextResponse.json({ error: 'Submission不存在' }, { status: 404 });

    // 替换所有批注（teacher来源覆盖；ai来源保留还是覆盖？这里全部覆盖）
    await prisma.annotation.deleteMany({ where: { submissionId: id } });
    if (annotations && annotations.length > 0) {
      await prisma.annotation.createMany({
        data: annotations.map(a => ({
          submissionId: id,
          questionId: a.questionId || null,
          page: Number(a.page) || 0,
          kind: a.kind,
          xPct: Number(a.xPct),
          yPct: Number(a.yPct),
          wPct: a.wPct != null ? Number(a.wPct) : null,
          hPct: a.hPct != null ? Number(a.hPct) : null,
          text: a.text || null,
          strokePath: a.strokePath || null,
          color: a.color || '#E11D48',
          fontSize: a.fontSize != null ? Number(a.fontSize) : null,
          strokeWidth: a.strokeWidth != null ? Number(a.strokeWidth) : null,
          source: 'teacher',
        })),
      });
    }

    // 撤销approval、更新版本、入队重新渲染
    await prisma.submission.update({
      where: { id },
      data: {
        annotationVersion: { increment: 1 },
        teacherApprovedAt: null,
        teacherApprovedBy: null,
        status: 'annotated',
      },
    });

    // 删除旧PDF
    await prisma.generatedPdf.deleteMany({ where: { submissionId: id } });
    await enqueueJob('render', 'submission', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
