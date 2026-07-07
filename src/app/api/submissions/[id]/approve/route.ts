/**
 * POST /api/submissions/:id/approve - 老师确认通过
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { id } = await params;

    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) return NextResponse.json({ error: 'Submission不存在' }, { status: 404 });

    await prisma.submission.update({
      where: { id },
      data: {
        teacherApprovedAt: new Date(),
        teacherApprovedBy: session.user.id,
        status: 'approved',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
