'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { getHomeworkById, getStudentById, sampleSubmission, sampleGradingResults } from '@/lib/mock-data';
import { CheckCircle2, XCircle, Brain, Award, ArrowLeft, Lightbulb } from 'lucide-react';

const questionTypeMap: Record<string, string> = {
  choice: '选择题',
  judge: '判断题',
  fill: '填空题',
  math: '数学解答题',
  short_answer: '简答题',
  essay: '作文',
};

export default function HomeworkDetail() {
  const params = useParams();
  const studentId = params.id as string;
  const homeworkId = params.hwid as string;
  const student = getStudentById(studentId) || getStudentById('s1')!;
  const homework = getHomeworkById(homeworkId) || getHomeworkById('hw1')!;

  const studentAnswerMap = Object.fromEntries(
    sampleSubmission.answers.map(a => [a.questionId, a.answer])
  );

  const totalScore = sampleGradingResults.reduce((sum, r) => sum + r.score, 0);
  const maxScore = sampleGradingResults.reduce((sum, r) => sum + r.maxScore, 0);
  const correctCount = sampleGradingResults.filter(r => r.isCorrect).length;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar role="parent" title="作业详情" showBack backUrl={`/parent/child/${studentId}`} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
        {/* 作业概览 */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-accent-100 flex items-center justify-center text-3xl">
              {student.avatar}
            </div>
            <div>
              <h1 className="text-xl font-bold">{homework.title}</h1>
              <p className="text-sm text-muted-foreground">{student.name} · {homework.className}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="text-center p-3 rounded-xl bg-primary-50">
              <div className="text-2xl font-bold text-primary-700">{totalScore}<span className="text-sm text-primary-500">/{maxScore}</span></div>
              <div className="text-xs text-muted-foreground mt-1">总分</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-green-50">
              <div className="text-2xl font-bold text-green-700">{correctCount}</div>
              <div className="text-xs text-muted-foreground mt-1">正确</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-red-50">
              <div className="text-2xl font-bold text-red-700">{sampleGradingResults.length - correctCount}</div>
              <div className="text-xs text-muted-foreground mt-1">错误</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
            <Brain size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">AI总体评语</p>
              <p className="text-sm text-blue-800">
                本次作业基础知识掌握整体不错，奇数偶数、除法应用和图形认识掌握较好，但重量单位概念需要加强，计算时要注意进位。继续加油！
              </p>
            </div>
          </div>
        </div>

        {/* 题目列表 */}
        <div className="space-y-4">
          {homework.questions.map((q, idx) => {
            const studentAnswer = studentAnswerMap[q.id] || '';
            const result = sampleGradingResults.find(r => r.questionId === q.id);
            if (!result) return null;

            return (
              <div key={q.id} className={`bg-white rounded-2xl border-2 overflow-hidden ${
                result.isCorrect ? 'border-green-200' : 'border-red-200'
              }`}>
                <div className="p-5 border-b border-border flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                      <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                        {questionTypeMap[q.type]}
                      </span>
                      <span className="text-xs text-muted-foreground">{q.knowledgePointName}</span>
                    </div>
                    <p className="font-medium">{q.content}</p>
                    {q.options && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {q.options.map(opt => (
                          <div key={opt} className="px-3 py-2 rounded-lg bg-muted/50">{opt}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    result.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {result.isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* 学生答案 */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-1 font-medium">孩子的答案：</div>
                    <p className={`p-3 rounded-lg ${result.isCorrect ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
                      {studentAnswer}
                    </p>
                  </div>

                  {/* 正确答案（错题显示） */}
                  {!result.isCorrect && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1 font-medium">正确答案：</div>
                      <p className="p-3 rounded-lg bg-green-50 text-green-800">
                        {result.correctAnswer}
                      </p>
                    </div>
                  )}

                  {/* AI评语 */}
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-50">
                    <Award size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-primary-700">得分 {result.score}/{result.maxScore}：</span>
                      <span className="text-primary-800">{result.comment}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 学习建议 */}
        <div className="mt-6 bg-gradient-to-br from-accent-50 to-primary-50 rounded-2xl p-6 border border-accent-100">
          <h3 className="font-bold flex items-center gap-2 mb-3">
            <Lightbulb size={20} className="text-accent-600" />
            给家长的建议
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-accent-600">•</span>
              生活中可以让孩子多参与称重活动，比如买菜时让孩子感受1千克、500克的实际重量，帮助建立直观概念。
            </li>
            <li className="flex gap-2">
              <span className="text-accent-600">•</span>
              练习两位数加法时，提醒孩子标记进位，养成做完检查的习惯。
            </li>
            <li className="flex gap-2">
              <span className="text-accent-600">•</span>
            孩子对除法和图形认识掌握较好，可以适当给一些拓展应用题提升思维能力。
            </li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <Link
            href={`/parent/child/${studentId}/report`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
          >
            查看完整学习报告 <ArrowLeft size={18} className="rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}
