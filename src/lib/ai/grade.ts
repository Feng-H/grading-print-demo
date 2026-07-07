/**
 * AI批改逻辑 - 从API路由抽取，支持批改进度复用
 */

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

export interface GradeQuestionInput {
  type: string;
  content: string;
  options?: string[];
  correctAnswer: string;
  score: number;
  knowledgePointName?: string;
  studentAnswer: string;
}

export interface GradeResult {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  comment: string;
  errorType: string | null;
  correctAnswer: string;
}

function buildPrompt(question: GradeQuestionInput): string {
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

  return `你是一位经验丰富、认真负责的小学老师，请批改下面这道学生作业题。

题目类型：${typeLabels[question.type] || '题目'}
知识点：${question.knowledgePointName || '综合'}
满分：${question.score}分

题目内容：
${question.content}${optionsText}

标准答案：${question.correctAnswer}

学生答案：${question.studentAnswer || '（未作答）'}

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

function normalizeAnswer(s: string): string {
  if (!s) return '';
  return s
    .trim()
    .replace(/[。．.!！\s]/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .toLowerCase();
}

export function gradeObjective(
  studentAns: string,
  correctAns: string,
  maxScore: number,
  type: string,
): GradeResult {
  const sNorm = normalizeAnswer(studentAns);
  let cNorm = normalizeAnswer(correctAns);

  const judgeTrue = ['正确', '对', '√', 'true', 'yes', '是', 't', 'y'];
  const judgeFalse = ['错误', '错', '×', 'x', 'false', 'no', '否', 'f', 'n'];

  if (type === 'judge') {
    const sTrue = judgeTrue.some(k => sNorm.includes(k));
    const sFalse = judgeFalse.some(k => sNorm.includes(k));
    const cTrue = judgeTrue.some(k => cNorm.includes(k));
    const cFalse = judgeFalse.some(k => cNorm.includes(k));
    const match = (sTrue && cTrue) || (sFalse && cFalse);
    if (match) {
      return { score: maxScore, maxScore, isCorrect: true, comment: '判断正确！', errorType: null, correctAnswer: correctAns };
    } else {
      return { score: 0, maxScore, isCorrect: false, comment: `判断错误。正确答案是"${correctAns}"。`, errorType: 'concept', correctAnswer: correctAns };
    }
  }

  if (type === 'choice') {
    const sLetter = (sNorm.match(/^[a-d①-④1-4]/)?.[0] || '').toUpperCase()
      .replace('①', 'A').replace('②', 'B').replace('③', 'C').replace('④', 'D')
      .replace('1', 'A').replace('2', 'B').replace('3', 'C').replace('4', 'D');
    const cLetter = (cNorm.match(/^[a-d]/)?.[0] || '').toUpperCase();
    if (sLetter && cLetter && sLetter === cLetter) {
      return { score: maxScore, maxScore, isCorrect: true, comment: '选择正确！', errorType: null, correctAnswer: correctAns };
    } else if (sNorm === cNorm) {
      return { score: maxScore, maxScore, isCorrect: true, comment: '回答正确！', errorType: null, correctAnswer: correctAns };
    } else {
      return { score: 0, maxScore, isCorrect: false, comment: `回答错误，正确答案是 ${correctAns}。`, errorType: 'concept', correctAnswer: correctAns };
    }
  }

  // 填空题：宽松匹配
  if (sNorm === cNorm || (cNorm.length > 0 && sNorm.includes(cNorm))) {
    return { score: maxScore, maxScore, isCorrect: true, comment: '填写正确！', errorType: null, correctAnswer: correctAns };
  }
  const sNum = sNorm.match(/-?\d+(\.\d+)?/)?.[0];
  const cNum = cNorm.match(/-?\d+(\.\d+)?/)?.[0];
  if (sNum && cNum && Number(sNum) === Number(cNum)) {
    return { score: maxScore, maxScore, isCorrect: true, comment: '答案正确！', errorType: null, correctAnswer: correctAns };
  }
  return { score: 0, maxScore, isCorrect: false, comment: `答案错误，正确答案是 ${correctAns}。`, errorType: 'careless', correctAnswer: correctAns };
}

/**
 * 调用AI批改单题
 */
async function gradeOneWithAI(question: GradeQuestionInput, apiKey: string, model: string): Promise<GradeResult> {
  const prompt = buildPrompt(question);
  const response = await fetch(SILICONFLOW_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: '你是一位专业的小学老师，擅长批改作业，给出准确的分数和鼓励性评语。请严格按照要求返回JSON格式结果。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API调用失败: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API返回结果为空');

  let parsed;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  } catch {
    throw new Error('批改结果解析失败');
  }

  return {
    score: Math.max(0, Math.min(question.score, Math.round(parsed.score || 0))),
    maxScore: question.score,
    isCorrect: parsed.isCorrect != null ? Boolean(parsed.isCorrect) : (parsed.score || 0) >= question.score * 0.9,
    comment: parsed.comment || '批改完成',
    errorType: parsed.errorType || null,
    correctAnswer: question.correctAnswer || parsed.correctAnswer || '',
  };
}

/**
 * 批量批改题目
 * @param questions 题目列表
 * @param options 选项
 * @returns 批改结果数组（顺序与输入一致）
 */
export async function gradeQuestions(
  questions: GradeQuestionInput[],
  options?: { useLocalOnly?: boolean; concurrency?: number; onProgress?: (i: number, total: number) => void },
): Promise<{ results: GradeResult[]; usedMock: boolean; errors: number }> {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  const model = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen3.6-35B-A3B';
  const useMock = !apiKey || apiKey.trim() === '' || !!options?.useLocalOnly;
  const concurrency = options?.concurrency || 1; // 保守并发1

  const results: GradeResult[] = [];
  let errors = 0;
  const isObjective = (t: string) => ['choice', 'judge', 'fill'].includes(t);

  // 串行处理（简单可靠）
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    try {
      // 客观题本地判分
      if (isObjective(q.type) && q.correctAnswer?.trim()) {
        results.push(gradeObjective(q.studentAnswer, q.correctAnswer, q.score, q.type));
      } else if (useMock) {
        // Mock模式
        results.push({
          score: Math.round(q.score * 0.7),
          maxScore: q.score,
          isCorrect: true,
          comment: '【自动批改演示】',
          errorType: null,
          correctAnswer: q.correctAnswer,
        });
      } else {
        // AI批改
        const r = await gradeOneWithAI(q, apiKey, model);
        results.push(r);
        await new Promise(res => setTimeout(res, 150)); // 速率保护
      }
    } catch (err) {
      console.error('[grade] 题目批改失败:', err);
      results.push({
        score: 0,
        maxScore: q.score,
        isCorrect: false,
        comment: '本题批改遇到问题，请老师手动批阅。',
        errorType: null,
        correctAnswer: q.correctAnswer,
      });
      errors++;
    }
    options?.onProgress?.(i + 1, questions.length);
  }

  return { results, usedMock: useMock, errors };
}
