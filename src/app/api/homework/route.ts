import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const role = session.user.role;

    if (role === 'teacher') {
      const classId = searchParams.get('classId') || undefined;
      const homeworks = await prisma.homework.findMany({
        where: {
          teacherId: session.user.id,
          ...(classId ? { classId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        include: {
          class: true,
          _count: { select: { submissions: true, questions: true } },
        },
      });

      // 取每个作业的已批改数、平均分
      const list = await Promise.all(
        homeworks.map(async (hw) => {
          const gradedSubs = await prisma.submission.findMany({
            where: { homeworkId: hw.id, status: 'graded' },
            select: { totalScore: true },
          });
          const avg =
            gradedSubs.length > 0
              ? Math.round(
                  (gradedSubs.reduce((s, x) => s + (x.totalScore || 0), 0) /
                    gradedSubs.length) *
                    10
                ) / 10
              : null;
          return {
            id: hw.id,
            title: hw.title,
            description: hw.description,
            subject: hw.subject,
            totalScore: hw.totalScore,
            status: hw.status,
            deadline: hw.deadline,
            createdAt: hw.createdAt,
            isDemo: hw.isDemo,
            classId: hw.classId,
            className: hw.class.name,
            questionCount: hw._count.questions,
            submissionCount: gradedSubs.length,
            totalStudents: hw.class.studentCount,
            averageScore: avg,
          };
        })
      );
      return NextResponse.json({ homeworks: list });
    }

    if (role === 'parent') {
      // 家长：查自己孩子的作业（通过studentId）
      const children = await prisma.student.findMany({
        where: { parentId: session.user.id },
        select: { id: true, name: true, classId: true, className: true },
      });
      const childIds = children.map(c => c.id);

      const submissions = await prisma.submission.findMany({
        where: { studentId: { in: childIds }, status: 'graded' },
        orderBy: { submitTime: 'desc' },
        include: {
          homework: { include: { class: true } },
          student: true,
          gradingResults: true,
        },
      });

      return NextResponse.json({
        children,
        homeworks: submissions.map(s => ({
          submissionId: s.id,
          homeworkId: s.homeworkId,
          title: s.homework.title,
          subject: s.homework.subject,
          totalScore: s.homework.totalScore,
          studentScore: s.totalScore,
          submitTime: s.submitTime,
          studentName: s.student.name,
          studentId: s.studentId,
          className: s.homework.class.name,
          aiComment: s.aiComment,
          isDemo: s.homework.isDemo,
        })),
      });
    }

    return NextResponse.json({ error: '无效角色' }, { status: 400 });
  } catch (e: any) {
    console.error('[homework GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
