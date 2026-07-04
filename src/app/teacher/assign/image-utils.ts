"use client";

// 客户端图片压缩：把大图缩放到合适尺寸并压缩质量，返回jpeg dataURL
export async function compressImage(
  file: File | Blob,
  maxDim: number = 1600,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        // 等比缩放
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas error'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('image load error'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('file read error'));
    reader.readAsDataURL(file);
  });
}

// 计算dataURL大小（KB）
export function dataUrlSizeKB(url: string): number {
  const base64 = url.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4 / 1024);
}
