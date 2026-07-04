'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FileText, Clock, CheckCircle, Users, Plus, ArrowRight, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { homeworkList as mockHomeworkList, currentTeacher, sampleClassAnalytics } from '@/lib/mock-data';

interface HwItem {
  id: string; title: string; description: string; subject: string;
  totalScore: number; status: string; deadline?: string | null;
  className: string; questionCount: number; submissionCount: number;
  totalStudents: number; isDemo: boolean; averageScore?: number | null;
}
interface ClassAnalytics {
  averageScore: number; submissionRate: number;
  knowledgePointMastery: { id: string; name: string; correctRate: number }[];
}

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [homeworks, setHomeworks] = useState<HwItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [analytics, setAnalytics] = useState<ClassAnalytics>({
    averageScore: sampleClassAnalytics.averageScore,
    submissionRate: sampleClassAnalytics.submissionRate,
    knowledgePointMastery: sampleClassAnalytics.knowledgePointMastery,
  });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/homework', { cache: 'no-store' });
        if (!r.ok) throw new Error('api error');
        const data = await r.json();
        if (data.homeworks?.length) {
          setHomeworks(data.homeworks);
          // 尝试取第一个班级的analytics
          try {
            const cls = await fetch('/api/classes').then(x => x.json());
            if (cls.classes?.[0]) {
              const cid = cls.classes[0].id;
              const a = await fetch(`/api/analytics/class/${cid}`).then(x => x.json());
              if (a && !a.error) {
                setAnalytics({
                  averageScore: a.averageScore || sampleClassAnalytics.averageScore,
                  submissionRate: Math.round(((a.homeworkCount * a.studentCount - 0) / Math.max(1, a.homeworkCount * a.studentCount)) * 100),
                  knowledgePointMastery: a.knowledgePointMastery || sampleClassAnalytics.knowledgePointMastery,
                });
              }
            }
          } catch {}
        } else {
          // 空数据也回退
          setHomeworks(mockHomeworkList.map(h => ({
            id: h.id, title: h.title, description: h.description, subject: h.subject,
            totalScore: h.totalScore, status: h.status, deadline: h.deadline,
            className: h.className, questionCount: h.questions.length,
            submissionCount: h.submissionCount, totalStudents: h.totalStudents, isDemo: true,
          })));
          setUsingMock(true);
        }
      } catch {
        // 数据库未就绪，用mock
        setHomeworks(mockHomeworkList.map(h => ({
          id: h.id, title: h.title, description: h.description, subject: h.subject,
          totalScore: h.totalScore, status: h.status, deadline: h.deadline,
          className: h.className, questionCount: h.questions.length,
          submissionCount: h.submissionCount, totalStudents: h.totalStudents, isDemo: true,
        })));
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pendingCount = homeworks.filter(hw => hw.status === 'pending').length;
  const publishedCount = homeworks.filter(hw => hw.status === 'published' || hw.status === 'graded').length;
  const avgScore = analytics.averageScore;
  const submissionRate = analytics.submissionRate;
  const userName = session?.user?.name || currentTeacher.name;

  const statusLabel = (s: string) => s === 'pending' ? '待批改' : s === 'grading' ? '批改中' : s === 'graded' ? '已批改' : '已发布';
  const statusClass = (s: string) => s === 'pending' ? 'bg-amber-100 text-amber-700' : s === 'grading' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {usingMock && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          演示模式：数据库未连接，显示示例数据。上传真实试卷后数据会自动保存。
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">早上好，{userName} 👋</h1>
          <p className="text-muted-foreground mt-1">今天有 {pendingCount} 份作业等待批改，加油！</p>
        </div>
        <Link href="/teacher/assign"
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all hover:-translate-y-0.5">
          <Plus size={20} />上传并批改作业
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="待批改" value={pendingCount} icon={Clock} color="warning" suffix="份" />
        <StatCard title="已批改" value={publishedCount} icon={CheckCircle} color="success" suffix="份" />
        <StatCard title="班级平均分" value={avgScore} icon={TrendingUp} color="primary" suffix="分" />
        <StatCard title="作业提交率" value={submissionRate} icon={Users} color="info" suffix="%" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText size={20} className="text-primary-600" />作业列表
            </h2>
            <Link href="/teacher/analytics" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              查看学情分析 <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="animate-spin mx-auto mb-2" />加载中...</div>
          ) : (
            <div className="space-y-4">
              {homeworks.map(hw => (
                <div key={hw.id} className="p-4 rounded-xl border border-border hover:border-primary-200 hover:bg-primary-50/30 transition-all">
                  <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{hw.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass(hw.status)}`}>{statusLabel(hw.status)}</span>
                        {hw.isDemo && <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">示例</span>}
                      </div>
                      {hw.description && <p className="text-sm text-muted-foreground mb-2">{hw.description}</p>}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{hw.className}</span>
                        <span>共{hw.questionCount}题 · 满分{hw.totalScore}分</span>
                        {hw.averageScore != null && <span>平均{hw.averageScore}分</span>}
                        {hw.deadline && <span>截止：{hw.deadline.slice(0, 10)}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {hw.status === 'pending' ? (
                        <Link href={`/teacher/grade/${hw.id}`}
                          className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                          开始批改 <ArrowRight size={16} />
                        </Link>
                      ) : (
                        <Link href="/teacher/analytics"
                          className="inline-flex items-center gap-1 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
                          查看分析
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {homeworks.length === 0 && !loading && (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText size={40} className="mx-auto mb-3 opacity-30" />
                  <p>还没有作业，点击右上角上传第一份试卷吧！</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-accent-500" />班级薄弱点
            </h2>
            <div className="space-y-3">
              {analytics.knowledgePointMastery
                .slice()
                .sort((a, b) => a.correctRate - b.correctRate)
                .slice(0, 2)
                .map(kp => (
                  <div key={kp.id} className="p-3 rounded-xl bg-accent-50 border border-accent-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{kp.name}</span>
                      <span className="text-accent-600 font-bold">{kp.correctRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-accent-100 rounded-full overflow-hidden">
                      <div className="h-full bg-accent-500 rounded-full" style={{ width: `${kp.correctRate}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">错误率较高，建议重点讲解</p>
                  </div>
                ))}
            </div>
            <Link href="/teacher/analytics" className="mt-4 block text-center text-sm text-primary-600 hover:text-primary-700 py-2">
              查看完整分析 →
            </Link>
          </div>

          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
            <h3 className="font-bold text-lg mb-2">💡 AI教学助手</h3>
            <p className="text-primary-100 text-sm mb-4">上传学生试卷照片，AI自动识别姓名、答案并批改，生成针对性教学建议。</p>
            <Link href="/teacher/assign" className="inline-flex items-center gap-1 px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
              立即上传批改 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
