'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, FileText, TrendingUp, Calendar, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { currentParent, homeworkList as mockHwList } from '@/lib/mock-data';

interface ChildItem { id: string; name: string; className: string; avatar?: string; studentNo?: string; }
interface HwItem {
  submissionId: string; homeworkId: string; title: string; subject: string;
  totalScore: number; studentScore: number; submitTime: string;
  studentName: string; studentId: string; aiComment?: string | null; isDemo?: boolean;
}

export default function ParentHome() {
  const [children, setChildren] = useState<ChildItem[]>([]);
  const [homeworks, setHomeworks] = useState<HwItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/homework', { cache: 'no-store' });
        if (r.ok) {
          const data = await r.json();
          if (data.children?.length && data.homeworks?.length) {
            setChildren(data.children.map((c: any) => ({
              id: c.id, name: c.name, className: c.className, avatar: c.avatar || '👦', studentNo: c.studentNo,
            })));
            setHomeworks(data.homeworks);
            setLoading(false);
            return;
          }
        }
        throw new Error('fallback');
      } catch {
        // Fallback to mock
        const mockChild = currentParent.children[0];
        setChildren([{ id: mockChild.id, name: mockChild.name, className: mockChild.className, avatar: mockChild.avatar, studentNo: mockChild.studentNo }]);
        setHomeworks([
          { submissionId: 's1', homeworkId: mockHwList[0].id, title: mockHwList[0].title, subject: '数学', totalScore: 75, studentScore: 51, submitTime: '2026-07-02', studentName: mockChild.name, studentId: mockChild.id, isDemo: true },
          { submissionId: 's2', homeworkId: mockHwList[1].id, title: mockHwList[1].title, subject: '数学', totalScore: 55, studentScore: 43, submitTime: '2026-06-27', studentName: mockChild.name, studentId: mockChild.id, isDemo: true },
          { submissionId: 's3', homeworkId: mockHwList[2].id, title: mockHwList[2].title, subject: '数学', totalScore: 30, studentScore: 30, submitTime: '2026-06-20', studentName: mockChild.name, studentId: mockChild.id, isDemo: true },
        ]);
      } finally { setLoading(false); }
    })();
  }, []);

  const child = children[0];
  const recentScore = homeworks[0]?.studentScore || 0;
  const recentTotal = homeworks[0]?.totalScore || 100;
  const recentPct = Math.round((recentScore / recentTotal) * 100);

  if (loading) return <div className="py-20 text-center"><Loader2 className="mx-auto animate-spin text-accent-500 mb-3" /><p className="text-muted-foreground">加载中...</p></div>;
  if (!child) return <div className="py-10 text-center text-muted-foreground">暂无孩子信息</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Link href={`/parent/child/${child.id}/report`}
        className="block bg-gradient-to-br from-accent-500 to-accent-400 rounded-3xl p-6 text-white shadow-xl shadow-accent-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl">{child.avatar || '👦'}</div>
            <div>
              <h1 className="text-2xl font-bold">{child.name}</h1>
              <p className="text-accent-100">{child.className} {child.studentNo ? `· 学号 ${child.studentNo}` : ''}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-accent-100 text-sm">最近得分</p>
              <p className="text-2xl font-bold">{recentScore}<span className="text-sm font-normal text-accent-100">/{recentTotal}</span></p>
            </div>
            <div>
              <p className="text-accent-100 text-sm">正确率</p>
              <p className="text-2xl font-bold">{recentPct}<span className="text-sm font-normal text-accent-100">%</span></p>
            </div>
            <div>
              <p className="text-accent-100 text-sm">已批改作业</p>
              <p className="text-2xl font-bold">{homeworks.length}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-accent-100 text-sm">
            <Sparkles size={16} />点击查看学习报告<ChevronRight size={16} />
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <Link href={`/parent/child/${child.id}/report`} className="bg-white rounded-2xl border border-border p-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center mx-auto mb-2"><TrendingUp size={22} /></div>
          <p className="text-sm font-medium">学习报告</p>
        </Link>
        <Link href={`/parent/child/${child.id}`} className="bg-white rounded-2xl border border-border p-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mx-auto mb-2"><FileText size={22} /></div>
          <p className="text-sm font-medium">作业记录</p>
        </Link>
        <Link href="#" className="bg-white rounded-2xl border border-border p-4 text-center opacity-60">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2"><Calendar size={22} /></div>
          <p className="text-sm font-medium">家校沟通</p>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen size={20} className="text-primary-600" />最近作业</h2>
          <Link href={`/parent/child/${child.id}`} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">查看全部 <ChevronRight size={16} /></Link>
        </div>
        <div className="space-y-4">
          {homeworks.slice(0, 5).map(hw => {
            const pct = Math.round((hw.studentScore / hw.totalScore) * 100);
            const scoreColor = pct >= 80 ? 'text-green-600 bg-green-50' : pct >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
            return (
              <Link key={hw.submissionId} href={`/parent/child/${child.id}/homework/${hw.homeworkId}`}
                className="block p-4 rounded-xl border border-border hover:border-primary-200 hover:bg-primary-50/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{hw.title}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">已批改</span>
                      {hw.isDemo && <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">示例</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{hw.submitTime?.slice(0, 10)}</span>
                      <span>{hw.subject}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg font-bold text-lg ${scoreColor}`}>
                    {hw.studentScore}<span className="text-xs font-normal">分</span>
                  </div>
                </div>
              </Link>
            );
          })}
          {homeworks.length === 0 && <p className="text-center text-muted-foreground py-6">暂无作业记录</p>}
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-primary-50 rounded-2xl p-5 border border-blue-100">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><Sparkles size={20} className="text-blue-600" /></div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">AI学习小贴士</h3>
            <p className="text-sm text-blue-800">
              {homeworks[0]?.aiComment || '老师已通过AI智能批改孩子的作业，建议关注孩子的错题，帮助孩子理解知识点而不是只看分数。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
