/**
 * Grade Job Handler: AI批改单个Submission
 */
import prisma from '../../prisma';
import { gradeQuestions, GradeQuestionInput } from '../../ai/grade';
import { enqueueJob } from '../dispatcher';

export async function handleGradeJob(job: { refId: string }) {
  const submission = await prisma.submission.findUnique({
    where: { id: job.refId },
    include: {
      homework: { include: { questions: true } },
      answers: true,
      sheet: true,
    },
  });
  if (!submission) throw new Error('Submission不存在');

  await prisma.submission.update({
    where: { id: submission.id },
    data: { status: 'grading' },
  });
  if (submission.sheet) {
    await prisma.paperSheet.update({
      where: { id: submission.sheet.id },
      data: { status: 'grading' },
    });
  }

  // 构造gradeQuestions输入
  const qInputs: GradeQuestionInput[] = submission.homework.questions.map(q => {
    const answer = submission.answers.find(a => a.questionId === q.id);
    return {
      type: q.type,
      content: q.content,
      options: q.options.length > 0 ? q.options : undefined,
      correctAnswer: q.correctAnswer,
      score: q.score,
      knowledgePointName: q.knowledgePointName,
      studentAnswer: answer?.answer || '',
    };
  });

  const { results } = await gradeQuestions(qInputs);

  // 写入GradingResult
  let totalScore = 0;
  for (let i = 0; i < submission.homework.questions.length; i++) {
    const q = submission.homework.questions[i];
    const r = results[i];
    totalScore += r.score;
    await prisma.gradingResult.upsert({
      where: {
        questionId_submissionId: { questionId: q.id, submissionId: submission.id },
      },
      create: {
        questionId: q.id,
        submissionId: submission.id,
        score: r.score,
        maxScore: r.maxScore,
        isCorrect: r.isCorrect,
        comment: r.comment,
        errorType: r.errorType,
        correctAnswer: r.correctAnswer,
      },
      update: {
        score: r.score,
        isCorrect: r.isCorrect,
        comment: r.comment,
        errorType: r.errorType,
      },
    });
  }

  // 更新submission
  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      totalScore,
      status: 'annotated',
      aiComment: `本次得分${totalScore}/${submission.homework.totalScore}分`,
    },
  });

  // 入队批注生成
  await enqueueJob('annotate', 'submission', submission.id);
}
