/**
 * 本地文件存储
 * 文件落地到 STORAGE_ROOT 目录，数据库只存相对路径 key
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const STORAGE_ROOT = process.env.STORAGE_ROOT || path.join(process.cwd(), 'data', 'storage');

export function getStorageRoot(): string {
  return STORAGE_ROOT;
}

function resolveKey(key: string): string {
  // 防止路径遍历
  const resolved = path.resolve(STORAGE_ROOT, key);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolved;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function saveBuffer(buf: Buffer, key: string): Promise<{ path: string; key: string; sizeBytes: number; checksum: string }> {
  const fullPath = resolveKey(key);
  await ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, buf);
  const checksum = crypto.createHash('sha256').update(buf).digest('hex');
  return { path: fullPath, key, sizeBytes: buf.length, checksum };
}

export async function loadBuffer(key: string): Promise<Buffer> {
  const fullPath = resolveKey(key);
  return fs.readFile(fullPath);
}

export async function fileExists(key: string): Promise<boolean> {
  try {
    await fs.access(resolveKey(key));
    return true;
  } catch {
    return false;
  }
}

export async function deleteKey(key: string): Promise<void> {
  try {
    await fs.unlink(resolveKey(key));
  } catch {
    // 不存在则忽略
  }
}

/**
 * 生成可访问的URL（通过GET /api/storage/[...key]）
 */
export function fileUrl(key: string): string {
  return `/api/storage/${key}`;
}

/**
 * 从dataURL保存文件
 */
export async function saveDataUrl(dataUrl: string, keyPrefix: string): Promise<{ path: string; key: string; sizeBytes: number; checksum: string }> {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid dataURL');
  const ext = matches[1].split('/')[1] || 'bin';
  const buf = Buffer.from(matches[2], 'base64');
  const key = `${keyPrefix}/${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext === 'jpeg' ? 'jpg' : ext}`;
  return saveBuffer(buf, key);
}

// 初始化存储根目录
ensureDir(STORAGE_ROOT).catch(console.error);
