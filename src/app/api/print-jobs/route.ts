/**
 * GET /api/print-jobs - 打印队列列表
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const stress = searchParams.get('stress');

    const where: any = {};
    if (stress === '1') where.isStressTest = true;
    else if (stress === '0') where.isStressTest = false;

    const jobs = await prisma.printJob.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      take: 50,
      include: {
        submission: { select: { id: true, totalScore: true, sheet: { select: { orderIndex: true, detectedName: true } } } },
        requestedBy: { select: { name: true } },
      },
    });
    return NextResponse.json({ jobs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
