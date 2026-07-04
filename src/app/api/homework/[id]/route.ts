import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { id } = await params;

    const hw = await prisma.homework.findUnique({
      where: { id },
      include: {
        class: true,
        questions: { orderBy: { order: 'asc' } },
        submissions: {
          include: {
            student: true,
            answers: true,
            gradingResults: true,
          },
        },
      },
    });
    if (!hw) return NextResponse.json({ error: '作业不存在' }, { status: 404 });

    return NextResponse.json({ homework: hw });
  } catch (e: any) {
    console.error('[homework/:id GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
