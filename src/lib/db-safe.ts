// 安全的数据库访问包装器：DB未配置/连接失败时返回null，调用方回退到mock
import prisma from './prisma';

let dbAvailable: boolean | null = null;

export async function isDbAvailable(): Promise<boolean> {
  if (dbAvailable !== null) return dbAvailable;
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('postgres://...')) {
    dbAvailable = false;
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
    return true;
  } catch {
    dbAvailable = false;
    return false;
  }
}

export async function withDbFallback<T = any>(fn: () => Promise<T>, fallback: T): Promise<any> {
  if (!(await isDbAvailable())) return fallback;
  try {
    return await fn();
  } catch (e) {
    console.error('[DB] fallback due to error:', (e as Error).message);
    return fallback;
  }
}

export { prisma };

// 演示数据（数据库未就绪时使用）
export const DEMO_CLASSES = [
  { id: 'class-c1', name: '三年级2班', grade: '三年级', subject: '数学', studentCount: 45 },
];

export const DEMO_STUDENTS = [
  { id: 's1', name: '张小明', avatar: '👦', classId: 'class-c1', className: '三年级2班', studentNo: '001', parentId: 'demo-parent' },
  { id: 's2', name: '李小红', avatar: '👧', classId: 'class-c1', className: '三年级2班', studentNo: '002', parentId: null },
  { id: 's3', name: '王小华', avatar: '👦', classId: 'class-c1', className: '三年级2班', studentNo: '003', parentId: null },
  { id: 's4', name: '赵小丽', avatar: '👧', classId: 'class-c1', className: '三年级2班', studentNo: '004', parentId: null },
  { id: 's5', name: '陈小强', avatar: '👦', classId: 'class-c1', className: '三年级2班', studentNo: '005', parentId: null },
];
