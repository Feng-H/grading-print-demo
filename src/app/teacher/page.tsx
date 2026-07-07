'use client';

import React from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Upload, Clock, AlertCircle, CheckCircle, Printer, Plus, FileText, Settings, Zap } from 'lucide-react';
import PrintQueue from '@/components/print/PrintQueue';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function TeacherDashboard() {
  const { data: batchesData } = useSWR('/api/batches', fetcher, { refreshInterval: 5000 });
  const batches = batchesData?.batches || [];

  const needsReview = batches.flatMap((b: any) =>
    (b.sheets || []).filter((s: any) => ['needs_review', 'rendered'].includes(s.status) && s.submission)
  );
  const inProgress = batches.filter((b: any) =>
    ['uploading', 'splitting', 'ocr', 'grading', 'annotating', 'rendering'].includes(b.status)
  );
  const approved = batches.flatMap((b: any) =>
    (b.sheets || []).filter((s: any) => s.status === 'approved' || s.status === 'printing')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">老师工作台</h1>
            <p className="text-sm text-gray-500 mt-1">试卷智能批改 · 红笔批注 · 远程打印</p>
          </div>
          <div className="flex gap-2">
            <Link href="/teacher/batches" className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <FileText size={16} /> 批次列表
            </Link>
            <Link href="/teacher/batches" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
              <Upload size={16} /> 上传试卷批改
            </Link>
            <Link href="/teacher/settings" className="p-2 border rounded-lg hover:bg-gray-50" title="设置">
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 快速入口 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<AlertCircle className="text-orange-500" size={24} />}
            label="待复核"
            value={needsReview.length}
            href="/teacher/batches"
            color="orange"
          />
          <StatCard
            icon={<Clock className="text-blue-500" size={24} />}
            label="批改中"
            value={inProgress.length}
            color="blue"
            processing
          />
          <StatCard
            icon={<CheckCircle className="text-emerald-500" size={24} />}
            label="待打印/打印中"
            value={approved.length}
            href="/teacher/batches"
            color="emerald"
          />
          <StatCard
            icon={<Printer className="text-purple-500" size={24} />}
            label="总批次"
            value={batches.length}
            href="/teacher/batches"
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 待复核列表 */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-lg border shadow-sm p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-orange-500" /> 待复核（可批改/批注/打印）
              </h2>
              {needsReview.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">暂无待复核试卷</div>
              ) : (
                <div className="space-y-2">
                  {needsReview.slice(0, 10).map((s: any) => (
                    <Link
                      key={s.submission.id}
                      href={`/teacher/submissions/${s.submission.id}/review`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition"
                    >
                      <div>
                        <div className="font-medium">
                          #{s.orderIndex + 1} · {s.student?.name || s.detectedName || '未识别学生'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">得分: {s.submission.totalScore ?? '批改中'}</div>
                      </div>
                      <div className="text-sm text-blue-600">去复核 →</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white rounded-lg border shadow-sm p-4">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Clock size={18} className="text-blue-500" /> 最近批次
              </h2>
              {batches.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <Plus size={32} className="mx-auto mb-2 opacity-30" />
                  暂无批次，上传PDF开始批改
                </div>
              ) : (
                <div className="space-y-2">
                  {batches.slice(0, 5).map((b: any) => (
                    <Link
                      key={b.id}
                      href={`/teacher/batches/${b.id}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {b.class ? `${b.class.grade} ${b.class.name}` : b.sourceType === 'webdav' ? '扫描仪上传' : '手动上传'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {new Date(b.createdAt).toLocaleString('zh-CN')} · {b._count?.sheets || 0}份
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          b.status === 'ready' ? 'bg-green-100 text-green-700' :
                          b.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* 打印队列 */}
          <div>
            <PrintQueue />

            <div className="mt-4 bg-white rounded-lg border shadow-sm p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap size={16} className="text-orange-500" /> 快捷操作
              </h3>
              <div className="space-y-2">
                <Link href="/teacher/analytics" className="block text-sm px-3 py-2 hover:bg-gray-50 rounded">📊 学情分析</Link>
                <Link href="/teacher/assign" className="block text-sm px-3 py-2 hover:bg-gray-50 rounded">📝 旧版手动批改（兼容）</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, href, color, processing }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
  color: string;
  processing?: boolean;
}) {
  const bgColors: Record<string, string> = {
    orange: 'hover:border-orange-300',
    blue: 'hover:border-blue-300',
    emerald: 'hover:border-emerald-300',
    purple: 'hover:border-purple-300',
  };
  const content = (
    <div className={`bg-white rounded-lg border shadow-sm p-4 transition ${href ? bgColors[color] : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-3xl font-bold mt-1 flex items-center gap-2">
            {value}
            {processing && value > 0 && (
              <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
            )}
          </div>
        </div>
        {icon}
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
