/**
 * 批注PDF渲染：使用pdf-lib在原卷PDF上叠加红色批注，或生成纯批注PDF
 */
import { PDFDocument, PDFPage, rgb, Color, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import path from 'node:path';
import fs from 'node:fs/promises';

// 批注颜色
const RED = rgb(0.88, 0.11, 0.28); // #E11D48 红色
const GREEN = rgb(0.09, 0.64, 0.29); // 绿色（√）

export interface RenderAnnotation {
  page: number; // 0-based
  kind: string;
  xPct: number;
  yPct: number;
  wPct?: number | null;
  hPct?: number | null;
  text?: string | null;
  color?: string;
  fontSize?: number | null;
  strokeWidth?: number | null;
  strokePath?: any;
}

export interface RenderSheet {
  pdfBuffer: Buffer; // 学生试卷原PDF
  pageCount: number;
}

let cachedFont: Uint8Array | null = null;

async function loadChineseFont(): Promise<Uint8Array> {
  if (cachedFont) return cachedFont;
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansSC-Regular.otf');
  try {
    cachedFont = await fs.readFile(fontPath);
  } catch {
    // 兜底：用Helvetica（不含中文，会显示方块）
    console.warn('[render] 中文字体未找到，使用Helvetica');
    cachedFont = new Uint8Array(0);
  }
  return cachedFont;
}

function parseColor(hex?: string): Color {
  if (!hex) return RED;
  const m = hex.match(/^#([0-9a-fA-F]{6})$/);
  if (!m) return RED;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

/**
 * 在单个PDF页面上绘制一个批注
 */
function drawAnnotation(page: PDFPage, ann: RenderAnnotation, font: any, color: Color) {
  const { width: pw, height: ph } = page.getSize();
  // PDF坐标原点在左下角，但我们的百分比从左上角算，需要翻转Y
  const toPdf = (xp: number, yp: number) => ({ x: xp * pw, y: ph - yp * ph });

  const strokeWidth = Math.max(0.5, (ann.strokeWidth ?? 2) as number) * pw / 400;
  const isCheck = ann.kind === 'check';
  const drawColor = isCheck ? GREEN : color;

  switch (ann.kind) {
    case 'check': {
      // 画√：从左下到中间再到右上
      const size = (ann.wPct ?? 0.05) * pw;
      const { x, y } = toPdf(ann.xPct - size/pw * 0.3, ann.yPct - size/ph * 0.1);
      page.drawLine({
        start: { x, y: y - size * 0.4 },
        end: { x: x + size * 0.35, y: y - size * 0.9 },
        color: drawColor,
        thickness: strokeWidth,
      });
      page.drawLine({
        start: { x: x + size * 0.35, y: y - size * 0.9 },
        end: { x: x + size, y },
        color: drawColor,
        thickness: strokeWidth,
      });
      break;
    }
    case 'cross': {
      // 画×
      const size = (ann.wPct ?? 0.05) * pw;
      const { x, y } = toPdf(ann.xPct - size/pw * 0.2, ann.yPct);
      page.drawLine({
        start: { x: x - size/2, y: y + size/2 },
        end: { x: x + size/2, y: y - size/2 },
        color: drawColor,
        thickness: strokeWidth,
      });
      page.drawLine({
        start: { x: x - size/2, y: y - size/2 },
        end: { x: x + size/2, y: y + size/2 },
        color: drawColor,
        thickness: strokeWidth,
      });
      break;
    }
    case 'score':
    case 'comment': {
      const text = ann.text || '';
      const sizeRel = ann.fontSize ? ann.fontSize / 100 : (ann.hPct ?? 0.04);
      const fontSize = sizeRel * Math.min(pw, ph) * 0.8;
      const { x, y } = toPdf(ann.xPct, ann.yPct);
      if (font) {
        const lines = text.split('\n');
        let lineY = y + fontSize * 0.3; // 基线调整
        for (const line of lines) {
          page.drawText(line, {
            x,
            y: lineY,
            size: Math.max(8, fontSize),
            font,
            color: drawColor,
          });
          lineY -= fontSize * 1.3;
        }
      }
      break;
    }
    case 'circle':
    case 'underline': {
      if (ann.wPct) {
        const { x, y } = toPdf(ann.xPct, ann.yPct);
        const w = (ann.wPct ?? 0) * pw;
        const h = (ann.hPct ?? 0.01) * ph;
        if (ann.kind === 'underline') {
          page.drawLine({
            start: { x, y },
            end: { x: x + w, y },
            color: drawColor,
            thickness: strokeWidth * 1.5,
          });
        } else {
          // 画椭圆/矩形圈
          page.drawRectangle({
            x, y: y - h,
            width: w, height: h,
            borderColor: drawColor,
            borderWidth: strokeWidth,
            color: undefined,
            opacity: 1,
          });
        }
      }
      break;
    }
    case 'freehand': {
      if (Array.isArray(ann.strokePath) && ann.strokePath.length >= 2) {
        for (let i = 1; i < ann.strokePath.length; i++) {
          const p1 = toPdf(ann.strokePath[i-1][0], ann.strokePath[i-1][1]);
          const p2 = toPdf(ann.strokePath[i][0], ann.strokePath[i][1]);
          page.drawLine({
            start: p1, end: p2,
            color: drawColor,
            thickness: strokeWidth,
          });
        }
      }
      break;
    }
  }
}

/**
 * 渲染：原卷+红批注合成PDF
 */
export async function renderMergedPdf(
  sheet: RenderSheet,
  annotations: RenderAnnotation[],
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(sheet.pdfBuffer);
  pdfDoc.registerFontkit(fontkit);

  let font: any = undefined;
  const fontBytes = await loadChineseFont();
  if (fontBytes.length > 0) {
    font = await pdfDoc.embedFont(fontBytes);
  }

  const pages = pdfDoc.getPages();

  // 按页分组批注
  const annsByPage: Record<number, RenderAnnotation[]> = {};
  for (const a of annotations) {
    if (!annsByPage[a.page]) annsByPage[a.page] = [];
    annsByPage[a.page].push(a);
  }

  for (let pi = 0; pi < pages.length; pi++) {
    const page = pages[pi];
    const anns = annsByPage[pi] || [];
    for (const ann of anns) {
      const color = parseColor(ann.color);
      drawAnnotation(page, ann, font, color);
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * 渲染：纯批注PDF（白底，用于二次进纸套打）
 * 注意：PDF不支持真正的透明背景，白底+红色批注打印时白色部分不上墨（喷墨/激光打印都是），
 * 二次进纸时原卷已有内容，白纸上只有红色墨迹会叠加上去
 */
export async function renderOverlayPdf(
  sheet: RenderSheet,
  annotations: RenderAnnotation[],
): Promise<Buffer> {
  // 先加载原PDF获取页面尺寸
  const srcDoc = await PDFDocument.load(sheet.pdfBuffer);
  const srcPages = srcDoc.getPages();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  let font: any = undefined;
  const fontBytes = await loadChineseFont();
  if (fontBytes.length > 0) {
    font = await pdfDoc.embedFont(fontBytes);
  }

  // 按页创建同尺寸空白页
  const annsByPage: Record<number, RenderAnnotation[]> = {};
  for (const a of annotations) {
    if (!annsByPage[a.page]) annsByPage[a.page] = [];
    annsByPage[a.page].push(a);
  }

  for (let pi = 0; pi < srcPages.length; pi++) {
    const src = srcPages[pi];
    const { width, height } = src.getSize();
    const page = pdfDoc.addPage([width, height]);
    // 不画任何背景 = 纯白
    const anns = annsByPage[pi] || [];
    for (const ann of anns) {
      const color = parseColor(ann.color);
      drawAnnotation(page, ann, font, color);
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

/**
 * 压测用：将同一份PDF复制N份合并为一个大PDF
 */
export async function duplicatePdf(pdfBuffer: Buffer, copies: number): Promise<Buffer> {
  const src = await PDFDocument.load(pdfBuffer);
  const dst = await PDFDocument.create();
  const srcPageCount = src.getPageCount();

  for (let c = 0; c < copies; c++) {
    const indices = Array.from({ length: srcPageCount }, (_, i) => i);
    const copied = await dst.copyPages(src, indices);
    copied.forEach(p => dst.addPage(p));
  }

  const bytes = await dst.save();
  return Buffer.from(bytes);
}
