'use client';
import React from 'react';
import { Printer, FolderOpen, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const [printerResult, setPrinterResult] = React.useState<any>(null);
  const [testing, setTesting] = React.useState(false);

  const testPrinter = async () => {
    setTesting(true);
    setPrinterResult(null);
    try {
      const r = await fetch('/api/printers/test');
      setPrinterResult(await r.json());
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold">系统设置</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Printer size={20} /> 打印机配置
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            打印机地址通过环境变量配置：<code className="bg-gray-100 px-1 rounded">PRINTER_HOST</code>,
            <code className="bg-gray-100 px-1 rounded ml-1">PRINTER_PORT</code>,
            <code className="bg-gray-100 px-1 rounded ml-1">PRINTER_PROTOCOL</code> (raw|ipp)
          </p>
          <div className="bg-gray-50 p-4 rounded text-sm font-mono">
            <div>当前配置：</div>
            <div>HOST: {process.env.NEXT_PUBLIC_PRINTER_HOST || '(从服务器环境变量读取)'}</div>
            <div>PORT: 9100 (默认RAW)</div>
            <div>PROTOCOL: raw</div>
          </div>
          <button
            onClick={testPrinter}
            disabled={testing}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {testing ? <RefreshCw className="animate-spin" size={16} /> : <Printer size={16} />}
            {testing ? '测试中...' : '测试打印机连接'}
          </button>
          {printerResult && (
            <div className={`mt-4 p-3 rounded flex items-center gap-2 text-sm ${
              printerResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {printerResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
              {printerResult.message}
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <FolderOpen size={20} /> WebDAV配置
          </h2>
          <p className="text-sm text-gray-600">
            WebDAV扫描仪文件夹通过环境变量配置：<code className="bg-gray-100 px-1 rounded">WEBDAV_BASE_URL</code>,
            <code className="bg-gray-100 px-1 rounded ml-1">WEBDAV_USER</code>,
            <code className="bg-gray-100 px-1 rounded ml-1">WEBDAV_PASS</code>,
            <code className="bg-gray-100 px-1 rounded ml-1">WEBDAV_WATCH_PATH</code>
          </p>
          <p className="text-sm text-gray-500 mt-2">
            配置后系统会自动轮询（默认60秒），扫描仪可调用webhook <code className="bg-gray-100 px-1 rounded">/api/webhooks/webdav</code> 触发即时处理
          </p>
        </section>
      </main>
    </div>
  );
}
