/**
 * WebDAV客户端
 * 从扫描仪WebDAV文件夹拉取新PDF
 */
import { createClient, WebDAVClient } from 'webdav';

let client: WebDAVClient | null = null;

function getClient(): WebDAVClient {
  if (client) return client;
  const baseUrl = process.env.WEBDAV_BASE_URL;
  if (!baseUrl) throw new Error('未配置WEBDAV_BASE_URL');
  client = createClient(baseUrl, {
    username: process.env.WEBDAV_USER,
    password: process.env.WEBDAV_PASS,
  });
  return client;
}

export interface WebdavFileStat {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
}

export async function listNewFiles(path?: string, sinceMtime?: Date): Promise<WebdavFileStat[]> {
  const watchPath = path ?? process.env.WEBDAV_WATCH_PATH ?? '/';
  const c = getClient();
  const contents = await c.getDirectoryContents(watchPath) as WebdavFileStat[];
  if (!Array.isArray(contents)) return [];

  const pdfs = contents.filter(f => {
    if (f.type !== 'file') return false;
    if (!f.filename.toLowerCase().endsWith('.pdf')) return false;
    if (sinceMtime) {
      const mtime = new Date(f.lastmod);
      if (mtime <= sinceMtime) return false;
    }
    return true;
  });
  return pdfs;
}

export async function downloadFile(remotePath: string): Promise<Buffer> {
  const c = getClient();
  const buf = await c.getFileContents(remotePath, { format: 'binary' }) as Buffer;
  return buf;
}

/**
 * 标记文件已处理：移动到archive子目录
 */
export async function markProcessed(remotePath: string): Promise<void> {
  const c = getClient();
  const parts = remotePath.split('/');
  const filename = parts.pop();
  const dir = parts.join('/') || '/';
  const archiveDir = `${dir}/archive`;
  try {
    const exists = await c.exists(archiveDir);
    if (!exists) await c.createDirectory(archiveDir);
  } catch {}
  try {
    await c.moveFile(remotePath, `${archiveDir}/${Date.now()}-${filename}`);
  } catch (err: any) {
    console.warn('[webdav] 移动已处理文件失败:', err.message);
  }
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    if (!process.env.WEBDAV_BASE_URL) return { ok: false, message: '未配置WEBDAV_BASE_URL' };
    const c = getClient();
    const stat = await c.exists(process.env.WEBDAV_WATCH_PATH || '/');
    if (!stat) return { ok: false, message: '监控路径不存在' };
    return { ok: true, message: 'WebDAV连接成功' };
  } catch (err: any) {
    return { ok: false, message: `连接失败: ${err.message}` };
  }
}
