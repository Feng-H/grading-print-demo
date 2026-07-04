import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const { classId } = await params;

    const klass = await prisma.class.findUnique({
      where: { id: classId },
      include: { _count: { select: { students: true } } },
    });
    if (!klass) return NextResponse.json({ error: '班级不存在' }, { status: 404 });

    // 取已发布/已批改的作业
    const homeworks = await prisma.homework.findMany({
      where: { classId, status: { in: ['graded', 'published'] } },
      include: {
        submissions: { where: { status: 'graded' }, include: { gradingResults: true, answers: true } },
        questions: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 计算统计
    const allScores: number[] = [];
    const kpStats: Record<string, { total: number; correct: number; name: string; wrongSamples: any[] }> = {};
    const commonMistakes: any[] = [];

    for (const hw of homeworks) {
      for (const sub of hw.submissions) {
        if (sub.totalScore != null) allScores.push(sub.totalScore);
      }

      // 知识点统计（按题）
      for (const q of hw.questions) {
        const kpId = q.knowledgePointId || q.id;
        if (!kpStats[kpId]) {
          kpStats[kpId] = { total: 0, correct: 0, name: q.knowledgePointName || '综合', wrongSamples: [] };
        }
        let qCorrect = 0;
        let qTotal = 0;
        for (const sub of hw.submissions) {
          const gr = sub.gradingResults.find(g => g.questionId === q.id);
          if (!gr) continue;
          qTotal++;
          if (gr.isCorrect) qCorrect++;
          else if (kpStats[kpId].wrongSamples.length < 3) {
            const ans = sub.answers.find(a => a.questionId === q.id);
            kpStats[kpId].wrongSamples.push({
              studentName: (await prisma.student.findUnique({ where: { id: sub.studentId }, select: { name: true } }))?.name,
              answer: ans?.answer || '',
              comment: gr.comment,
            });
          }
        }
        kpStats[kpId].total += qTotal;
        kpStats[kpId].correct += qCorrect;
        if (qTotal > 0 && qCorrect / qTotal < 0.7) {
          commonMistakes.push({
            questionId: q.id,
            questionContent: q.content.slice(0, 80),
            wrongCount: qTotal - qCorrect,
            errorRate: Math.round((1 - qCorrect / qTotal) * 100),
          });
        }
      }
    }

    // 分数段分布
    const distribution = [
      { score: '90-100', count: 0 },
      { score: '80-89', count: 0 },
      { score: '70-79', count: 0 },
      { score: '60-69', count: 0 },
      { score: '60以下', count: 0 },
    ];
    let totalMax = 100;
    // 取最近一份作业的总分作为参考
    if (homeworks.length > 0) totalMax = homeworks[0].totalScore || 100;
    for (const s of allScores) {
      const pct = (s / totalMax) * 100;
      if (pct >= 90) distribution[0].count++;
      else if (pct >= 80) distribution[1].count++;
      else if (pct >= 70) distribution[2].count++;
      else if (pct >= 60) distribution[3].count++;
      else distribution[4].count++;
    }

    const knowledgePointMastery = Object.entries(kpStats).map(([id, s]) => ({
      id,
      name: s.name,
      correctRate: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      totalQuestions: s.total,
      wrongCount: s.total - s.correct,
    }));

    commonMistakes.sort((a, b) => b.wrongCount - a.wrongCount);

    const avgScore = allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : 0;

    const suggestions: string[] = [];
    const weakKps = knowledgePointMastery.filter(k => k.correctRate < 70).sort((a, b) => a.correctRate - b.correctRate);
    if (weakKps.length > 0) {
      suggestions.push(`${weakKps.map(k => k.name).join('、')}是班级共性薄弱点，建议下节课重点讲解并增加针对性练习。`);
    }
    if (distribution[4].count > 0) {
      suggestions.push(`有${distribution[4].count}名学生不及格，建议进行一对一知识点补漏。`);
    }
    if (avgScore >= 85) {
      suggestions.push('班级整体掌握情况良好，可以适当增加拓展题满足学有余力的学生需求。');
    }
    if (suggestions.length === 0) {
      suggestions.push('班级作业情况正常，继续保持当前教学节奏。');
    }

    return NextResponse.json({
      className: klass.name,
      studentCount: klass._count.students,
      homeworkCount: homeworks.length,
      averageScore: avgScore,
      maxScore: Math.max(...allScores, 0),
      minScore: Math.min(...allScores, 0),
      scoreDistribution: distribution,
      knowledgePointMastery,
      commonMistakes: commonMistakes.slice(0, 5),
      teachingSuggestions: suggestions,
    });
  } catch (e: any) {
    console.error('[analytics]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
