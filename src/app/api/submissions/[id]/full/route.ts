/**
 * GET /api/submissions/:id/full - 获取完整数据（页面+批注+批改结果+PDF状态）
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { fileUrl } from '@/lib/storage/local';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '未授权' }, { status: 401 });
    const { id } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        sheet: true,
        homework: { include: { questions: true } },
        student: true,
        gradingResults: true,
        annotations: { orderBy: [{ page: 'asc' }, { createdAt: 'asc' }] },
        generatedPdfs: true,
      },
    });
    if (!submission) return NextResponse.json({ error: 'Submission不存在' }, { status: 404 });

    // 构造页面列表
    const pages = submission.sheet?.pageImagePaths.map((p, i) => ({
      pageIndex: i,
      imageUrl: fileUrl(p),
    })) || [];

    const questions = submission.homework.questions.map(q => ({
      id: q.id,
      type: q.type,
      content: q.content,
      options: q.options,
      correctAnswer: q.correctAnswer,
      score: q.score,
      knowledgePointName: q.knowledgePointName,
      order: q.order,
      page: q.page,
      bbox: q.bboxJson,
    }));

    const gradingResults = submission.gradingResults.map(r => ({
      id: r.id,
      questionId: r.questionId,
      score: r.score,
      maxScore: r.maxScore,
      isCorrect: r.isCorrect,
      comment: r.comment,
      errorType: r.errorType,
      correctAnswer: r.correctAnswer,
    }));

    const annotations = submission.annotations.map(a => ({
      id: a.id,
      questionId: a.questionId,
      page: a.page,
      kind: a.kind,
      xPct: a.xPct,
      yPct: a.yPct,
      wPct: a.wPct,
      hPct: a.hPct,
      text: a.text,
      strokePath: a.strokePath,
      color: a.color,
      fontSize: a.fontSize,
      strokeWidth: a.strokeWidth,
      source: a.source,
    }));

    const pdfs = submission.generatedPdfs.map(p => ({
      id: p.id,
      kind: p.kind,
      url: `/api/pdfs/${p.id}`,
      sizeBytes: p.sizeBytes,
      generatedAt: p.generatedAt,
    }));

    return NextResponse.json({
      submission: {
        id: submission.id,
        status: submission.status,
        totalScore: submission.totalScore,
        maxScore: submission.homework.totalScore,
        aiComment: submission.aiComment,
        annotationVersion: submission.annotationVersion,
        teacherApprovedAt: submission.teacherApprovedAt,
        student: submission.student ? { id: submission.student.id, name: submission.student.name, studentNo: submission.student.studentNo } : null,
        sheet: submission.sheet ? {
          id: submission.sheet.id,
          orderIndex: submission.sheet.orderIndex,
          detectedName: submission.sheet.detectedName,
          detectedStudentNo: submission.sheet.detectedStudentNo,
        } : null,
      },
      pages,
      questions,
      gradingResults,
      annotations,
      pdfs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
