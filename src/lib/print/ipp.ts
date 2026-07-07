/**
 * IPP协议打印（TCP 631端口）
 * 使用ipp库发送HTTP IPP请求
 */
import ipp from 'ipp';

export interface IppPrintOptions {
  host: string;
  port?: number;
  path?: string;
  timeoutMs?: number;
  jobName?: string;
  username?: string;
}

/**
 * 探测打印机是否支持PDF
 */
export async function probeIppPdfSupport(options: IppPrintOptions): Promise<{ supported: boolean; formats: string[] }> {
  const port = options.port ?? 631;
  const path = options.path ?? '/ipp/print';
  const uri = `http://${options.host}:${port}${path}`;

  return new Promise((resolve, reject) => {
    try {
      const printer = ipp.Printer(uri);
      const timeout = setTimeout(() => reject(new Error('IPP探测超时')), options.timeoutMs ?? 10000);
      printer.execute('Get-Printer-Attributes', {
        'operation-attributes-tag': {
          'requested-attributes': ['document-format-supported'],
        },
      }, (err: any, res: any) => {
        clearTimeout(timeout);
        if (err) return reject(err);
        const formats: string[] = res?.['printer-attributes-tag']?.['document-format-supported'] || [];
        resolve({
          supported: formats.includes('application/pdf'),
          formats,
        });
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * 通过IPP协议发送PDF到打印机
 */
export function printIpp(pdfBuffer: Buffer, options: IppPrintOptions): Promise<{ jobId?: number; jobState?: string }> {
  const port = options.port ?? 631;
  const path = options.path ?? '/ipp/print';
  const uri = `http://${options.host}:${port}${path}`;

  return new Promise((resolve, reject) => {
    try {
      const printer = ipp.Printer(uri);
      const timeout = setTimeout(() => reject(new Error(`IPP打印超时: ${options.host}:${port}`)), options.timeoutMs ?? 60000);

      const msg: any = {
        'operation-attributes-tag': {
          'requesting-user-name': options.username ?? 'schoolwork',
          'job-name': options.jobName ?? 'swp-print',
          'document-format': 'application/pdf',
        },
        data: pdfBuffer,
      };

      printer.execute('Print-Job', msg, (err: any, res: any) => {
        clearTimeout(timeout);
        if (err) return reject(new Error(`IPP打印失败: ${err.message || err}`));
        const attrs = res?.['job-attributes-tag'] || {};
        resolve({
          jobId: attrs['job-id'],
          jobState: attrs['job-state'],
        });
      });
    } catch (e: any) {
      reject(e);
    }
  });
}
