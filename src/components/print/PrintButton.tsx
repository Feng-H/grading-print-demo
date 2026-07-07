'use client';
import React from 'react';
import { Printer, Download, Zap } from 'lucide-react';

interface Props {
  submissionId: string;
  pdfs: Array<{ id: string; kind: string; url: string; sizeBytes: number }>;
  onPrint?: () => void;
}

export default function PrintButton({ submissionId, pdfs, onPrint }: Props) {
  const [loading, setLoading] = React.useState<string | null>(null);
  const [stressOpen, setStressOpen] = React.useState(false);
  const [stressCopies, setStressCopies] = React.useState(50);

  const merged = pdfs.find(p => p.kind === 'merged');
  const overlay = pdfs.find(p => p.kind === 'overlay');

  const handlePrint = async (kind: 'merged' | 'overlay') => {
    setLoading(kind);
    try {
      const res = await fetch(`/api/submissions/${submissionId}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`已发送到打印机 (Job: ${data.printJobId.slice(0,8)})`);
      onPrint?.();
    } catch (err: any) {
      alert('打印失败: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleStressTest = async () => {
    if (!confirm(`将复制${stressCopies}份生成大PDF一次性发送，确认开始压测？`)) return;
    setLoading('stress');
    try {
      const res = await fetch(`/api/print/stress-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, kind: 'merged', copies: stressCopies }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`压测任务已创建(${stressCopies}份)，可在打印队列查看进度`);
      setStressOpen(false);
      onPrint?.();
    } catch (err: any) {
      alert('压测失败: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  if (pdfs.length === 0) {
    return <span className="text-sm text-gray-400">PDF渲染中...</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handlePrint('merged')}
          disabled={!!loading || !merged}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          <Printer size={18} />
          {loading === 'merged' ? '发送中...' : '打印 原卷+批注'}
        </button>
        <button
          onClick={() => handlePrint('overlay')}
          disabled={!!loading || !overlay}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          <Printer size={18} />
          {loading === 'overlay' ? '发送中...' : '打印 纯批注（套打）'}
        </button>
      </div>

      <div className="flex flex-col gap-1 pt-2 border-t">
        <div className="text-xs text-gray-500">下载：</div>
        {merged && (
          <a
            href={merged.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Download size={14} /> 原卷+批注.pdf ({Math.round(merged.sizeBytes/1024)}KB)
          </a>
        )}
        {overlay && (
          <a
            href={overlay.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Download size={14} /> 纯批注套打.pdf ({Math.round(overlay.sizeBytes/1024)}KB)
          </a>
        )}
      </div>

      <div className="pt-2 border-t">
        {!stressOpen ? (
          <button
            onClick={() => setStressOpen(true)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 rounded"
          >
            <Zap size={14} /> 打印压测
          </button>
        ) : (
          <div className="space-y-2 p-2 bg-orange-50 rounded">
            <div className="text-xs text-orange-800">将同一份PDF复制N份合并为大文件发送，测试网络稳定性</div>
            <input
              type="number" min={1} max={500} value={stressCopies}
              onChange={e => setStressCopies(Number(e.target.value))}
              className="w-full px-2 py-1 text-sm border rounded"
            />
            <div className="flex gap-2">
              <button onClick={handleStressTest} disabled={loading==='stress'}
                className="flex-1 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50">
                {loading==='stress'?'测试中...':`开始压测 (${stressCopies}份)`}
              </button>
              <button onClick={() => setStressOpen(false)}
                className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
