/**
 * Annotate Job Handler: 根据批改结果用planner生成Annotation
 */
import prisma from '../../prisma';
import { planAnnotations } from '../../annotate/planner';
import { enqueueJob } from '../dispatcher';

export async function handleAnnotateJob(job: { refId: string }) {
  const submission = await prisma.submission.findUnique({
    where: { id: job.refId },
    include: {
      homework: { include: { questions: true } },
      gradingResults: true,
      sheet: true,
    },
  });
  if (!submission) throw new Error('Submission不存在');

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: 'annotated' },
  });

  // 构造planner输入
  const questions = submission.homework.questions.map(q => {
    let bbox: any = null;
    try { if (q.bboxJson) bbox = typeof q.bboxJson === 'string' ? JSON.parse(q.bboxJson) : q.bboxJson; } catch {}
    return {
      id: q.id,
      page: q.page ?? 0,
      bbox,
      studentAnswerBbox: bbox ? { x: bbox.x, y: bbox.y + bbox.h * 0.5, w: bbox.w, h: bbox.h * 0.4 } : undefined,
    };
  });

  const results = submission.gradingResults.map(r => ({
    questionId: r.questionId,
    score: r.score,
    maxScore: r.maxScore,
    isCorrect: r.isCorrect,
    comment: r.comment,
    errorType: r.errorType,
  }));

  // 找首页nameBox（简单假设在顶部左侧）
  const nameBox = { x: 0.05, y: 0.03, w: 0.35, h: 0.06 };

  // 生成批注
  const annotations = planAnnotations({
    questions,
    results,
    totalScore: submission.totalScore ?? 0,
    maxScore: submission.homework.totalScore,
    nameBox,
    pageCount: (submission.sheet?.pageImagePaths.length) ?? 2,
  });

  // 清除旧的AI批注，重新生成
  await prisma.annotation.deleteMany({
    where: { submissionId: submission.id, source: 'ai' },
  });

  // 写入新批注
  if (annotations.length > 0) {
    await prisma.annotation.createMany({
      data: annotations.map(a => ({
        submissionId: submission.id,
        questionId: a.questionId ?? undefined,
        page: a.page,
        kind: a.kind,
        xPct: a.xPct,
        yPct: a.yPct,
        wPct: a.wPct ?? null,
        hPct: a.hPct ?? null,
        text: a.text ?? null,
        strokePath: (a.strokePath as any) ?? undefined,
        color: a.color,
        fontSize: a.fontSize ?? null,
        strokeWidth: a.strokeWidth ?? null,
        source: 'ai',
      })),
    });
  }

  // 更新版本
  await prisma.submission.update({
    where: { id: submission.id },
    data: { annotationVersion: { increment: 1 } },
  });
  if (submission.sheet) {
    await prisma.paperSheet.update({
      where: { id: submission.sheet.id },
      data: { status: 'annotated' },
    });
  }

  // 入队PDF渲染
  await enqueueJob('render', 'submission', submission.id);
}
