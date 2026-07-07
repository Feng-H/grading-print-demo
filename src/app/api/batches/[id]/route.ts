/**
 * GET /api/batches/:id - 获取批次详情（含sheets）
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { id } = await params;

    const batch = await prisma.paperBatch.findUnique({
      where: { id },
      include: {
        class: { select: { name: true, grade: true, subject: true } },
        sheets: {
          include: {
            student: { select: { id: true, name: true, studentNo: true } },
            submission: { select: { id: true, status: true, totalScore: true } },
          },
          orderBy: { orderIndex: 'asc' },
        },
        homework: { select: { id: true, title: true, totalScore: true } },
      },
    });

    if (!batch) return NextResponse.json({ error: '批次不存在' }, { status: 404 });

    return NextResponse.json({ batch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
