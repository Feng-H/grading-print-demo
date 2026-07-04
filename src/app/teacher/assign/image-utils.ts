"use client";

// 读取JPEG的EXIF方向信息
function getExifOrientation(arrayBuffer: ArrayBuffer): number {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 2 || view.getUint16(0) !== 0xFFD8) return 1; // 不是JPEG
  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xFF) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xE1) {
      // APP1 - EXIF
      if (view.getUint32(offset + 4) !== 0x45786966) return 1; // 无Exif
      const little = view.getUint16(offset + 10) === 0x4949;
      const tiffOffset = offset + 10;
      const get16 = (p: number) => little ? view.getUint16(p, true) : view.getUint16(p);
      const get32 = (p: number) => little ? view.getUint32(p, true) : view.getUint32(p);
      let ifd0 = get32(tiffOffset + 4);
      const ifd0Start = tiffOffset + ifd0;
      if (ifd0Start + 2 > view.byteLength) return 1;
      const entries = get16(ifd0Start);
      for (let i = 0; i < entries; i++) {
        const entryOffset = ifd0Start + 2 + i * 12;
        if (entryOffset + 8 > view.byteLength) break;
        const tag = get16(entryOffset);
        if (tag === 0x0112) {
          return get16(entryOffset + 8);
        }
      }
      return 1;
    } else if (marker === 0xDA || marker === 0xD9) {
      break;
    } else {
      offset += 2 + view.getUint16(offset + 2);
    }
  }
  return 1;
}

// 根据EXIF方向绘制旋转后的图片
function drawOrientedImage(img: HTMLImageElement, orientation: number, maxDim: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  let w = img.naturalWidth;
  let h = img.naturalHeight;

  // 根据方向设置canvas尺寸
  if (orientation >= 5 && orientation <= 8) {
    canvas.width = h;
    canvas.height = w;
    [w, h] = [h, w];
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  // 应用旋转变换
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.transform(0, 1, -1, 0, h, 0); break;
    case 7: ctx.transform(0, -1, -1, 0, h, w); break;
    case 8: ctx.transform(0, -1, 1, 0, 0, w); break;
    default: break;
  }
  ctx.drawImage(img, 0, 0);

  // 如果需要缩放，再做一次
  if (canvas.width > maxDim || canvas.height > maxDim) {
    let nw = canvas.width, nh = canvas.height;
    if (nw > nh) {
      nh = Math.round((nh * maxDim) / nw);
      nw = maxDim;
    } else {
      nw = Math.round((nw * maxDim) / nh);
      nh = maxDim;
    }
    const resized = document.createElement('canvas');
    resized.width = nw;
    resized.height = nh;
    const rctx = resized.getContext('2d')!;
    rctx.drawImage(canvas, 0, 0, nw, nh);
    return resized;
  }
  return canvas;
}

// 自动方向检测（启发式：试卷通常是宽>高横向 或 高>宽纵向，但文字应该水平）
// 基础版：先用EXIF方向校正；如果宽高比异常（如A3横拍但存成竖图），提供旋转按钮让用户手动校正
export async function loadAndAutoOrient(file: File | Blob): Promise<{ canvas: HTMLCanvasElement; orientation: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const orientation = getExifOrientation(arrayBuffer);

      const img = new Image();
      const blob = new Blob([arrayBuffer]);
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = drawOrientedImage(img, orientation, 10000); // 大尺寸先不压缩
        URL.revokeObjectURL(url);
        resolve({ canvas, orientation });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load error')); };
      img.src = url;
    };
    reader.onerror = () => reject(new Error('file read error'));
    reader.readAsArrayBuffer(file);
  });
}

// 压缩图片：自动方向校正+缩放+JPEG压缩
export async function compressImage(
  file: File | Blob,
  maxDim: number = 1600,
  quality: number = 0.8
): Promise<{ dataUrl: string; rotated: boolean }> {
  const { canvas, orientation } = await loadAndAutoOrient(file);
  // 缩放
  let w = canvas.width, h = canvas.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
    const resized = document.createElement('canvas');
    resized.width = w;
    resized.height = h;
    const ctx = resized.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, w, h);
    return { dataUrl: resized.toDataURL('image/jpeg', quality), rotated: orientation > 1 };
  }
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), rotated: orientation > 1 };
}

// 手动旋转canvas 90度
export function rotateCanvas90(srcCanvas: HTMLCanvasElement, clockwise: boolean = true): string {
  const dst = document.createElement('canvas');
  dst.width = srcCanvas.height;
  dst.height = srcCanvas.width;
  const ctx = dst.getContext('2d')!;
  if (clockwise) {
    ctx.translate(dst.width, 0);
    ctx.rotate(Math.PI / 2);
  } else {
    ctx.translate(0, dst.height);
    ctx.rotate(-Math.PI / 2);
  }
  ctx.drawImage(srcCanvas, 0, 0);
  return dst.toDataURL('image/jpeg', 0.8);
}

export function dataUrlSizeKB(url: string): number {
  const base64 = url.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4 / 1024);
}
