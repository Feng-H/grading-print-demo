/**
 * PDF光栅化 - 前端用pdfjs（已存在），服务端用sharp+pdfjs组合
 * 仅用于OCR需要图片输入时；批注PDF生成直接在原PDF上叠加（pdf-lib copyPages）无需光栅化
 */
import { saveBuffer } from '../storage/local';

// Polyfill DOMMatrix and Path2D for pdfjs-dist
if (typeof globalThis.DOMMatrix === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { DOMMatrix } = require('canvas');
  (globalThis as any).DOMMatrix = DOMMatrix;
}
if (typeof globalThis.Path2D === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Path2D } = require('canvas');
  (globalThis as any).Path2D = Path2D;
}

export interface RenderedPage {
  pageIndex: number;
  width: number;
  height: number;
  buffer: Buffer;
  dataUrl: string;
}

/**
 * 渲染PDF页为JPG - 使用pdfjs + 内置canvas依赖
 */
export async function rasterizePdf(
  pdfBuffer: Buffer,
  options: { scale?: number; quality?: number } = {},
): Promise<RenderedPage[]> {
  const scale = options.scale ?? 1.5;
  const quality = options.quality ?? 0.85;

  // 动态import避免构建时问题
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  let Canvas: any;
  try {
    Canvas = await import('canvas');
  } catch {
    throw new Error('缺少canvas依赖，服务端PDF渲染不可用');
  }

  const loadingTask = (pdfjs as any).getDocument({
    data: new Uint8Array(pdfBuffer),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    standardFontDataUrl: 'dummy/',
    cMapUrl: 'dummy/',
    cMapPacked: false,
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: RenderedPage[] = [];

  for (let i = 0; i < numPages; i++) {
    const page = await pdfDoc.getPage(i + 1);
    const viewport = page.getViewport({ scale });
    const canvas = Canvas.createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');

    const canvasFactory = {
      create: (w: number, h: number) => {
        const c = Canvas.createCanvas(w, h);
        return { canvas: c, context: c.getContext('2d') };
      },
      reset: (c: any, w: number, h: number) => { c.canvas.width = w; c.canvas.height = h; },
      destroy: () => {},
    };

    await page.render({ canvasContext: ctx, viewport, canvasFactory } as any).promise;
    const buf: Buffer = canvas.toBuffer('image/jpeg', { quality });
    pages.push({
      pageIndex: i,
      width: viewport.width,
      height: viewport.height,
      buffer: buf,
      dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}`,
    });
    page.cleanup?.();
  }
  try { pdfDoc.destroy?.(); } catch {}
  return pages;
}

export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  return pdfDoc.getPageCount();
}

/**
 * 提取PDF中指定页范围的子PDF
 */
export async function extractPdfPages(pdfBuffer: Buffer, startPage: number, endPage: number): Promise<Buffer> {
  const { PDFDocument } = await import('pdf-lib');
  const src = await PDFDocument.load(pdfBuffer);
  const dst = await PDFDocument.create();
  // 0-based -> 1-based
  const pageIndices = [];
  for (let i = startPage; i < endPage; i++) pageIndices.push(i);
  const copied = await dst.copyPages(src, pageIndices);
  copied.forEach(p => dst.addPage(p));
  const bytes = await dst.save();
  return Buffer.from(bytes);
}

/**
 * 渲染并保存到storage，返回dataURL数组供OCR使用
 */
export async function rasterizeAndSave(
  pdfBuffer: Buffer,
  keyPrefix: string,
  options?: { scale?: number; quality?: number },
): Promise<{ pages: RenderedPage[]; storageKeys: string[] }> {
  const rendered = await rasterizePdf(pdfBuffer, options);
  const storageKeys: string[] = [];
  for (const p of rendered) {
    const key = `${keyPrefix}/page-${String(p.pageIndex).padStart(3, '0')}.jpg`;
    await saveBuffer(p.buffer, key);
    storageKeys.push(key);
  }
  return { pages: rendered, storageKeys };
}
