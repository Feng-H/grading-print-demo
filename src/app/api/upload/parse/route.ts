import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

interface ParseRequest {
  images: string[]; // dataURL 数组
  classHint?: string;
  subjectHint?: string;
}

const SYSTEM_PROMPT = `你是一位专业的中国小学生作业识别助手。你将收到小学生手写作业/试卷的照片。
请极其仔细地识别，输出严格JSON，不要任何其他文字、解释、markdown标记。

识别要求：
1. 在试卷顶部找到"姓名""班级""学号"等填写区域，准确识别学生手写的姓名和班级
2. 按印刷编号顺序逐题识别，区分印刷题目文字和学生的手写作答
3. 选择题要完整还原A/B/C/D选项文本，并识别学生勾选/填写的答案
4. 判断题识别学生打勾√、打叉×、或写"对/错""正确/错误""√/×"
5. 填空题识别学生写在横线上/括号里的内容
6. 数学题还原算式、数字、运算符号、单位，分数/竖式尽量用文字表达
7. 基于题目内容，客观题请给出你判断的标准答案；主观题/解答题suggestedCorrectAnswer留空字符串
8. 任何模糊、无法辨认的字用[?]标记，该题confidence设为0.5以下
9. 题型type只能是: choice(选择题), judge(判断题), fill(填空题), math(数学解答题), short_answer(简答题), essay(作文题)

输出JSON Schema:
{
  "studentName": "识别到的姓名，未识别则空字符串",
  "className": "识别到的班级，未识别则空字符串",
  "studentNo": "学号或null",
  "questions": [
    {
      "number": 1,
      "type": "choice|judge|fill|math|short_answer|essay",
      "content": "题目完整文本，选择题包含A/B/C/D选项",
      "options": ["A.xxx","B.xxx",...] 或 null,
      "studentAnswer": "学生手写答案的准确转录",
      "suggestedCorrectAnswer": "客观题给出标准答案；主观题空字符串",
      "confidence": 0.0-1.0
    }
  ]
}`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;
    const vlModel = process.env.SILICONFLOW_VL_MODEL || 'Qwen/Qwen2.5-VL-72B-Instruct';

    if (!apiKey) {
      return NextResponse.json({ error: '未配置SILICONFLOW_API_KEY' }, { status: 500 });
    }

    const { images, classHint, subjectHint } = await req.json() as ParseRequest;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '请上传至少一张图片' }, { status: 400 });
    }

    // 图片大小限制检查（dataURL 大小粗略判断，单张base64约<=10MB即原文件<=7.5MB）
    for (let i = 0; i < images.length; i++) {
      if (images[i].length > 12 * 1024 * 1024) {
        return NextResponse.json({ error: `第${i+1}张图片过大，请压缩后上传（建议小于8MB）` }, { status: 400 });
      }
    }

    const warnings: string[] = [];
    const allQuestions: any[] = [];
    let studentName = '';
    let className = '';
    let studentNo: string | null = null;
    let confidenceSum = 0;
    let confidenceCount = 0;

    // 逐页调用VL识别
    for (let pageIdx = 0; pageIdx < images.length; pageIdx++) {
      const img = images[pageIdx];
      console.log(`[OCR] 识别第 ${pageIdx + 1}/${images.length} 页...`);

      // 构造多模态消息：所有页一次性也可以，但逐页更稳（避免token超限）
      const content: any[] = [];
      if (pageIdx === 0) {
        content.push({
          type: 'text',
          text: `${SYSTEM_PROMPT}\n\n这是一份${subjectHint || '小学生'}作业的第${pageIdx+1}页（共${images.length}页）。这是首页，请务必识别顶部的姓名、班级信息。`,
        });
      } else {
        content.push({
          type: 'text',
          text: `${SYSTEM_PROMPT}\n\n这是作业的第${pageIdx+1}页（共${images.length}页）。首页已经识别过姓名班级，本页只需要识别题目和答案。题号可能从本页中间开始。`,
        });
      }
      if (classHint) {
        content.push({ type: 'text', text: `提示：班级可能是"${classHint}"。` });
      }
      content.push({
        type: 'image_url',
        image_url: { url: img, detail: 'high' },
      });

      try {
        const resp = await fetch(SILICONFLOW_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: vlModel,
            messages: [
              {
                role: 'user',
                content,
              },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
            max_tokens: 4096,
          }),
        });

        if (!resp.ok) {
          const errTxt = await resp.text();
          console.error(`[OCR] 第${pageIdx+1}页API错误:`, resp.status, errTxt.slice(0, 500));
          warnings.push(`第${pageIdx+1}页识别失败(${resp.status})，已跳过`);
          continue;
        }

        const data = await resp.json();
        const raw = data.choices?.[0]?.message?.content;
        if (!raw) {
          warnings.push(`第${pageIdx+1}页无返回内容`);
          continue;
        }

        // 解析JSON
        let parsed;
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch (e) {
          console.error('[OCR] JSON解析失败:', raw.slice(0, 500));
          warnings.push(`第${pageIdx+1}页识别结果解析失败`);
          continue;
        }

        if (pageIdx === 0) {
          studentName = (parsed.studentName || '').trim();
          className = (parsed.className || '').trim();
          studentNo = parsed.studentNo || null;
        }

        const qs = Array.isArray(parsed.questions) ? parsed.questions : [];
        for (const q of qs) {
          // 题号加页偏移，简单处理：用序号累加
          allQuestions.push({
            number: q.number ?? allQuestions.length + 1,
            type: ['choice','judge','fill','math','short_answer','essay'].includes(q.type) ? q.type : 'fill',
            content: (q.content || '').trim(),
            options: Array.isArray(q.options) && q.options.length > 0 ? q.options : null,
            studentAnswer: (q.studentAnswer || '').trim(),
            suggestedCorrectAnswer: (q.suggestedCorrectAnswer || '').trim(),
            confidence: typeof q.confidence === 'number' ? q.confidence : 0.5,
          });
          confidenceSum += typeof q.confidence === 'number' ? q.confidence : 0.5;
          confidenceCount++;
        }
      } catch (err: any) {
        console.error(`[OCR] 第${pageIdx+1}页异常:`, err);
        warnings.push(`第${pageIdx+1}页识别异常：${err.message || '未知错误'}`);
      }

      // 限流：每页之间稍等
      if (pageIdx < images.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (allQuestions.length === 0) {
      return NextResponse.json(
        { error: '未能识别到任何题目，请尝试更清晰的照片或手动输入题目', warnings },
        { status: 422 }
      );
    }

    // 按number重新排序、重新生成连续题号
    allQuestions.sort((a, b) => a.number - b.number);
    allQuestions.forEach((q, i) => {
      q.number = i + 1;
    });

    const avgConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

    return NextResponse.json({
      success: true,
      paper: {
        studentName,
        className,
        studentNo,
        questions: allQuestions,
        avgConfidence,
        pageCount: images.length,
      },
      warnings,
    });
  } catch (error: any) {
    console.error('[OCR] Fatal error:', error);
    return NextResponse.json(
      { error: '识别服务异常：' + (error.message || '未知错误') },
      { status: 500 }
    );
  }
}
