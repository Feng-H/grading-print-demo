/**
 * VL OCR 识别 - 支持坐标定位、正反面识别
 */

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

export interface OcrBbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface OcrQuestion {
  number: number;
  type: 'choice' | 'judge' | 'fill' | 'math' | 'short_answer' | 'essay';
  content: string;
  options: string[] | null;
  studentAnswer: string;
  suggestedCorrectAnswer: string;
  confidence: number;
  bbox?: OcrBbox;
  studentAnswerBbox?: OcrBbox;
}

export interface OcrPage {
  pageIndex: number;
  hasHeader: boolean;
  nameBox?: OcrBbox;
  paperOrdinal?: number; // 本份试卷第几页 1=正面 2=反面
  detectedName?: string;
  detectedStudentNo?: string;
  questions: OcrQuestion[];
}

export interface OcrResult {
  title: string;
  subject: string;
  grade?: string;
  pages: OcrPage[];
  questions: OcrQuestion[]; // 汇总所有页的题目
  avgConfidence: number;
  warnings: string[];
}

function extractJson(text: string): any {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    const candidate = text.slice(start, end + 1);
    try { return JSON.parse(candidate); } catch {}
    const cleaned = candidate.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    try { return JSON.parse(cleaned); } catch {}
  }
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) {
    try { return JSON.parse(mdMatch[1]); } catch {}
  }
  return null;
}

// 系统prompt - 新增坐标和正反面识别要求
const SYSTEM_PROMPT = `你是一位专业的中国小学作业OCR识别助手。你将收到学生手写作业/试卷的照片，任务是**如实抄录**试卷上的所有内容，并且作为"坐标标注员"精确给出每题和姓名栏的位置。

【最重要原则】studentAnswer字段必须逐字逐句还原学生手写的原始内容！
- 学生写错的答案也要原样录入，绝不能自动纠正！
- 例如学生把"12"写成"21"，你必须写"21"而不是"12"
- 学生把">写成"<"，你必须写"<"而不是">"
- 学生把"+"写成"-"，你必须写"-"
- 如果学生写了错误步骤或乱涂乱画，也要如实记录
- 如果学生没有作答（空白），填空字符串""
- 你是OCR扫描仪，不是批改老师，你的唯一职责是如实转录，绝对不要"帮学生改正"

【坐标标注任务 - 关键】
除识别文字外，你必须精确标注每个元素在页面上的位置，所有坐标使用**相对页面的百分比**，取值范围0~1：
- 页面左上角为(0,0)，右下角为(1,1)
- bbox格式：{"x":0.06,"y":0.15,"w":0.88,"h":0.08}
- x/w为水平方向比例，y/h为垂直方向比例，误差控制在5%以内
- 每题bbox覆盖题干+学生作答区（含横线/括号/空白），不要把整页当一个bbox

【正反面识别规则】
- 试卷为正反面打印，每份试卷通常2页（正面+反面）
- 正面页（奇数页，如第1、3、5...页）通常在顶部有"姓名____ 班级____ 学号____"填写区，标记hasHeader=true
- 反面页（偶数页，如第2、4、6...页）通常顶部没有姓名填写区，标记hasHeader=false
- 如果当前页有姓名栏，请给出nameBox坐标（姓名填写区整体位置）
- paperOrdinal字段：本份试卷中的页码，正面=1，反面=2

关键识别任务：
1. 首页识别试卷标题（如"第三单元测试卷"）→ title
2. 根据标题和题目内容判断科目subject（数学/语文/英语/科学/其他）
3. 识别印刷的年级（如"三年级"）作为grade
4. 在姓名/班级填写处识别学生手写的姓名、班级、学号
5. 按编号识别每道题，严格区分印刷题目和学生手写答案
6. 选择题要列出A/B/C/D选项并识别学生选了哪个
7. 判断题识别√×或"对/错"
8. 填空题识别横线上/括号里的答案
9. 数学题完整还原学生的解题过程（每一步都要记录，包括错误的步骤）
10. 客观题根据题目内容推断标准答案suggestedCorrectAnswer，主观题填空字符串
11. 每题给出bbox坐标（x,y,w,h百分比），有明确学生答案区域的题还给出studentAnswerBbox

严格输出一个JSON对象（不要其他文字），格式：
{
  "title": "试卷标题（仅首页填写，后续页可留空）",
  "subject": "数学",
  "grade": "三年级",
  "hasHeader": true,
  "paperOrdinal": 1,
  "nameBox": {"x":0.05,"y":0.03,"w":0.55,"h":0.06},
  "detectedName": "学生姓名（姓名栏中的手写姓名）",
  "detectedStudentNo": "学号",
  "questions": [
    {
      "number": 1,
      "type": "choice|judge|fill|math|short_answer|essay",
      "content": "题目内容（选择题包含选项）",
      "options": ["A.选项1","B.选项2","C.选项3","D.选项4"],
      "studentAnswer": "学生手写的原始答案，逐字如实抄录，不许纠正",
      "suggestedCorrectAnswer": "根据题目推断的标准答案",
      "confidence": 0.8,
      "bbox": {"x":0.06,"y":0.15,"w":0.88,"h":0.08},
      "studentAnswerBbox": {"x":0.5,"y":0.18,"w":0.4,"h":0.04}
    }
  ]
}
注意：options字段选择题必须是数组，其他题型为[]。confidence填0-1数字。即使图片模糊也要尽量识别出题目，至少返回能看清的题目。所有坐标必须是0到1之间的小数。`;

// SiliconFlow视觉模型fallback链
const VL_MODELS = [
  process.env.SILICONFLOW_VL_MODEL,
  'Qwen/Qwen3.6-35B-A3B',
  'Qwen/Qwen3.6-27B',
  'Qwen/Qwen3-VL-8B-Instruct',
  'Qwen/Qwen3-VL-32B-Instruct',
  'Qwen/Qwen3-VL-235B-A22B-Instruct',
  'Qwen/Qwen2.5-VL-72B-Instruct',
  'Qwen/Qwen2.5-VL-32B-Instruct',
  'Qwen/Qwen2-VL-72B-Instruct',
].filter(Boolean) as string[];

const MAX_PER_IMAGE = 4.5 * 1024 * 1024;
const TOTAL_MAX = 18 * 1024 * 1024;

/**
 * 调用视觉模型识别单页
 */
async function callVisionModel(
  imageUrl: string,
  textPrompt: string,
  apiKey: string,
): Promise<{ parsed: any; modelUsed: string; error?: string }> {
  for (const modelId of VL_MODELS) {
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
        continue;
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

function normalizeBbox(b: any): OcrBbox | undefined {
  if (!b || typeof b !== 'object') return undefined;
  const x = Number(b.x), y = Number(b.y), w = Number(b.w), h = Number(b.h);
  if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return undefined;
  if (x < 0 || x > 1 || y < 0 || y > 1 || w <= 0 || h <= 0 || w > 1.1 || h > 1.1) return undefined;
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), w: Math.max(0.01, Math.min(1, w)), h: Math.max(0.01, Math.min(1, h)) };
}

/**
 * 识别一组页面图片
 * @param images dataURL字符串数组
 * @returns OCR识别结果
 */
export async function parsePaperPages(images: string[]): Promise<OcrResult> {
  const apiKey = process.env.SILICONFLOW_API_KEY;
  if (!apiKey) {
    // Mock模式：返回空结构
    return {
      title: 'Mock作业', subject: '数学', pages: images.map((_, i) => ({
        pageIndex: i, hasHeader: i % 2 === 0, questions: [],
      })), questions: [], avgConfidence: 0, warnings: ['未配置SILICONFLOW_API_KEY，使用Mock模式'],
    };
  }

  // 大小校验
  let totalSize = 0;
  for (let i = 0; i < images.length; i++) {
    const sz = images[i].length;
    totalSize += sz;
    if (sz > MAX_PER_IMAGE) {
      throw new Error(`第${i+1}张图片过大(${(sz/1024/1024).toFixed(1)}MB)`);
    }
  }
  if (totalSize > TOTAL_MAX) {
    throw new Error(`总大小过大(${(totalSize/1024/1024).toFixed(1)}MB)`);
  }

  const warnings: string[] = [];
  const allQuestions: OcrQuestion[] = [];
  const pages: OcrPage[] = [];
  let paperTitle = '';
  let paperSubject = '数学';
  let paperGrade = '';
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (let pageIdx = 0; pageIdx < images.length; pageIdx++) {
    const img = images[pageIdx];
    console.log(`[OCR] 第${pageIdx+1}/${images.length}页, 大小:${(img.length/1024).toFixed(0)}KB`);

    const isFirstPage = pageIdx === 0;
    const userText = isFirstPage
      ? `${SYSTEM_PROMPT}\n\n这是第1页（首页，正面），请务必识别试卷标题、科目、年级、学生姓名、学号、nameBox坐标，以及本页所有题目及其bbox。`
      : `这是试卷的第${pageIdx+1}页（共${images.length}页）。${pageIdx % 2 === 0 ? '这是一份试卷的正面（奇数页），应该有姓名栏（hasHeader=true）' : '这是一份试卷的反面（偶数页），通常没有姓名栏（hasHeader=false）'}。请识别本页所有题目及其bbox，题目number续接之前的编号。title/subject/grade字段可以留空字符串，但仍然输出完整JSON。`;

    const { parsed, error } = await callVisionModel(img, userText, apiKey);

    if (!parsed) {
      warnings.push(`第${pageIdx+1}页识别失败：${error || '未知错误'}`);
      pages.push({ pageIndex: pageIdx, hasHeader: pageIdx % 2 === 0, questions: [] });
      continue;
    }

    // 首页整体信息
    if (isFirstPage) {
      paperTitle = (parsed.title || '').trim();
      paperSubject = (parsed.subject || '数学').trim() || '数学';
      paperGrade = (parsed.grade || '').trim();
    }

    const hasHeader = typeof parsed.hasHeader === 'boolean' ? parsed.hasHeader : (pageIdx % 2 === 0);
    const page: OcrPage = {
      pageIndex: pageIdx,
      hasHeader,
      nameBox: normalizeBbox(parsed.nameBox),
      paperOrdinal: typeof parsed.paperOrdinal === 'number' ? parsed.paperOrdinal : (pageIdx % 2 === 0 ? 1 : 2),
      detectedName: (parsed.detectedName || '').trim() || undefined,
      detectedStudentNo: (parsed.detectedStudentNo || '').trim() || undefined,
      questions: [],
    };

    const qs = Array.isArray(parsed.questions) ? parsed.questions : [];
    console.log(`[OCR] 第${pageIdx+1}页识别到${qs.length}题`);

    for (const q of qs) {
      if (!q || !q.content) continue;
      const t = q.type;
      const validType = ['choice','judge','fill','math','short_answer','essay'].includes(t) ? t : 'fill';
      const question: OcrQuestion = {
        number: q.number ?? (allQuestions.length + 1),
        type: validType as any,
        content: (q.content || '').toString().trim(),
        options: Array.isArray(q.options) && q.options.length >= 2 && validType === 'choice'
          ? q.options.map((x: any) => String(x).trim()).filter(Boolean)
          : null,
        studentAnswer: (q.studentAnswer || '').toString().trim(),
        suggestedCorrectAnswer: (q.suggestedCorrectAnswer || '').toString().trim(),
        confidence: typeof q.confidence === 'number' ? q.confidence : 0.5,
        bbox: normalizeBbox(q.bbox),
        studentAnswerBbox: normalizeBbox(q.studentAnswerBbox),
      };
      page.questions.push(question);
      allQuestions.push(question);
      confidenceSum += question.confidence;
      confidenceCount++;
    }
    pages.push(page);
  }

  if (allQuestions.length === 0) {
    throw new Error(warnings.join('; ') || '未能识别到题目');
  }

  allQuestions.sort((a, b) => a.number - b.number);
  allQuestions.forEach((q, i) => { q.number = i + 1; });

  if (!paperTitle) paperTitle = `${paperSubject}作业`;

  // 验证nameBox只在正面页出现
  const firstNamedPage = pages.find(p => p.detectedName);
  const detectedName = firstNamedPage?.detectedName || '';
  const detectedStudentNo = firstNamedPage?.detectedStudentNo || '';
  if (!detectedName) warnings.push('未能识别学生姓名，请手动确认');

  return {
    title: paperTitle,
    subject: paperSubject,
    grade: paperGrade,
    pages,
    questions: allQuestions,
    avgConfidence: confidenceCount > 0 ? confidenceSum / confidenceCount : 0,
    warnings,
  };
}
