import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

  return `你是一位经验丰富、认真负责的小学数学老师，请批改下面这道学生作业题。

题目类型：${typeLabels[question.type] || '题目'}
知识点：${question.knowledgePointName}
满分：${question.score}分

题目内容：
${question.content}${optionsText}

标准答案：${question.correctAnswer}

学生答案：${answer || '（未作答）'}

批改要求：
1. ${question.type === 'choice' || question.type === 'judge' || question.type === 'fill' ? '客观题答案唯一，必须严格对比标准答案判分' : '主观题/数学题请按要点给分，答案合理即可酌情给分'}
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

export async function POST(req: Request) {
  try {
    // 验证用户登录
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;
    const model = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-72B-Instruct';

    if (!apiKey || apiKey.trim() === '') {
      // 如果未配置API Key，返回Mock批改结果（方便演示）
      return NextResponse.json({
        warning: '未配置SILICONFLOW_API_KEY，使用Mock演示数据。请在.env.local中配置你的SiliconFlow API Key以获得真实AI批改。',
        results: getMockGradingResults(),
      });
    }

    const { questions, answers } = await req.json() as {
      questions: GradeQuestionRequest['question'][];
      answers: Record<string, string>;
    };

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    // 逐题调用AI批改
    const results = [];
    for (const question of questions) {
      const answer = answers[question.id] || '';
      const prompt = buildPrompt(question, answer);

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
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3, // 低温度保证结果稳定
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('SiliconFlow API error:', response.status, errorText);
          throw new Error(`API调用失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('API返回结果为空');
        }

        // 解析返回的JSON
        let parsed;
        try {
          // 尝试提取JSON（处理可能的markdown包裹）
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
        } catch (e) {
          console.error('JSON parse error:', content);
          throw new Error('批改结果解析失败');
        }

        results.push({
          questionId: question.id,
          score: Math.max(0, Math.min(question.score, Math.round(parsed.score || 0))),
          maxScore: question.score,
          isCorrect: Boolean(parsed.isCorrect) ?? parsed.score >= question.score * 0.9,
          comment: parsed.comment || '批改完成',
          errorType: parsed.errorType || null,
          correctAnswer: question.correctAnswer,
        });
      } catch (err) {
        console.error('批改题目失败', question.id, err);
        // 单题失败不影响整体，返回0分和错误提示
        results.push({
          questionId: question.id,
          score: 0,
          maxScore: question.score,
          isCorrect: false,
          comment: '本题批改遇到问题，请老师手动批阅。',
          errorType: null,
          correctAnswer: question.correctAnswer,
        });
      }

      // 添加延迟避免限流
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Grade API error:', error);
    return NextResponse.json(
      { error: '批改失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// Mock批改结果（未配置API Key时使用）
function getMockGradingResults() {
  return [
    {
      questionId: 'q1',
      score: 10,
      maxScore: 10,
      isCorrect: true,
      comment: '回答正确！你对奇数偶数概念掌握得很好，继续保持！',
      errorType: null,
      correctAnswer: 'C',
    },
    {
      questionId: 'q2',
      score: 0,
      maxScore: 10,
      isCorrect: false,
      comment: '计算错误哦，25+37=62，你算成了52。个位5+7=12，记得向十位进1，十位2+3+1=6，下次要细心点～',
      errorType: 'calculation',
      correctAnswer: '62',
    },
    {
      questionId: 'q3',
      score: 0,
      maxScore: 10,
      isCorrect: false,
      comment: '判断错误。1千克棉花和1千克铁重量都是1千克，是一样重的！不要被它们的材质和大小迷惑了，重量只和数值有关哦。',
      errorType: 'concept',
      correctAnswer: '错误',
    },
    {
      questionId: 'q4',
      score: 23,
      maxScore: 25,
      isCorrect: true,
      comment: '解题思路清晰，除法计算正确！第一问36÷6=6得12分，第二问36÷4=9得11分，只差2分满分，如果能写上答语就更完美了，真棒！',
      errorType: null,
      correctAnswer: '每个小朋友分到6颗；可以分给9个小朋友',
    },
    {
      questionId: 'q5',
      score: 18,
      maxScore: 20,
      isCorrect: true,
      comment: '例子举得非常好！伸缩门和楼梯栏杆确实都是生活中平行四边形的应用，说明你观察得很仔细。如果能再说出一个例子（比如篱笆格子）就满分啦！',
      errorType: null,
      correctAnswer: '示例：楼梯扶手、伸缩门、篱笆格子、七巧板等',
    },
  ];
}
