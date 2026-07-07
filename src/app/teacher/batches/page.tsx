'use client';
import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Upload, FileText, RefreshCw } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const statusColors: Record<string, string> = {
  uploading: 'bg-gray-100 text-gray-600',
  splitting: 'bg-blue-100 text-blue-700',
  ocr: 'bg-blue-100 text-blue-700',
  grading: 'bg-blue-100 text-blue-700',
  annotating: 'bg-yellow-100 text-yellow-700',
  rendering: 'bg-yellow-100 text-yellow-700',
  ready: 'bg-green-100 text-green-700',
  partial: 'bg-orange-100 text-orange-700',
  failed: 'bg-red-100 text-red-700',
};

export default function BatchesPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/batches', fetcher, { refreshInterval: 5000 });
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('pagesPerStudent', '2');
      const res = await fetch('/api/batches', { method: 'POST', body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      mutate();
      if (d.batchId) {
        window.location.href = `/teacher/batches/${d.batchId}`;
      }
    } catch (err: any) {
      alert('上传失败: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">扫描批次</h1>
          <div className="flex gap-2">
            <button onClick={() => mutate()} className="px-3 py-2 border rounded hover:bg-gray-50 flex items-center gap-1">
              <RefreshCw size={16} /> 刷新
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Upload size={16} /> {uploading ? '上传中...' : '上传试卷PDF'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading && <div className="text-center py-10">加载中...</div>}
        {error && <div className="text-center py-10 text-red-500">加载失败</div>}
        {data?.batches?.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <FileText size={64} className="mx-auto mb-4 opacity-30" />
            <p>还没有扫描批次</p>
            <p className="text-sm mt-2">点击右上角"上传试卷PDF"或配置WebDAV自动扫描</p>
          </div>
        )}
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 text-sm text-gray-600">
              <tr>
                <th className="text-left p-3">时间</th>
                <th className="text-left p-3">来源</th>
                <th className="text-left p-3">班级</th>
                <th className="text-left p-3">页数/份数</th>
                <th className="text-left p-3">状态</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {data?.batches?.map((b: any) => (
                <tr key={b.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-sm">{new Date(b.createdAt).toLocaleString('zh-CN')}</td>
                  <td className="p-3 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs ${b.sourceType==='webdav'?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-700'}`}>
                      {b.sourceType === 'webdav' ? '扫描仪' : '手动上传'}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{b.class ? `${b.class.grade} ${b.class.name}` : '-'}</td>
                  <td className="p-3 text-sm">{b.pageCount}页 / {b._count.sheets}份</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[b.status] || 'bg-gray-100'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Link href={`/teacher/batches/${b.id}`} className="text-sm text-blue-600 hover:underline">
                      查看详情 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
