'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { getStudentById, studentRadarData, studentTrendData } from '@/lib/mock-data';
import { TrendingUp, TrendingDown, Lightbulb, Target, Award, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function StudentReport() {
  const params = useParams();
  const studentId = params.id as string;
  const student = getStudentById(studentId) || getStudentById('s1')!;

  const weakPoints = [
    { name: '重量单位认识', mastery: 55, suggestion: '建议生活中多让孩子体验和估算物品重量，建立直观认知。' },
    { name: '进位加法', mastery: 70, suggestion: '练习时注意标记进位，养成检查习惯。' },
  ];

  const strengths = ['表内除法计算', '平行四边形认识', '奇数偶数概念'];

  return (
    <div className="min-h-screen bg-background pb-10">
      <Navbar role="parent" title="学习报告" showBack backUrl={`/parent/child/${studentId}`} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-fade-in space-y-6">
        {/* 头部卡片 */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-4xl">
              {student.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{student.name} 的学习报告</h1>
              <p className="text-primary-100">{student.className} · 生成于 2026年7月3日</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-primary-100 text-sm">综合掌握度</p>
              <p className="text-3xl font-bold mt-1">78<span className="text-lg">%</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
              <p className="text-primary-100 text-sm">最近3次平均</p>
              <p className="text-3xl font-bold mt-1">73<span className="text-lg">分</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center flex items-center justify-center gap-2">
              <TrendingDown className="text-red-300" size={24} />
              <div className="text-left">
                <p className="text-primary-100 text-sm">趋势</p>
                <p className="font-bold">有所下降</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 知识点雷达图 */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Target size={20} className="text-primary-600" />
              知识点掌握雷达图
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={studentRadarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="掌握度"
                    dataKey="value"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 成绩趋势 */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-600" />
              近期成绩趋势
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studentTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="score" name="我的分数" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                  <Line type="monotone" dataKey="average" name="班级平均" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 优势与薄弱点 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 优势 */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Award size={20} className="text-green-600" />
              掌握较好的知识点
            </h2>
            <div className="space-y-3">
              {strengths.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-green-50">
                  <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <span className="text-sm text-green-900">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 薄弱点 */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              需要加强的知识点
            </h2>
            <div className="space-y-4">
              {weakPoints.map((wp, i) => (
                <div key={i} className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-amber-900">{wp.name}</span>
                    <span className="text-amber-600 font-bold">{wp.mastery}%</span>
                  </div>
                  <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${wp.mastery}%` }} />
                  </div>
                  <p className="text-xs text-amber-800">{wp.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI学习建议 */}
        <div className="bg-gradient-to-br from-accent-50 to-orange-50 rounded-2xl p-6 border border-accent-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Lightbulb size={20} className="text-accent-600" />
            AI个性化学习建议
          </h2>
          <div className="space-y-3 text-sm text-accent-900">
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-accent-200 text-accent-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">1</span>
              <p><b>生活中渗透数学概念</b>：重量单位是本次测试最薄弱的点，逛超市时可以让孩子帮忙称重、估算物品重量，建立克和千克的直观感受。</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-accent-200 text-accent-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">2</span>
              <p><b>培养良好计算习惯</b>：进位加法出错是因为粗心，建议练习时要求孩子标记进位"1"，做完后反向检查一遍。</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-accent-200 text-accent-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">3</span>
              <p><b>适当拓展</b>：除法和图形掌握较好，可以在生活中出一些分东西的应用题，提升解决实际问题的能力。</p>
            </div>
            <div className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-accent-200 text-accent-700 flex items-center justify-center flex-shrink-0 font-bold text-sm">4</span>
              <p><b>多鼓励</b>：孩子最近成绩有所波动，不要指责，多和孩子聊聊原因，帮助他/她建立信心，我们一起加油！</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={`/parent/child/${studentId}`}
            className="px-6 py-3 rounded-xl border border-border bg-white font-medium hover:bg-muted transition-colors text-center"
          >
            返回作业列表
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
          >
            返回首页 <ArrowLeft size={18} className="rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}
