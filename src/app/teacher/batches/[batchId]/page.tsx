'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import SheetCard from '@/components/batches/SheetCard';
import { ChevronLeft, Upload, RotateCw, Settings } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function BatchDetailPage() {
  const params = useParams();
  const batchId = params.batchId as string;

  const { data, error, isLoading, mutate } = useSWR(
    batchId ? `/api/batches/${batchId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  if (isLoading) return <div className="p-8 text-center">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">加载失败</div>;
  const { batch } = data;

  const allDone = batch.sheets.every((s: any) =>
    ['rendered', 'needs_review', 'approved', 'printed', 'failed'].includes(s.status)
  );
  const failedCount = batch.sheets.filter((s: any) => s.status === 'failed').length;

  const handleResplit = async () => {
    const pages = prompt('重新拆分：每份试卷几页？', String(batch.pagesPerStudent || 2));
    if (!pages) return;
    await fetch(`/api/batches/${batchId}/resplit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagesPerStudent: Number(pages) }),
    });
    mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/teacher" className="p-2 hover:bg-gray-100 rounded">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold">批次详情</h1>
              <p className="text-sm text-gray-500">
                {new Date(batch.createdAt).toLocaleString('zh-CN')} · {batch.pageCount}页 · {batch.sheets.length}份
                {batch.class?.name && ` · ${batch.class.grade} ${batch.class.name}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className={`px-3 py-1 rounded-full text-sm ${
              batch.status === 'ready' ? 'bg-green-100 text-green-700' :
              batch.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
              batch.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {batch.status === 'uploading' ? '上传中' :
               batch.status === 'splitting' ? '拆分中' :
               batch.status === 'ocr' ? '识别中' :
               batch.status === 'grading' ? '批改中' :
               batch.status === 'annotating' ? '生成批注' :
               batch.status === 'rendering' ? '渲染PDF' :
               batch.status === 'ready' ? '处理完成' :
               batch.status === 'partial' ? `部分完成(${failedCount}失败)` :
               batch.status}
              {!allDone && <RotateCw size={12} className="inline ml-1 animate-spin" />}
            </div>
            <button onClick={handleResplit} className="text-sm px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1">
              <Settings size={14} /> 重新拆分
            </button>
            <button onClick={() => mutate()} className="text-sm px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1">
              <RotateCw size={14} /> 刷新
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {batch.sheets.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Upload size={48} className="mx-auto mb-4 opacity-30" />
            暂无试卷
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {batch.sheets.map((s: any) => (
              <SheetCard key={s.id} sheet={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
