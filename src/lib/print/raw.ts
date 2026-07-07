/**
 * RAW协议打印（TCP 9100端口）
 * 零依赖，直接用Node内置net.Socket发送PDF字节
 */
import net from 'node:net';

export interface RawPrintOptions {
  host: string;
  port?: number;
  timeoutMs?: number;
  jobName?: string;
}

/**
 * 通过RAW协议发送PDF到打印机
 * @returns Promise，resolve表示数据发送完成（socket正常关闭）
 */
export function printRaw(pdfBuffer: Buffer, options: RawPrintOptions): Promise<{ bytesSent: number }> {
  const port = options.port ?? 9100;
  const timeout = options.timeoutMs ?? 30000;
  const jobName = options.jobName || 'print-job';

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: options.host, port, timeout });

    let settled = false;
    const cleanup = () => {
      try { socket.destroy(); } catch {}
    };
    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };
    const done = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ bytesSent: pdfBuffer.length });
    };

    socket.on('connect', () => {
      // 可选发PJL头标识任务名（很多打印机忽略但不报错）
      if (jobName) {
        const safeName = jobName.replace(/[^\w一-龥-]/g, '_').slice(0, 80);
        const pjl = `@PJL JOB NAME="${safeName}"\r\n@PJL SET DUPLEX=OFF\r\n`;
        socket.write(pjl, 'ascii');
      }
      socket.write(pdfBuffer);
      socket.end();
    });
    socket.on('close', (hadError: boolean) => {
      if (!hadError) done();
    });
    socket.on('timeout', () => fail(new Error(`连接打印机超时(${timeout}ms): ${options.host}:${port}`)));
    socket.on('error', (err: Error) => fail(new Error(`打印连接错误: ${err.message}`)));
  });
}
