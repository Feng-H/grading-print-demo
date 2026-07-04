import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withDbFallback, DEMO_CLASSES } from '@/lib/db-safe';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const classes = await withDbFallback(async () => {
      const { prisma } = await import('@/lib/db-safe');
      const list = await prisma.class.findMany({
        where: { teacherId: session.user.id },
        orderBy: { createdAt: 'asc' },
      });
      return list.map(c => ({
        id: c.id, name: c.name, grade: c.grade, subject: c.subject, studentCount: c.studentCount,
      }));
    }, DEMO_CLASSES);

    return NextResponse.json({ classes });
  } catch (e: any) {
    return NextResponse.json({ classes: DEMO_CLASSES });
  }
}
