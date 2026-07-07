/**
 * 批注规划器 - 根据批改结果自动生成 Annotation 位置
 */

export interface Bbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlannerQuestion {
  id?: string;
  page: number;
  bbox?: Bbox | null;
  studentAnswerBbox?: Bbox | null;
}

export interface PlannerGradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  isCorrect: boolean;
  comment?: string;
  errorType?: string | null;
}

export interface PlannerInput {
  questions: PlannerQuestion[];
  results: PlannerGradingResult[];
  totalScore: number;
  maxScore: number;
  nameBox?: Bbox | null;
  pageCount: number;
}

export interface PlannedAnnotation {
  questionId: string | null;
  page: number;
  kind: string;
  xPct: number;
  yPct: number;
  wPct?: number | null;
  hPct?: number | null;
  text?: string | null;
  strokePath?: any;
  color: string;
  fontSize?: number | null;
  strokeWidth?: number | null;
  source: 'ai' | 'teacher';
}

/**
 * IOU计算 - 用于检测重叠
 */
function iou(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): number {
  const ax1 = a.x, ay1 = a.y, ax2 = a.x + a.w, ay2 = a.y + a.h;
  const bx1 = b.x, by1 = b.y, bx2 = b.x + b.w, by2 = b.y + b.h;
  const ix1 = Math.max(ax1, bx1), iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2);
  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const inter = (ix2 - ix1) * (iy2 - iy1);
  const ua = a.w * a.h + b.w * b.h - inter;
  return inter / ua;
}

/**
 * 检查新元素是否与已有元素重叠过多
 */
function hasOverlap(boxes: { x: number; y: number; w: number; h: number }[], b: { x: number; y: number; w: number; h: number }, threshold = 0.2): boolean {
  return boxes.some(existing => iou(existing, b) > threshold);
}

/**
 * 根据批改结果生成批注
 */
export function planAnnotations(input: PlannerInput): PlannedAnnotation[] {
  const { questions, results, totalScore, maxScore, nameBox, pageCount } = input;
  const annotations: PlannedAnnotation[] = [];
  const placedBoxesByPage: Record<number, { x: number; y: number; w: number; h: number }[]> = {};

  function addAnnotation(ann: PlannedAnnotation, bbox: { x: number; y: number; w: number; h: number }) {
    const page = ann.page;
    if (!placedBoxesByPage[page]) placedBoxesByPage[page] = [];
    // 简单冲突避让
    let candidate = { ...bbox };
    let attempts = 0;
    while (hasOverlap(placedBoxesByPage[page], candidate) && attempts < 10) {
      // 向右偏移
      candidate = { ...candidate, x: Math.min(0.92, candidate.x + 0.04) };
      if (candidate.x + candidate.w > 0.98) {
        // 放不下就换行
        candidate = { ...candidate, x: bbox.x, y: Math.min(0.95, candidate.y + candidate.h + 0.01) };
      }
      attempts++;
    }
    placedBoxesByPage[page].push(candidate);
    // 更新ann的位置
    ann.xPct = candidate.x + candidate.w * 0.3;
    ann.yPct = candidate.y + candidate.h * 0.5;
    annotations.push(ann);
  }

  // 按题目页和位置排序，先处理上面的题
  const qResults = questions.map(q => {
    const r = results.find(r => r.questionId === q.id);
    return { q, r };
  }).sort((a, b) => {
    const pa = a.q.page || 0, pb = b.q.page || 0;
    if (pa !== pb) return pa - pb;
    return (a.q.bbox?.y || 0) - (b.q.bbox?.y || 0);
  });

  for (const { q, r } of qResults) {
    if (!r) continue;
    const page = q.page || 0;
    const bbox = q.bbox || { x: 0.5, y: 0.5, w: 0.1, h: 0.05 }; // 默认位置兜底

    if (r.isCorrect) {
      // 对题：右上打√
      const size = Math.min(0.06, Math.max(0.04, bbox.w * 0.08));
      const checkBbox = {
        x: bbox.x + bbox.w - size - 0.01,
        y: bbox.y - size * 0.3,
        w: size,
        h: size,
      };
      addAnnotation({
        questionId: q.id || null,
        page,
        kind: 'check',
        xPct: 0, yPct: 0, wPct: size, hPct: size,
        text: '√',
        color: '#16A34A', // 绿色√（传统批改红笔，但绿色√也常见；保持红色统一可改为#E11D48）
        fontSize: Math.round(size * 100 * 1.5),
        strokeWidth: 3,
        source: 'ai',
      }, checkBbox);
    } else {
      // 错题：右上打×，扣分
      const markSize = Math.min(0.06, Math.max(0.04, bbox.w * 0.08));
      const crossBbox = {
        x: bbox.x + bbox.w - markSize - 0.01,
        y: bbox.y - markSize * 0.3,
        w: markSize,
        h: markSize,
      };
      addAnnotation({
        questionId: q.id || null,
        page,
        kind: 'cross',
        xPct: 0, yPct: 0, wPct: markSize, hPct: markSize,
        text: '×',
        color: '#E11D48', // 红色×
        fontSize: Math.round(markSize * 100 * 1.5),
        strokeWidth: 3,
        source: 'ai',
      }, crossBbox);

      // 扣分值
      const deduction = r.maxScore - r.score;
      if (deduction > 0) {
        const scoreSize = Math.min(0.045, Math.max(0.03, bbox.w * 0.06));
        const scoreText = `-${deduction}`;
        const scoreBbox = {
          x: Math.max(0.02, crossBbox.x - 0.08),
          y: crossBbox.y + 0.005,
          w: Math.max(0.06, scoreText.length * scoreSize * 0.7),
          h: scoreSize,
        };
        addAnnotation({
          questionId: q.id || null,
          page,
          kind: 'score',
          xPct: 0, yPct: 0, wPct: scoreBbox.w, hPct: scoreBbox.h,
          text: scoreText,
          color: '#E11D48',
          fontSize: Math.round(scoreSize * 100 * 1.3),
          strokeWidth: 2,
          source: 'ai',
        }, scoreBbox);
      }

      // 评语（只有错题或扣分多的题写）
      if (r.comment && r.comment.trim() && deduction >= Math.max(1, r.maxScore * 0.3)) {
        const commentSize = 0.028;
        const lines = wrapText(r.comment, 25); // 每行约25字
        const commentH = commentSize * lines.length * 1.3;
        const commentW = Math.min(0.35, Math.max(0.15, Math.max(...lines.map(l => l.length)) * commentSize * 0.8));
        let commentY = bbox.y + bbox.h + 0.005;
        if (commentY + commentH > 0.95) {
          commentY = Math.max(0.05, bbox.y - commentH - 0.01);
        }
        const commentBbox = {
          x: bbox.x,
          y: commentY,
          w: commentW,
          h: commentH,
        };
        addAnnotation({
          questionId: q.id || null,
          page,
          kind: 'comment',
          xPct: 0, yPct: 0, wPct: commentBbox.w, hPct: commentBbox.h,
          text: lines.join('\n'),
          color: '#E11D48',
          fontSize: Math.round(commentSize * 100),
          strokeWidth: 1,
          source: 'ai',
        }, commentBbox);
      }

      // 错处圈画：在studentAnswerBbox画个圈/下划线
      if (q.studentAnswerBbox) {
        const sa = q.studentAnswerBbox;
        addAnnotation({
          questionId: q.id || null,
          page,
          kind: 'underline',
          xPct: sa.x, yPct: sa.y + sa.h, wPct: sa.w, hPct: 0.005,
          color: '#E11D48',
          fontSize: undefined,
          strokeWidth: 2,
          source: 'ai',
        }, { x: sa.x, y: sa.y + sa.h, w: sa.w, h: 0.01 });
      }
    }
  }

  // 总分：写在nameBox右侧（首页）
  if (nameBox && pageCount > 0) {
    const scoreSize = Math.min(0.05, nameBox.h * 0.9);
    const scoreText = `${totalScore}/${maxScore}`;
    const scoreBbox = {
      x: Math.min(0.7, nameBox.x + nameBox.w + 0.02),
      y: nameBox.y,
      w: Math.max(0.12, scoreText.length * scoreSize * 0.7),
      h: nameBox.h,
    };
    addAnnotation({
      questionId: null,
      page: 0,
      kind: 'score',
      xPct: 0, yPct: 0, wPct: scoreBbox.w, hPct: scoreBbox.h,
      text: scoreText,
      color: '#E11D48',
      fontSize: Math.round(scoreSize * 100 * 1.2),
      strokeWidth: 3,
      source: 'ai',
    }, scoreBbox);
  } else {
    // 没有nameBox就写在右上角
    const size = 0.045;
    const scoreText = `${totalScore}/${maxScore}分`;
    addAnnotation({
      questionId: null,
      page: 0,
      kind: 'score',
      xPct: 0, yPct: 0, wPct: 0.18, hPct: size,
      text: scoreText,
      color: '#E11D48',
      fontSize: Math.round(size * 100 * 1.2),
      strokeWidth: 3,
      source: 'ai',
    }, { x: 0.75, y: 0.02, w: 0.2, h: size });
  }

  return annotations;
}

/**
 * 简单文本换行（按字符数）
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let remaining = text.trim();
  while (remaining.length > 0) {
    if (remaining.length <= maxCharsPerLine) {
      lines.push(remaining);
      break;
    }
    // 找最近的标点或空格断句
    let breakAt = maxCharsPerLine;
    for (let i = maxCharsPerLine; i >= Math.max(1, maxCharsPerLine - 8); i--) {
      if (/[，。！？、；：,.!?;:\s]/.test(remaining[i])) {
        breakAt = i + 1;
        break;
      }
    }
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt).trim();
  }
  return lines;
}
