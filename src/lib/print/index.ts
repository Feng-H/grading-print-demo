/**
 * 打印模块统一入口
 */
import { printRaw, RawPrintOptions } from './raw';
import { printIpp, probeIppPdfSupport, IppPrintOptions } from './ipp';

export type PrintProtocol = 'raw' | 'ipp';

export interface PrintOptions {
  host: string;
  port?: number;
  protocol?: PrintProtocol;
  timeoutMs?: number;
  jobName?: string;
  username?: string;
}

export async function printPdf(pdfBuffer: Buffer, options: PrintOptions): Promise<{ bytesSent?: number; jobId?: number; protocol: PrintProtocol }> {
  const proto = options.protocol ?? process.env.PRINTER_PROTOCOL ?? 'raw';

  if (proto === 'raw') {
    const res = await printRaw(pdfBuffer, {
      host: options.host,
      port: options.port ?? Number(process.env.PRINTER_PORT ?? 9100),
      timeoutMs: options.timeoutMs ?? Number(process.env.PRINTER_TIMEOUT_MS ?? 30000),
      jobName: options.jobName,
    });
    return { ...res, protocol: 'raw' };
  } else if (proto === 'ipp') {
    const res = await printIpp(pdfBuffer, {
      host: options.host,
      port: options.port ?? 631,
      timeoutMs: options.timeoutMs ?? 60000,
      jobName: options.jobName,
      username: options.username,
    });
    return { ...res, protocol: 'ipp' };
  } else {
    throw new Error(`不支持的打印协议: ${proto}`);
  }
}

export async function testPrinter(options: PrintOptions): Promise<{ success: boolean; protocol: PrintProtocol; message: string; pdfSupported?: boolean }> {
  const proto = options.protocol ?? (process.env.PRINTER_PROTOCOL as PrintProtocol) ?? 'raw';
  try {
    if (proto === 'ipp') {
      const probe = await probeIppPdfSupport({
        host: options.host, port: options.port ?? 631, timeoutMs: options.timeoutMs ?? 10000,
      });
      return {
        success: true, protocol: 'ipp',
        message: probe.supported ? 'IPP打印机可连接，支持PDF Direct Print' : 'IPP打印机可连接，但不报告支持PDF格式，请确认打印机能力',
        pdfSupported: probe.supported,
      };
    } else {
      // RAW协议无法探测，返回配置信息让用户验证
      return {
        success: true, protocol: 'raw',
        message: `RAW协议已配置(${options.host}:${options.port ?? 9100})，请用实际打印任务验证。要求打印机支持PDF Direct Print。`,
      };
    }
  } catch (err: any) {
    return { success: false, protocol: proto, message: `连接失败: ${err.message}` };
  }
}

export { printRaw, printIpp, probeIppPdfSupport };
