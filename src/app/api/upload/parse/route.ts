import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

interface ParseRequest {
  images: string[];
}

function extractJson(text: string): any {
  if (!text) return null;
  // 尝试直接parse
  try { return JSON.parse(text); } catch {}
  // 找最外层的 { ... }
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch {}
    // 尝试清理markdown代码块
    const cleaned = candidate
      .replace(/```(?:json)?/g, '')
      .replace(/```/g, '')
      .trim();
    try { return JSON.parse(cleaned); } catch {}
  }
  // 找 ```json ... ``` 块
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) {
    try { return JSON.parse(mdMatch[1]); } catch {}
  }
  return null;
}

const SYSTEM_PROMPT = `你是一位专业的中国小学作业识别助手。你将收到学生手写作业/试卷的照片。请识别试卷内容并输出JSON。

关键识别任务：
1. 试卷顶部通常有标题（如"第三单元测试卷""数学练习"）→ 提取为title
2. 根据标题和题目内容判断科目subject（数学/语文/英语/科学/其他）
3. 识别印刷的年级（如"三年级""二年级"）作为grade
4. 在姓名/班级填写处识别学生手写的姓名、班级（几班）
5. 按编号识别每道题，区分印刷题目和学生手写答案
6. 选择题要列出A/B/C/D选项并识别学生选了哪个
7. 判断题识别√×或"对/错"
8. 填空题识别横线上/括号里的答案
9. 数学题还原算式、数字、运算符号
10. 客观题根据题目内容推断标准答案suggestedCorrectAnswer，主观题填空字符串

严格输出一个JSON对象（不要其他文字），格式：
{
  "title": "试卷标题",
  "subject": "数学",
  "grade": "三年级",
  "studentName": "学生姓名",
  "className": "班级，如2班",
  "studentNo": "学号或空字符串",
  "questions": [
    {
      "number": 1,
      "type": "choice|judge|fill|math|short_answer|essay",
      "content": "题目内容（选择题包含选项）",
      "options": ["A.选项1","B.选项2","C.选项3","D.选项4"],
      "studentAnswer": "学生答案",
      "suggestedCorrectAnswer": "标准答案或空字符串",
      "confidence": 0.8
    }
  ]
}
注意：options字段选择题必须是数组，其他题型为null或空数组。confidence填0-1数字。即使图片模糊也要尽量识别出题目，至少返回能看清的题目。`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const apiKey = process.env.SILICONFLOW_API_KEY;
    // 视觉模型fallback链：按SiliconFlow实际可用性排序
    // 403=需开通, 400=不存在(已移除), 只有确认可用的排在前面
    const vlModels = [
      process.env.SILICONFLOW_VL_MODEL,
      // === 确认可用（已有视觉输入能力的通用模型）===
      'Qwen/Qwen3.6-35B-A3B',               // 文本模型但支持视觉输入，当前账号已在使用
      'Qwen/Qwen3.6-27B',                   // 同上，支持视觉理解
      'Qwen/Qwen3-VL-8B-Instruct',           // Qwen3-VL系列，实际可用
      'Qwen/Qwen3-VL-32B-Instruct',          // Qwen3-VL系列，热门模型
      'Qwen/Qwen3-VL-235B-A22B-Instruct',    // 403需开通，开通后效果最好
      // === 需要开通（403 Model disabled）===
      'Qwen/Qwen2.5-VL-72B-Instruct',
      'Qwen/Qwen2.5-VL-32B-Instruct',
      'Qwen/Qwen2-VL-72B-Instruct',
      'deepseek-ai/Janus-Pro-7B',
      'deepseek-ai/DeepSeek-VL2',
      'THUDM/GLM-4.1V-9B-Thinking',
      'Qwen/QVQ-72B-Preview',
    ].filter(Boolean) as string[];

    if (!apiKey) {
      return NextResponse.json({ error: '未配置SILICONFLOW_API_KEY' }, { status: 500 });
    }

    const { images } = await req.json() as ParseRequest;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: '请上传至少一张图片' }, { status: 400 });
    }

    const MAX_PER_IMAGE = 4.5 * 1024 * 1024;
    const TOTAL_MAX = 18 * 1024 * 1024;
    let totalSize = 0;
    for (let i = 0; i < images.length; i++) {
      const sz = images[i].length;
      totalSize += sz;
      if (sz > MAX_PER_IMAGE) {
        return NextResponse.json(
          { error: `第${i+1}张图片过大(${(sz/1024/1024).toFixed(1)}MB)，请压缩后重试` },
          { status: 413 }
        );
      }
    }
    if (totalSize > TOTAL_MAX) {
      return NextResponse.json(
        { error: `总大小过大(${(totalSize/1024/1024).toFixed(1)}MB)，建议分批上传` },
        { status: 413 }
      );
    }

    const warnings: string[] = [];
    const allQuestions: any[] = [];
    let studentName = '';
    let className = '';
    let studentNo: string | null = null;
    let paperTitle = '';
    let paperSubject = '数学';
    let apiDebug: any = null;
    let confidenceSum = 0;
    let confidenceCount = 0;

    // 定义每页调用VL的函数 - 遍历模型fallback
    async function callVisionModel(imageUrl: string, textPrompt: string): Promise<{ parsed: any; modelUsed: string; error?: string }> {
      for (const modelId of vlModels) {
        try {
          const resp = await fetch(SILICONFLOW_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: textPrompt },
                  { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
                ],
              }],
              temperature: 0.1,
              max_tokens: 4096,
            }),
          });
          const respText = await resp.text();
          if (!resp.ok) {
            console.warn(`[OCR] 模型 ${modelId} 返回 ${resp.status}: ${respText.slice(0, 200)}`);
            apiDebug = { model: modelId, status: resp.status, body: respText.slice(0, 300) };
            continue; // 尝试下一个模型
          }
          let data;
          try { data = JSON.parse(respText); } catch { continue; }
          const content: string = data.choices?.[0]?.message?.content || '';
          const parsed = extractJson(content);
          if (parsed) {
            console.log(`[OCR] 模型 ${modelId} 调用成功，返回${content.length}字符`);
            return { parsed, modelUsed: modelId };
          }
        } catch (err: any) {
          console.warn(`[OCR] 模型 ${modelId} 异常:`, err.message);
        }
      }
      return { parsed: null, modelUsed: '', error: '所有视觉模型都调用失败' };
    }

    for (let pageIdx = 0; pageIdx < images.length; pageIdx++) {
      const img = images[pageIdx];
      console.log(`[OCR] 第${pageIdx+1}/${images.length}页, 大小:${(img.length/1024).toFixed(0)}KB`);

      const userText = pageIdx === 0
        ? `${SYSTEM_PROMPT}\n\n这是第1页（首页），请务必识别试卷标题、科目、年级、学生姓名、班级，以及本页所有题目。`
        : `这是试卷的第${pageIdx+1}页（共${images.length}页）。请识别本页所有题目，续接之前的题号。只需返回questions数组内容（但仍然输出完整JSON对象，title/subject等字段可以留空字符串）。`;

      // 调用 - 自动fallback模型
      const { parsed, error } = await callVisionModel(img, userText);

      if (!parsed) {
        warnings.push(`第${pageIdx+1}页识别失败：${error || '未知错误'}`);
        continue;
      }

      // 合并第一页的整体信息
      if (pageIdx === 0) {
        paperTitle = (parsed.title || '').trim();
        paperSubject = (parsed.subject || '数学').trim() || '数学';
        const g = (parsed.grade || '').trim();
        const c = (parsed.className || '').trim();
        if (g && c) {
          className = (g + c).replace(/班班$/, '班');
        } else {
          className = (g || c).trim();
        }
        studentName = (parsed.studentName || '').trim();
        studentNo = parsed.studentNo || null;
      }

      const qs = Array.isArray(parsed.questions) ? parsed.questions : [];
      console.log(`[OCR] 第${pageIdx+1}页识别到${qs.length}题`);
      for (const q of qs) {
        if (!q || !q.content) continue;
        const t = q.type;
        const validType = ['choice','judge','fill','math','short_answer','essay'].includes(t) ? t : 'fill';
        allQuestions.push({
          number: q.number ?? allQuestions.length + 1,
          type: validType,
          content: (q.content || '').toString().trim(),
          options: Array.isArray(q.options) && q.options.length >= 2 && validType === 'choice' ? q.options.map((x: any) => String(x).trim()).filter(Boolean) : null,
          studentAnswer: (q.studentAnswer || '').toString().trim(),
          suggestedCorrectAnswer: (q.suggestedCorrectAnswer || '').toString().trim(),
          confidence: typeof q.confidence === 'number' ? q.confidence : 0.5,
        });
        confidenceSum += typeof q.confidence === 'number' ? q.confidence : 0.5;
        confidenceCount++;
      }
    }

    if (allQuestions.length === 0) {
      // 检查是不是所有模型都返回403（未开通）
      const allDisabled = warnings.some(w => w.includes('所有视觉模型都调用失败')) || (apiDebug && String(apiDebug.body || '').includes('Model disabled'));
      const errMsg = allDisabled
        ? '视觉模型尚未开通。请登录SiliconFlow控制台 (https://cloud.siliconflow.cn/models) 搜索 Qwen2.5-VL 并点击"开通"（免费），开通后即可使用试卷识别功能。'
        : '未能识别到题目。可能原因：1）照片不够清晰 2）试卷内容不完整 3）图片方向不对（请点缩略图↻按钮旋转）。请重试。';
      return NextResponse.json(
        { error: errMsg, warnings, debug: apiDebug },
        { status: 422 }
      );
    }

    allQuestions.sort((a, b) => a.number - b.number);
    allQuestions.forEach((q, i) => { q.number = i + 1; });

    if (!paperTitle) paperTitle = `${paperSubject}作业`;
    if (!studentName) warnings.push('未能识别学生姓名，请手动选择或输入');
    if (!className) warnings.push('未能识别班级，请手动确认');

    return NextResponse.json({
      success: true,
      paper: {
        title: paperTitle,
        subject: paperSubject,
        studentName,
        className,
        studentNo,
        questions: allQuestions,
        avgConfidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
        pageCount: images.length,
      },
      warnings,
    });
  } catch (error: any) {
    console.error('[OCR] Fatal:', error);
    return NextResponse.json(
      { error: '识别服务异常：' + (error.message || '未知错误') },
      { status: 500 }
    );
  }
}
