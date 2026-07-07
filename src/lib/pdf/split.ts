/**
 * PDF拆分：将全班大PDF按每份N页拆分为单个学生试卷
 */
import { extractPdfPages, getPdfPageCount } from './rasterize';
import type { OcrResult } from '../ocr/parsePaper';

export interface SplitOptions {
  pagesPerStudent: number; // 每份试卷页数（正反面=2）
  expectedStudentCount?: number;
  ocrResult?: OcrResult; // 可选OCR结果（用于header检测验证）
}

export interface SheetRange {
  orderIndex: number;
  pageRangeStart: number;
  pageRangeEnd: number; // 不包含
  detectedName?: string;
  detectedStudentNo?: string;
  nameConfidence?: number;
  aiSplit?: boolean;
  needsReview?: boolean;
}

/**
 * 按fixed策略拆分
 */
function fixedSplit(totalPages: number, pagesPerStudent: number): SheetRange[] {
  const sheets: SheetRange[] = [];
  for (let i = 0; i < totalPages; i += pagesPerStudent) {
    sheets.push({
      orderIndex: sheets.length,
      pageRangeStart: i,
      pageRangeEnd: Math.min(i + pagesPerStudent, totalPages),
      needsReview: false,
    });
  }
  return sheets;
}

/**
 * 用OCR结果辅助拆分（检测hasHeader页作为新卷起点）
 */
function aiSplit(totalPages: number, pagesPerStudent: number, ocr: OcrResult): SheetRange[] {
  // 收集所有正面页（pageIdx为偶数，即1/3/5...页）上有header的位置
  const headerPages: number[] = [];
  for (const p of ocr.pages) {
    if (p.hasHeader && p.pageIndex % 2 === 0) {
      headerPages.push(p.pageIndex);
    }
  }

  if (headerPages.length === 0) {
    // 没检测到任何header，回退fixed
    return fixedSplit(totalPages, pagesPerStudent).map(s => ({ ...s, needsReview: true }));
  }

  const sheets: SheetRange[] = [];
  // 每份从header页开始
  for (let i = 0; i < headerPages.length; i++) {
    const start = headerPages[i];
    const end = i + 1 < headerPages.length ? headerPages[i + 1] : totalPages;
    // 找对应页的姓名
    const ocrPage = ocr.pages.find(p => p.pageIndex === start);
    sheets.push({
      orderIndex: i,
      pageRangeStart: start,
      pageRangeEnd: end,
      detectedName: ocrPage?.detectedName,
      detectedStudentNo: ocrPage?.detectedStudentNo,
      nameConfidence: ocrPage?.detectedName ? 0.7 : 0.3,
      aiSplit: true,
      needsReview: Math.abs((end - start) - pagesPerStudent) > 1, // 页数和预期差异大标记需复审
    });
  }
  return sheets;
}

/**
 * 拆分PDF为多个学生试卷
 * @param pdfBuffer 原始PDF buffer
 * @param options 拆分选项
 * @returns sheets 拆分信息 + 每份PDF buffer
 */
export async function splitPdf(
  pdfBuffer: Buffer,
  options: SplitOptions,
): Promise<{ sheets: Array<SheetRange & { pdfBuffer: Buffer }>; strategy: string }> {
  const totalPages = await getPdfPageCount(pdfBuffer);
  const { pagesPerStudent = 2, ocrResult, expectedStudentCount } = options;

  let sheets: SheetRange[];
  let strategy = 'fixed';

  if (ocrResult) {
    sheets = aiSplit(totalPages, pagesPerStudent, ocrResult);
    strategy = 'ai';
  } else {
    sheets = fixedSplit(totalPages, pagesPerStudent);
  }

  // 校验：如果预期学生数和拆分份数差太多，标记needsReview
  if (expectedStudentCount && Math.abs(sheets.length - expectedStudentCount) > 1) {
    // 重新调整pagesPerStudent
    const adjusted = Math.round(totalPages / expectedStudentCount);
    if (adjusted !== pagesPerStudent && adjusted >= 1) {
      sheets = fixedSplit(totalPages, adjusted);
      sheets.forEach(s => s.needsReview = true);
      strategy = `fixed-adjusted(${adjusted}pp)`;
    } else {
      sheets.forEach(s => s.needsReview = true);
    }
  }

  // 提取每份PDF
  const result = [];
  for (const s of sheets) {
    const buf = await extractPdfPages(pdfBuffer, s.pageRangeStart, s.pageRangeEnd);
    result.push({ ...s, pdfBuffer: buf });
  }

  return { sheets: result, strategy };
}
