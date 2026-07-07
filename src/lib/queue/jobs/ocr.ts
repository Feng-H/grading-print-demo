/**
 * OCR Job Handler: 识别单个Sheet的页面
 */
import prisma from '../../prisma';
import { loadBuffer } from '../../storage/local';
import { parsePaperPages, OcrResult } from '../../ocr/parsePaper';
import { enqueueJob } from '../dispatcher';

export async function handleOcrJob(job: { refId: string }) {
  const sheet = await prisma.paperSheet.findUnique({
    where: { id: job.refId },
    include: { batch: true },
  });
  if (!sheet) throw new Error('Sheet不存在');

  await prisma.paperSheet.update({
    where: { id: sheet.id },
    data: { status: 'ocr' },
  });

  // 读取所有页图片为dataURL
  const dataUrls: string[] = [];
  for (const p of sheet.pageImagePaths) {
    const buf = await loadBuffer(p);
    dataUrls.push(`data:image/jpeg;base64,${buf.toString('base64')}`);
  }

  let ocrResult: OcrResult;
  try {
    ocrResult = await parsePaperPages(dataUrls);
  } catch (err: any) {
    // OCR失败也继续，创建空的submission让老师手动处理
    console.warn(`[ocr] sheet ${sheet.id} OCR失败:`, err.message);
    ocrResult = {
      title: '未识别作业', subject: '数学', pages: dataUrls.map((_, i) => ({
        pageIndex: i, hasHeader: i === 0, questions: [],
      })), questions: [], avgConfidence: 0, warnings: [err.message],
    };
  }

  // 用识别结果更新sheet
  const firstName = ocrResult.pages.find(p => p.detectedName)?.detectedName;
  const firstNo = ocrResult.pages.find(p => p.detectedStudentNo)?.detectedStudentNo;

  await prisma.paperSheet.update({
    where: { id: sheet.id },
    data: {
      detectedName: firstName,
      detectedStudentNo: firstNo,
      nameConfidence: firstName ? 0.7 : 0.2,
      status: 'grading',
    },
  });

  // 如果batch没关联classId，取该老师的第一个班级兜底
  let classId: string | null = sheet.batch.classId;
  if (!classId) {
    const fallbackClass = await prisma.class.findFirst({
      where: { teacherId: sheet.batch.teacherId },
      orderBy: { createdAt: 'asc' },
    });
    classId = fallbackClass?.id ?? null;
  }

  // 查找匹配的学生（按姓名/学号模糊匹配班级学生）
  let matchedStudentId: string | undefined;
  if (firstName && classId) {
    const student = await prisma.student.findFirst({
      where: {
        classId,
        name: { contains: firstName, mode: 'insensitive' },
      },
    });
    matchedStudentId = student?.id;
  }
  // 兜底：如果没匹配到，取班级第一个学生
  if (!matchedStudentId && classId) {
    const fallbackStudent = await prisma.student.findFirst({
      where: { classId },
      orderBy: { studentNo: 'asc' },
    });
    matchedStudentId = fallbackStudent?.id;
  }

  // 创建Submission和Questions
  // 查找或创建Homework（先重新查最新batch，避免并发时读缓存旧值）
  const latestBatch = await prisma.paperBatch.findUnique({
    where: { id: sheet.batchId },
    select: { homeworkId: true, classId: true },
  });
  // 更新classId使用最新值
  if (latestBatch?.classId) classId = latestBatch.classId;
  let homeworkId = latestBatch?.homeworkId;
  if (!homeworkId) {
    if (!classId) {
      // 没有可用班级，跳过创建Homework（这种情况不应发生，seed确保有班级）
      throw new Error('未找到可用班级，请先创建班级和学生');
    }
    const hw = await prisma.homework.create({
      data: {
        title: ocrResult.title || '扫描作业',
        subject: ocrResult.subject || '数学',
        totalScore: 0,
        status: 'grading',
        pagesPerStudent: sheet.pageRangeEnd - sheet.pageRangeStart,
        classId,
        teacherId: sheet.batch.teacherId,
      },
    });
    homeworkId = hw.id;
    await prisma.paperBatch.update({ where: { id: sheet.batchId }, data: { homeworkId, classId } });
  }

  // 创建Question记录
  const questionCreateData = [];
  let totalMaxScore = 0;
  let qOrder = 0;
  for (const page of ocrResult.pages) {
    for (const q of page.questions) {
      const defaultScore = inferDefaultScore(q.type);
      totalMaxScore += defaultScore;
      const defaultCorrect = q.suggestedCorrectAnswer || '';
      questionCreateData.push({
        type: q.type,
        content: q.content,
        options: q.options || [],
        correctAnswer: defaultCorrect,
        score: defaultScore,
        knowledgePointId: `kp-${q.type}`,
        knowledgePointName: typeToName(q.type),
        difficulty: 2,
        order: qOrder++,
        page: page.pageIndex,
        bboxJson: q.bbox as any,
      });
    }
  }

  // createManyAndReturn 在 Prisma 5.22 可能不可用，改用 createMany + 查询
  await prisma.question.createMany({
    data: questionCreateData.map(q => ({ ...q, homeworkId })),
  });
  const questions = await prisma.question.findMany({
    where: { homeworkId },
    orderBy: { order: 'asc' },
    skip: qOrder - questionCreateData.length,
    take: questionCreateData.length,
  });

  if (!matchedStudentId) {
    throw new Error('未找到可用学生，无法创建Submission');
  }

  // 创建Submission
  const submission = await prisma.submission.create({
    data: {
      sheetId: sheet.id,
      homeworkId: homeworkId,
      studentId: matchedStudentId,
      teacherId: sheet.batch.teacherId,
      status: 'grading',
      ocrConfidence: ocrResult.avgConfidence,
      totalScore: 0,
    },
  });

  // 更新sheet关联（通过relation connect）
  await prisma.paperSheet.update({
    where: { id: sheet.id },
    data: {
      studentId: matchedStudentId,
      submission: { connect: { id: submission.id } },
    },
  });

  // 更新Homework totalScore
  if (totalMaxScore > 0) {
    await prisma.homework.update({ where: { id: homeworkId }, data: { totalScore: totalMaxScore } });
  }

  // 创建StudentAnswer记录
  const answerData = [];
  for (let i = 0; i < questions.length; i++) {
    const page = ocrResult.pages.find(p => p.pageIndex === (questions[i].page ?? 0));
    const q = ocrResult.questions[i];
    answerData.push({
      questionId: questions[i].id,
      submissionId: submission.id,
      answer: q?.studentAnswer || '',
    });
  }
  if (answerData.length > 0) {
    await prisma.studentAnswer.createMany({ data: answerData });
  }

  // 入队批改
  await enqueueJob('grade', 'submission', submission.id);
}

function inferDefaultScore(type: string): number {
  switch (type) {
    case 'choice': return 3;
    case 'judge': return 2;
    case 'fill': return 3;
    case 'math': return 5;
    case 'short_answer': return 5;
    case 'essay': return 10;
    default: return 3;
  }
}

function typeToName(type: string): string {
  const map: Record<string, string> = {
    choice: '选择题', judge: '判断题', fill: '填空题',
    math: '数学计算', short_answer: '简答题', essay: '作文',
  };
  return map[type] || '综合';
}
