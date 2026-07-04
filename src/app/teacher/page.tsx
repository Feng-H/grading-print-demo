import Link from 'next/link';
import { FileText, Clock, CheckCircle, Users, Plus, ArrowRight, AlertCircle, TrendingUp } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import { homeworkList, currentTeacher, sampleClassAnalytics } from '@/lib/mock-data';

export default function TeacherDashboard() {
  const pendingCount = homeworkList.filter(hw => hw.status === 'pending').length;
  const publishedCount = homeworkList.filter(hw => hw.status === 'published').length;
  const avgScore = sampleClassAnalytics.averageScore;
  const submissionRate = sampleClassAnalytics.submissionRate;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 欢迎区域 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">早上好，{currentTeacher.name} 👋</h1>
          <p className="text-muted-foreground mt-1">今天有 {pendingCount} 份作业等待批改，加油！</p>
        </div>
        <Link
          href="/teacher/assign"
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all hover:-translate-y-0.5"
        >
          <Plus size={20} />
          布置新作业
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="待批改" value={pendingCount} icon={Clock} color="warning" suffix="份" />
        <StatCard title="已发布" value={publishedCount} icon={CheckCircle} color="success" suffix="份" />
        <StatCard title="班级平均分" value={avgScore} icon={TrendingUp} color="primary" suffix="分" />
        <StatCard title="作业提交率" value={submissionRate} icon={Users} color="info" suffix="%" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 作业列表 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText size={20} className="text-primary-600" />
              作业列表
            </h2>
            <Link href="/teacher/analytics" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              查看学情分析 <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-4">
            {homeworkList.map(hw => (
              <div key={hw.id} className="p-4 rounded-xl border border-border hover:border-primary-200 hover:bg-primary-50/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{hw.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        hw.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        hw.status === 'grading' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {hw.status === 'pending' ? '待批改' : hw.status === 'grading' ? '批改中' : '已发布'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{hw.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{hw.className}</span>
                      <span>共{hw.questions.length}题 · 满分{hw.totalScore}分</span>
                      <span>已提交 {hw.submissionCount}/{hw.totalStudents}</span>
                      <span>截止：{hw.deadline}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {hw.status === 'pending' ? (
                      <Link
                        href={`/teacher/grade/${hw.id}`}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                      >
                        开始批改 <ArrowRight size={16} />
                      </Link>
                    ) : (
                      <Link
                        href="/teacher/analytics"
                        className="inline-flex items-center gap-1 px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
                      >
                        查看分析
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 侧边栏 - 学情提醒 */}
        <div className="space-y-6">
          {/* 薄弱点提醒 */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-accent-500" />
              班级薄弱点
            </h2>
            <div className="space-y-3">
              {sampleClassAnalytics.knowledgePointMastery
                .sort((a, b) => a.correctRate - b.correctRate)
                .slice(0, 2)
                .map(kp => (
                  <div key={kp.id} className="p-3 rounded-xl bg-accent-50 border border-accent-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{kp.name}</span>
                      <span className="text-accent-600 font-bold">{kp.correctRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-accent-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full"
                        style={{ width: `${kp.correctRate}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      错误率较高，建议重点讲解
                    </p>
                  </div>
                ))}
            </div>
            <Link href="/teacher/analytics" className="mt-4 block text-center text-sm text-primary-600 hover:text-primary-700 py-2">
              查看完整分析 →
            </Link>
          </div>

          {/* 快捷功能 */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
            <h3 className="font-bold text-lg mb-2">💡 AI教学助手</h3>
            <p className="text-primary-100 text-sm mb-4">
              基于作业批改数据，AI已为您生成针对性教学建议，帮助学生突破薄弱知识点。
            </p>
            <Link href="/teacher/analytics" className="inline-flex items-center gap-1 px-4 py-2 bg-white/20 backdrop-blur rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">
              查看教学建议 <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
