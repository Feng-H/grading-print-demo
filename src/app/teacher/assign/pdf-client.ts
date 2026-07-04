"use client";

// 客户端PDF工具：将PDF File渲染成dataURL图片数组
// 注意：pdfjs-dist需要在客户端动态import以避免SSR问题

let pdfjsLib: any = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  // 动态import worker
  const pdfjs = await import('pdfjs-dist');
  // 使用CDN worker（V5+版本需显式配置）
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  pdfjsLib = pdfjs;
  return pdfjs;
}

export async function pdfToDataUrls(file: File, scale = 1.2): Promise<string[]> {
  const pdfjs = await getPdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const results: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    results.push(canvas.toDataURL('image/jpeg', 0.75));
  }
  return results;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
