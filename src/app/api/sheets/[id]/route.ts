/**
 * PATCH /api/sheets/:id - 修正studentId/状态
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();

    const sheet = await prisma.paperSheet.findUnique({
      where: { id },
      include: { submission: true },
    });
    if (!sheet) return NextResponse.json({ error: 'Sheet不存在' }, { status: 404 });

    const update: any = {};
    if (body.studentId !== undefined) {
      update.studentId = body.studentId || null;
      if (sheet.submission && body.studentId) {
        await prisma.submission.update({
          where: { id: sheet.submission.id },
          data: { studentId: body.studentId },
        });
      }
    }
    if (body.status) update.status = body.status;

    await prisma.paperSheet.update({ where: { id }, data: update });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
