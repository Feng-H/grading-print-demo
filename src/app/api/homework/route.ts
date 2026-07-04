import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { withDbFallback } from '@/lib/db-safe';
import { homeworkList as mockHomeworkList } from '@/lib/mock-data';

const MOCK_HOMEWORKS = mockHomeworkList.map(h => ({
  id: h.id, title: h.title, description: h.description, subject: h.subject,
  totalScore: h.totalScore, status: h.status, deadline: h.deadline ? new Date(h.deadline) : null,
  createdAt: new Date(h.createTime), isDemo: true,
  classId: h.classId, className: h.className,
  questionCount: h.questions.length,
  submissionCount: h.submissionCount, totalStudents: h.totalStudents, averageScore: null as number | null,
}));

const MOCK_PARENT = {
  children: [{ id: 's1', name: '张小明', className: '三年级2班', avatar: '👦', studentNo: '001' }],
  homeworks: [
    { submissionId: 's1', homeworkId: 'hw1', title: '第三单元测试卷', subject: '数学', totalScore: 75, studentScore: 51, submitTime: new Date('2026-07-02'), studentName: '张小明', studentId: 's1', aiComment: '本次作业基础掌握不错，重量单位需要加强。', isDemo: true },
    { submissionId: 's2', homeworkId: 'hw2', title: '第二单元课后练习', subject: '数学', totalScore: 55, studentScore: 43, submitTime: new Date('2026-06-27'), studentName: '张小明', studentId: 's1', aiComment: null, isDemo: true },
    { submissionId: 's3', homeworkId: 'hw3', title: '第一单元小测', subject: '数学', totalScore: 30, studentScore: 30, submitTime: new Date('2026-06-20'), studentName: '张小明', studentId: 's1', aiComment: null, isDemo: true },
  ],
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });

    if (session.user.role === 'teacher') {
      const list = await withDbFallback(async () => {
        const { prisma } = await import('@/lib/db-safe');
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get('classId') || undefined;
        const homeworks = await prisma.homework.findMany({
          where: { teacherId: session.user.id, ...(classId ? { classId } : {}) },
          orderBy: { createdAt: 'desc' },
          include: { class: true, _count: { select: { submissions: true, questions: true } } },
        });
        return await Promise.all(homeworks.map(async hw => {
          const gradedSubs = await prisma.submission.findMany({
            where: { homeworkId: hw.id, status: 'graded' }, select: { totalScore: true },
          });
          const avg = gradedSubs.length > 0
            ? Math.round((gradedSubs.reduce((s, x) => s + (x.totalScore || 0), 0) / gradedSubs.length) * 10) / 10
            : null;
          return {
            id: hw.id, title: hw.title, description: hw.description, subject: hw.subject,
            totalScore: hw.totalScore, status: hw.status, deadline: hw.deadline,
            createdAt: hw.createdAt, isDemo: hw.isDemo, classId: hw.classId, className: hw.class.name,
            questionCount: hw._count.questions, submissionCount: gradedSubs.length,
            totalStudents: hw.class.studentCount, averageScore: avg,
          };
        }));
      }, MOCK_HOMEWORKS);
      return NextResponse.json({ homeworks: list });
    }

    if (session.user.role === 'parent') {
      const data = await withDbFallback(async () => {
        const { prisma } = await import('@/lib/db-safe');
        const children = await prisma.student.findMany({
          where: { parentId: session.user.id },
          select: { id: true, name: true, className: true, avatar: true, studentNo: true },
        });
        const childIds = children.map(c => c.id);
        const subs = await prisma.submission.findMany({
          where: { studentId: { in: childIds }, status: 'graded' },
          orderBy: { submitTime: 'desc' },
          include: { homework: { include: { class: true } }, student: true, gradingResults: true },
        });
        return {
          children,
          homeworks: subs.map(s => ({
            submissionId: s.id, homeworkId: s.homeworkId, title: s.homework.title,
            subject: s.homework.subject, totalScore: s.homework.totalScore,
            studentScore: s.totalScore, submitTime: s.submitTime, studentName: s.student.name,
            studentId: s.studentId, aiComment: s.aiComment, isDemo: s.homework.isDemo,
          })),
        };
      }, MOCK_PARENT);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: '无效角色' }, { status: 400 });
  } catch (e: any) {
    console.error('[homework GET]', e);
    // 失败默认返回老师的mock
    return NextResponse.json({ homeworks: MOCK_HOMEWORKS });
  }
}
