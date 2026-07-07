'use client';
import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

interface Sheet {
  id: string;
  orderIndex: number;
  pageImagePaths: string[];
  detectedName?: string | null;
  detectedStudentNo?: string | null;
  status: string;
  submission?: { id: string; status: string; totalScore?: number | null } | null;
  student?: { id: string; name: string; studentNo: string } | null;
  orderIndex_num?: number;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  queued: { icon: <Clock size={16} />, color: 'text-gray-500', label: '等待中' },
  ocr: { icon: <Clock size={16} className="animate-pulse" />, color: 'text-blue-500', label: 'OCR识别中' },
  grading: { icon: <Clock size={16} className="animate-pulse" />, color: 'text-blue-500', label: '批改中' },
  annotated: { icon: <Clock size={16} />, color: 'text-yellow-500', label: '批注生成中' },
  rendered: { icon: <CheckCircle2 size={16} />, color: 'text-green-500', label: '待复核' },
  needs_review: { icon: <AlertCircle size={16} />, color: 'text-orange-500', label: '待复核' },
  approved: { icon: <CheckCircle2 size={16} />, color: 'text-emerald-600', label: '待打印' },
  printing: { icon: <Clock size={16} className="animate-pulse" />, color: 'text-blue-600', label: '打印中' },
  printed: { icon: <CheckCircle2 size={16} />, color: 'text-green-700', label: '已打印' },
  failed: { icon: <XCircle size={16} />, color: 'text-red-600', label: '失败' },
};

export default function SheetCard({ sheet }: { sheet: Sheet }) {
  const thumb = sheet.pageImagePaths[0];
  const stat = statusConfig[sheet.status] || statusConfig.queued;
  const studentName = sheet.student?.name || sheet.detectedName || '未识别';

  return (
    <Link
      href={sheet.submission ? `/teacher/submissions/${sheet.submission.id}/review` : '#'}
      className={`block bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition ${
        !sheet.submission ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
        {thumb && <img src={`/api/storage/${thumb}`} alt="" className="w-full h-full object-cover" />}
        <div className={`absolute top-2 right-2 flex items-center gap-1 bg-white/90 px-2 py-0.5 rounded-full text-xs ${stat.color}`}>
          {stat.icon}
          <span>{stat.label}</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-white text-xs">
          #{sheet.orderIndex + 1}
        </div>
      </div>
      <div className="p-2">
        <div className="font-medium text-sm truncate">{studentName}</div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-gray-500">
            {sheet.submission?.totalScore != null ? `${sheet.submission.totalScore}分` : ''}
          </span>
          {sheet.submission?.status === 'failed' && (
            <span className="text-xs text-red-500">失败</span>
          )}
        </div>
      </div>
    </Link>
  );
}
