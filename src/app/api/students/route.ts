import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withDbFallback, DEMO_STUDENTS } from '@/lib/db-safe';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    if (session.user.role === 'teacher') {
      const students = await withDbFallback(async () => {
        const { prisma } = await import('@/lib/db-safe');
        const list = await prisma.student.findMany({
          where: classId ? { classId } : { class: { teacherId: session.user.id } },
          orderBy: { studentNo: 'asc' },
        });
        return list;
      }, DEMO_STUDENTS);
      return NextResponse.json({ students });
    }

    if (session.user.role === 'parent') {
      const children = await withDbFallback(async () => {
        const { prisma } = await import('@/lib/db-safe');
        return await prisma.student.findMany({ where: { parentId: session.user.id } });
      }, [DEMO_STUDENTS[0]]);
      return NextResponse.json({ students: children });
    }

    return NextResponse.json({ error: '无效角色' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ students: DEMO_STUDENTS });
  }
}
