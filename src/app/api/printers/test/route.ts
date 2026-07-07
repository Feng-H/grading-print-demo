/**
 * GET /api/printers/test - 测试打印机连接
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { testPrinter } from '@/lib/print';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'teacher') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const host = process.env.PRINTER_HOST;
    if (!host) {
      return NextResponse.json({ success: false, message: '未配置PRINTER_HOST' });
    }

    const result = await testPrinter({
      host,
      port: Number(process.env.PRINTER_PORT ?? 9100),
      protocol: (process.env.PRINTER_PROTOCOL as any) || 'raw',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message });
  }
}
