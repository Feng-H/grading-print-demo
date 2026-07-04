'use client';

import Link from 'next/link';
import { BookOpen, FileText, TrendingUp, Calendar, ChevronRight, Sparkles } from 'lucide-react';
import { currentParent, students, homeworkList, sampleGradingResults } from '@/lib/mock-data';

export default function ParentHome() {
  const child = currentParent.children[0];
  const recentHomework = [
    { ...homeworkList[0], score: 61, status: '已批改', date: '2026-07-02' },
    { ...homeworkList[1], score: 76, status: '已批改', date: '2026-06-27' },
    { ...homeworkList[2], score: 82, status: '已批改', date: '2026-06-20' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 孩子信息卡片 */}
      <Link
        href={`/parent/child/${child.id}/report`}
        className="block bg-gradient-to-br from-accent-500 to-accent-400 rounded-3xl p-6 text-white shadow-xl shadow-accent-500/20 relative overflow-hidden card-hover"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl">
              {child.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{child.name}</h1>
              <p className="text-accent-100">{child.className} · 学号 {child.studentNo}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-accent-100 text-sm">最近得分</p>
              <p className="text-2xl font-bold">61<span className="text-sm font-normal text-accent-100">/100</span></p>
            </div>
            <div>
              <p className="text-accent-100 text-sm">班级排名</p>
              <p className="text-2xl font-bold">28<span className="text-sm font-normal text-accent-100">/42</span></p>
            </div>
            <div>
              <p className="text-accent-100 text-sm">待完成作业</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-accent-100 text-sm">
            <Sparkles size={16} />
            点击查看学习报告
            <ChevronRight size={16} />
          </div>
        </div>
      </Link>

      {/* 快捷入口 */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href={`/parent/child/${child.id}/report`}
          className="bg-white rounded-2xl border border-border p-4 text-center card-hover"
        >
          <div className="w-12 h-12 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center mx-auto mb-2">
            <TrendingUp size={22} />
          </div>
          <p className="text-sm font-medium">学习报告</p>
        </Link>
        <Link
          href={`/parent/child/${child.id}`}
          className="bg-white rounded-2xl border border-border p-4 text-center card-hover"
        >
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-2">
            <FileText size={22} />
          </div>
          <p className="text-sm font-medium">作业记录</p>
        </Link>
        <Link
          href="#"
          className="bg-white rounded-2xl border border-border p-4 text-center card-hover opacity-60"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
            <Calendar size={22} />
          </div>
          <p className="text-sm font-medium">家校沟通</p>
        </Link>
      </div>

      {/* 最近作业 */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen size={20} className="text-primary-600" />
            最近作业
          </h2>
          <Link href={`/parent/child/${child.id}`} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            查看全部 <ChevronRight size={16} />
          </Link>
        </div>

        <div className="space-y-4">
          {recentHomework.map(hw => {
            const scoreColor = hw.score >= 80 ? 'text-green-600 bg-green-50' : hw.score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
            const wrongCount = sampleGradingResults.filter(r => !r.isCorrect).length;
            return (
              <Link
                key={hw.id}
                href={`/parent/child/${child.id}/homework/${hw.id}`}
                className="block p-4 rounded-xl border border-border hover:border-primary-200 hover:bg-primary-50/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{hw.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{hw.status}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{hw.date}</span>
                      <span>{wrongCount > 0 ? `${wrongCount}道错题` : '全部正确'}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg font-bold text-lg ${scoreColor}`}>
                    {hw.score}
                    <span className="text-xs font-normal">分</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* AI提醒 */}
      <div className="bg-gradient-to-br from-blue-50 to-primary-50 rounded-2xl p-5 border border-blue-100">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Sparkles size={20} className="text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">AI学习小贴士</h3>
            <p className="text-sm text-blue-800">
              本次测试中孩子对"重量单位认识"掌握不够扎实，建议生活中多让孩子感受1千克物品的实际重量，帮助建立直观认知。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
