import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    if (session.user.role === 'teacher') {
      const students = await prisma.student.findMany({
        where: classId ? { classId } : { class: { teacherId: session.user.id } },
        orderBy: { studentNo: 'asc' },
      });
      return NextResponse.json({ students });
    }

    if (session.user.role === 'parent') {
      const students = await prisma.student.findMany({
        where: { parentId: session.user.id },
      });
      return NextResponse.json({ students });
    }

    return NextResponse.json({ error: '无效角色' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
