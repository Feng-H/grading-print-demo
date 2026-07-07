'use client';
import React from 'react';
import useSWR from 'swr';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Printer, Zap } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function PrintQueue() {
  const { data, error, mutate, isLoading } = useSWR('/api/print-jobs', fetcher, {
    refreshInterval: 3000,
  });
  const [filterStress, setFilterStress] = React.useState(false);

  const jobs = (data?.jobs || []).filter((j: any) => filterStress ? j.isStressTest : !j.isStressTest);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      case 'failed': return <AlertCircle size={16} className="text-red-600" />;
      case 'printing': return <Printer size={16} className="text-blue-600 animate-pulse" />;
      case 'generating': return <RefreshCw size={16} className="text-orange-600 animate-spin" />;
      case 'canceled': return <AlertCircle size={16} className="text-gray-400" />;
      default: return <Clock size={16} className="text-gray-500" />;
    }
  };

  const statusLabel: Record<string, string> = {
    pending: '等待中', generating: '生成大PDF中', printing: '打印中',
    success: '已完成', failed: '失败', canceled: '已取消',
  };

  const handleRetry = async (id: string) => {
    await fetch(`/api/print-jobs/${id}/retry`, { method: 'POST' });
    mutate();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('取消此打印任务？')) return;
    await fetch(`/api/print-jobs/${id}`, { method: 'DELETE' });
    mutate();
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Printer size={18} /> 打印队列
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStress(!filterStress)}
            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${filterStress ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}
          >
            <Zap size={12} /> 压测任务
          </button>
          <button onClick={() => mutate()} className="text-gray-500 hover:text-gray-700 p-1">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {isLoading && <div className="text-sm text-gray-500 py-4">加载中...</div>}
      {error && <div className="text-sm text-red-500">加载失败</div>}

      {jobs.length === 0 && !isLoading && (
        <div className="text-sm text-gray-400 py-4 text-center">暂无打印任务</div>
      )}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {jobs.map((j: any) => (
          <div key={j.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {statusIcon(j.status)}
              <div className="truncate">
                <div className="font-medium truncate flex items-center gap-1">
                  {j.isStressTest && <Zap size={12} className="text-orange-500" />}
                  {j.isStressTest ? `压测 ${j.stressTestCopies}份` : (j.submission?.sheet?.detectedName || `作业${j.id.slice(0,6)}`)}
                </div>
                <div className="text-xs text-gray-500">
                  {statusLabel[j.status] || j.status}
                  {j.fileSizeBytes ? ` · ${Math.round(j.fileSizeBytes/1024/1024*10)/10}MB` : ''}
                  {j.lastError ? ` · ${j.lastError.slice(0,30)}` : ''}
                </div>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0 ml-2">
              {j.status === 'failed' && (
                <button onClick={() => handleRetry(j.id)} className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded">重试</button>
              )}
              {(j.status === 'pending') && (
                <button onClick={() => handleCancel(j.id)} className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">取消</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
