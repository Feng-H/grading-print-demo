import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// SiliconFlow API兼容OpenAI格式
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

interface GradeQuestionRequest {
  question: {
    id: string;
    type: string;
    content: string;
    options?: string[];
    correctAnswer: string;
    score: number;
    knowledgePointName: string;
    studentAnswer?: string;
    // VL预判断
    vlSuggestedAnswer?: string;
    vlAutoGrade?: boolean;
  };
  studentAnswer: string;
}

function buildPrompt(question: GradeQuestionRequest['question'], answer: string) {
  const typeLabels: Record<string, string> = {
    choice: '选择题',
    judge: '判断题',
    fill: '填空题',
    math: '数学解答题',
    short_answer: '简答题',
    essay: '作文题',
  };

  let optionsText = '';
  if (question.options && question.options.length > 0) {
    optionsText = `\n选项：${question.options.join('，')}`;
  }

  const isObjective = ['choice', 'judge', 'fill'].includes(question.type);

  return `你是一位经验丰富、认真负责的小学数学老师，请批改下面这道学生作业题。

题目类型：${typeLabels[question.type] || '题目'}
知识点：${question.knowledgePointName}
满分：${question.score}分

题目内容：
${question.content}${optionsText}

标准答案：${question.correctAnswer}

学生答案：${answer || '（未作答）'}

批改要求：
1. ${isObjective ? '客观题答案唯一，请严格对比标准答案判分，答案一致给满分，不一致给0分' : '主观题/数学题请按要点给分，答案合理即可酌情给分'}
2. 数学题不仅要看最终答案，还要看解题思路是否正确，有步骤分
3. 评语要具体、鼓励性，指出问题所在，告诉学生为什么错了、怎么改进
4. 如果答错了，请判断错误类型：
   - concept：概念理解错误
   - calculation：计算错误
   - careless：粗心大意
   - expression：表达不规范
5. 只返回JSON格式，不要任何其他文字

请按以下JSON格式返回批改结果：
{
  "score": 得分数字(0到${question.score}之间),
  "isCorrect": true或false,
  "comment": "具体的评语，要详细鼓励学生",
  "errorType": "错误类型(正确则为null)",
  "correctAnswer": "标准答案"
}`;
}

// 答案规范化比较（客观题简单匹配）
function normalizeAnswer(s: string): string {
  if (!s) return '';
  return s
    .trim()
    .replace(/[。．.!！\s]/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .toLowerCase();
}

function gradeObjective(
  studentAns: string,
  correctAns: string,
  maxScore: number,
  type: string,
): { score: number; isCorrect: boolean; comment: string; errorType: string | null } {
  const sNorm = normalizeAnswer(studentAns);
  let cNorm = normalizeAnswer(correctAns);

  // 判断题的各种等价表达
  const judgeTrue = ['正确', '对', '√', 'true', 'yes', '是', 't', 'y'];
  const judgeFalse = ['错误', '错', '×', 'x', 'false', 'no', '否', 'f', 'n'];

  if (type === 'judge') {
    const sTrue = judgeTrue.some(k => sNorm.includes(k));
    const sFalse = judgeFalse.some(k => sNorm.includes(k));
    const cTrue = judgeTrue.some(k => cNorm.includes(k));
    const cFalse = judgeFalse.some(k => cNorm.includes(k));
    const match = (sTrue && cTrue) || (sFalse && cFalse);
    if (match) {
      return { score: maxScore, isCorrect: true, comment: '判断正确！', errorType: null };
    } else {
      return { score: 0, isCorrect: false, comment: `判断错误。正确答案是"${correctAns}"。`, errorType: 'concept' };
    }
  }

  // 选择题：取第一个字母/数字作为答案
  if (type === 'choice') {
    const sLetter = (sNorm.match(/^[a-d①-④1-4]/)?.[0] || '').toUpperCase()
      .replace('①', 'A').replace('②', 'B').replace('③', 'C').replace('④', 'D')
      .replace('1', 'A').replace('2', 'B').replace('3', 'C').replace('4', 'D');
    const cLetter = (cNorm.match(/^[a-d]/)?.[0] || '').toUpperCase();
    if (sLetter && cLetter && sLetter === cLetter) {
      return { score: maxScore, isCorrect: true, comment: '选择正确！', errorType: null };
    } else if (sNorm === cNorm) {
      return { score: maxScore, isCorrect: true, comment: '回答正确！', errorType: null };
    } else {
      return { score: 0, isCorrect: false, comment: `回答错误，正确答案是 ${correctAns}。`, errorType: 'concept' };
    }
  }

  // 填空题：宽松匹配，包含即算对（学生可能多加单位）
  if (sNorm === cNorm || (cNorm.length > 0 && sNorm.includes(cNorm))) {
    return { score: maxScore, isCorrect: true, comment: '填写正确！', errorType: null };
  }
  // 数字类比较
  const sNum = sNorm.match(/-?\d+(\.\d+)?/)?.[0];
  const cNum = cNorm.match(/-?\d+(\.\d+)?/)?.[0];
  if (sNum && cNum && Number(sNum) === Number(cNum)) {
    return { score: maxScore, isCorrect: true, comment: '答案正确！', errorType: null };
  }
  return { score: 0, isCorrect: false, comment: `答案错误，正确答案是 ${correctAns}。`, errorType: 'careless' };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;
    const model = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen3.6-35B-A3B';

    const body = await req.json();
    const { questions, answers, persist, paperInfo } = body as {
      questions: GradeQuestionRequest['question'][];
      answers: Record<string, string>;
      persist?: boolean;
      paperInfo?: {
        homeworkTitle: string;
        homeworkDescription?: string;
        subject?: string;
        classId: string;
        deadline?: string;
        studentId: string;
        studentName: string;
        sourceImages?: string[];
      };
    };

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    const results: any[] = [];
    let useMock = false;

    for (const question of questions) {
      const answer = answers[question.id] || question.studentAnswer || '';

      // 客观题如果VL或前端已给出标准答案，直接本地判分（省token）
      const finalCorrect = question.correctAnswer || question.vlSuggestedAnswer;
      const isObjective = ['choice', 'judge', 'fill'].includes(question.type);
      if (isObjective && finalCorrect && finalCorrect.trim()) {
        const r = gradeObjective(answer, finalCorrect, question.score, question.type);
        results.push({
          questionId: question.id,
          score: r.score,
          maxScore: question.score,
          isCorrect: r.isCorrect,
          comment: r.comment,
          errorType: r.errorType,
          correctAnswer: finalCorrect,
          knowledgePointName: question.knowledgePointName,
        });
        continue;
      }

      // 主观题 / 没有标准答案的客观题 → 调用AI
      if (!apiKey || apiKey.trim() === '') {
        useMock = true;
        results.push({
          questionId: question.id,
          score: Math.round(question.score * 0.7),
          maxScore: question.score,
          isCorrect: true,
          comment: '【Demo数据，未配置API Key】批改完成。',
          errorType: null,
          correctAnswer: question.correctAnswer || '',
          knowledgePointName: question.knowledgePointName,
        });
        continue;
      }

      const prompt = buildPrompt({ ...question, correctAnswer: finalCorrect || question.correctAnswer }, answer);
      try {
        const response = await fetch(SILICONFLOW_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: '你是一位专业的小学数学老师，擅长批改作业，给出准确的分数和鼓励性评语。请严格按照要求返回JSON格式结果。',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('SiliconFlow API error:', response.status, errorText.slice(0, 300));
          throw new Error(`API调用失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new Error('API返回结果为空');

        let parsed;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (e) {
          console.error('JSON parse error:', content.slice(0, 300));
          throw new Error('批改结果解析失败');
        }

        results.push({
          questionId: question.id,
          score: Math.max(0, Math.min(question.score, Math.round(parsed.score || 0))),
          maxScore: question.score,
          isCorrect: Boolean(parsed.isCorrect) ?? (parsed.score || 0) >= question.score * 0.9,
          comment: parsed.comment || '批改完成',
          errorType: parsed.errorType || null,
          correctAnswer: question.correctAnswer || parsed.correctAnswer || '',
          knowledgePointName: question.knowledgePointName,
        });
      } catch (err) {
        console.error('批改题目失败', question.id, err);
        results.push({
          questionId: question.id,
          score: 0,
          maxScore: question.score,
          isCorrect: false,
          comment: '本题批改遇到问题，请老师手动批阅。',
          errorType: null,
          correctAnswer: question.correctAnswer || '',
          knowledgePointName: question.knowledgePointName,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 持久化到数据库
    let submissionId: string | null = null;
    if (persist && paperInfo) {
      try {
        const totalScore = results.reduce((s, r) => s + r.score, 0);
        const totalMax = results.reduce((s, r) => s + r.maxScore, 0);

        // 生成默认知识点名
        const kpNameMap: Record<string, string> = {
          choice: '选择题',
          judge: '判断题',
          fill: '填空题',
          math: '数学计算',
          short_answer: '简答题',
          essay: '作文',
        };

        const homework = await prisma.homework.create({
          data: {
            title: paperInfo.homeworkTitle || '作业',
            description: paperInfo.homeworkDescription || '',
            subject: paperInfo.subject || '数学',
            totalScore: totalMax,
            status: 'graded',
            deadline: paperInfo.deadline ? new Date(paperInfo.deadline) : null,
            sourceImageUrls: paperInfo.sourceImages || [],
            classId: paperInfo.classId,
            teacherId: session.user.id,
            questions: {
              create: questions.map((q, i) => ({
                type: q.type,
                content: q.content,
                options: q.options || [],
                correctAnswer: q.correctAnswer || q.vlSuggestedAnswer || '',
                score: q.score,
                knowledgePointId: `kp-${q.type}-${i}`,
                knowledgePointName: q.knowledgePointName || kpNameMap[q.type] || '综合',
                difficulty: 2,
                order: i + 1,
              })),
            },
          },
          include: { questions: true },
        });

        const submission = await prisma.submission.create({
          data: {
            homeworkId: homework.id,
            studentId: paperInfo.studentId,
            teacherId: session.user.id,
            status: 'graded',
            totalScore,
            aiComment: `${paperInfo.studentName}同学本次作业得分${totalScore}/${totalMax}分。`,
            submitTime: new Date(),
            answers: {
              create: homework.questions.map((dbQ, i) => ({
                questionId: dbQ.id,
                answer: answers[questions[i].id] || questions[i].studentAnswer || '',
              })),
            },
          },
          include: { answers: true },
        });

        await prisma.gradingResult.createMany({
          data: homework.questions.map((dbQ, i) => {
            const r = results[i];
            return {
              questionId: dbQ.id,
              submissionId: submission.id,
              score: r.score,
              maxScore: r.maxScore,
              isCorrect: r.isCorrect,
              comment: r.comment,
              errorType: r.errorType,
              correctAnswer: r.correctAnswer,
            };
          }),
        });

        // 更新班级作业数（简单自增，不严格）
        submissionId = submission.id;
      } catch (err) {
        console.error('[grade] 持久化失败:', err);
        // 持久化失败不影响批改结果返回
      }
    }

    return NextResponse.json({
      results,
      submissionId,
      warning: useMock ? '未配置SILICONFLOW_API_KEY，主观题使用演示数据批改。' : undefined,
    });
  } catch (error: any) {
    console.error('Grade API error:', error);
    return NextResponse.json(
      { error: '批改失败：' + (error.message || '未知错误') },
      { status: 500 }
    );
  }
}
