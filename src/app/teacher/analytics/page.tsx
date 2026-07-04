'use client';

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Users, Target, Lightbulb, AlertTriangle, ArrowRight, ChevronDown, XCircle, BarChart } from 'lucide-react';
import Link from 'next/link';
import { sampleClassAnalytics, students, studentRadarData, studentTrendData } from '@/lib/mock-data';

export default function AnalyticsPage() {
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f87171'];

  const getBarColor = (rate: number) => {
    if (rate >= 80) return '#10b981';
    if (rate >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">学情分析</h1>
          <p className="text-muted-foreground mt-1">{sampleClassAnalytics.homeworkTitle} · {sampleClassAnalytics.className}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-border">
          <span>最近测试</span>
          <ChevronDown size={16} className="text-muted-foreground" />
        </div>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-primary-600" />
            </div>
            <span className="text-sm text-muted-foreground">平均分</span>
          </div>
          <p className="text-3xl font-bold text-primary-700">{sampleClassAnalytics.averageScore}</p>
          <p className="text-xs text-muted-foreground mt-1">最高分 {sampleClassAnalytics.maxScore} · 最低分 {sampleClassAnalytics.minScore}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">提交率</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{sampleClassAnalytics.submissionRate}<span className="text-lg">%</span></p>
          <p className="text-xs text-muted-foreground mt-1">42人提交 · 3人未交</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Target size={20} className="text-green-600" />
            </div>
            <span className="text-sm text-muted-foreground">优秀率</span>
          </div>
          <p className="text-3xl font-bold text-green-700">19<span className="text-lg">%</span></p>
          <p className="text-xs text-muted-foreground mt-1">8人90分以上</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <span className="text-sm text-muted-foreground">待关注</span>
          </div>
          <p className="text-3xl font-bold text-amber-700">2</p>
          <p className="text-xs text-muted-foreground mt-1">人不及格需补漏</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 分数分布 */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <BarChart size={18} className="text-primary-600" />
            </div>
            分数分布
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={sampleClassAnalytics.scoreDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="score" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {sampleClassAnalytics.scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 知识点掌握度 */}
        <div className="bg-white rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
              <Target size={18} className="text-accent-600" />
            </div>
            知识点掌握情况
          </h2>
          <div className="space-y-4">
            {[...sampleClassAnalytics.knowledgePointMastery].sort((a, b) => a.correctRate - b.correctRate).map(kp => (
              <div key={kp.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{kp.name}</span>
                  <span className={`text-sm font-bold ${
                    kp.correctRate >= 80 ? 'text-green-600' :
                    kp.correctRate >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>{kp.correctRate}%</span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${kp.correctRate}%`, backgroundColor: getBarColor(kp.correctRate) }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{kp.wrongCount}人出错</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 常见错误 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-6">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            典型错误分析
          </h2>
          <div className="space-y-4">
            {sampleClassAnalytics.commonMistakes.map((mistake, i) => (
              <div key={mistake.questionId} className="p-4 rounded-xl border border-border bg-amber-50/50">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-2">{mistake.questionContent}</p>
                    <div className="flex items-center gap-2 text-xs text-red-600 mb-2">
                      <XCircle size={14} />
                      {mistake.wrongCount}人出错（{Math.round(mistake.wrongCount / 42 * 100)}%）
                    </div>
                    <p className="text-sm text-muted-foreground">{mistake.errorAnalysis}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 教学建议 */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
          <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
            <Lightbulb size={20} />
            AI教学建议
          </h2>
          <div className="space-y-4">
            {sampleClassAnalytics.teachingSuggestions.map((suggestion, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  {i + 1}
                </div>
                <p className="text-sm text-primary-50 leading-relaxed">{suggestion}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 学生列表 */}
      <div className="bg-white rounded-2xl border border-border p-6">
        <h2 className="text-lg font-bold mb-5 flex items-center gap-2">学生详情</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground border-b border-border">
                <th className="pb-3 font-medium">学生</th>
                <th className="pb-3 font-medium">得分</th>
                <th className="pb-3 font-medium">正确率</th>
                <th className="pb-3 font-medium">薄弱知识点</th>
                <th className="pb-3 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {students.map((student, i) => {
                const scores = [85, 78, 92, 61, 88];
                const score = scores[i] || 75;
                const weakPoints = [
                  ['重量单位'],
                  ['进位加法'],
                  [],
                  ['重量单位', '概念理解'],
                  [],
                ][i] || [];
                return (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{student.avatar}</span>
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {score}分
                      </span>
                    </td>
                    <td className="py-4">{Math.round(score)}%</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1">
                        {weakPoints.length > 0 ? weakPoints.map(wp => (
                          <span key={wp} className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs">
                            {wp}
                          </span>
                        )) : <span className="text-green-600 text-xs">✓ 掌握良好</span>}
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <Link href={`/parent/child/${student.id}/report`} className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1 justify-end">
                        查看报告 <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
