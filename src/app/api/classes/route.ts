import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const classes = await prisma.class.findMany({
      where: { teacherId: session.user.id },
      include: { _count: { select: { students: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({
      classes: classes.map(c => ({
        id: c.id,
        name: c.name,
        grade: c.grade,
        subject: c.subject,
        studentCount: c.studentCount,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
