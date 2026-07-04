'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getHomeworkById, getStudentById, sampleSubmission, sampleGradingResults } from '@/lib/mock-data';
import { CheckCircle2, XCircle, Brain, Award, ArrowLeft, Lightbulb, Loader2 } from 'lucide-react';

const questionTypeMap: Record<string, string> = {
  choice: '选择题', judge: '判断题', fill: '填空题',
  math: '数学解答题', short_answer: '简答题', essay: '作文',
};

interface HWData {
  title: string; className: string; studentName: string; studentAvatar?: string;
  totalScore: number; totalMax: number; aiComment?: string;
  questions: {
    id: string; type: string; content: string; options?: string[]; knowledgePointName: string;
    studentAnswer: string; score: number; maxScore: number; isCorrect: boolean;
    correctAnswer: string; comment: string; errorType?: string | null;
  }[];
}

export default function HomeworkDetail() {
  const params = useParams();
  const studentId = params.id as string;
  const homeworkId = params.hwid as string;
  const [data, setData] = useState<HWData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 真实DB数据（cuid格式长id）
        if (homeworkId.length > 10) {
          const r = await fetch(`/api/homework/${homeworkId}`);
          if (r.ok) {
            const d = await r.json();
            const hw = d.homework;
            // 找当前学生的提交
            const sub = hw.submissions?.find((s: any) => s.studentId === studentId);
            if (sub) {
              const ansMap = Object.fromEntries(sub.answers.map((a: any) => [a.questionId, a.answer]));
              setData({
                title: hw.title, className: hw.class?.name || '',
                studentName: sub.student?.name || '',
                studentAvatar: sub.student?.avatar,
                totalScore: sub.totalScore || sub.gradingResults.reduce((s: number, g: any) => s + g.score, 0),
                totalMax: hw.totalScore,
                aiComment: sub.aiComment,
                questions: hw.questions.map((q: any) => {
                  const gr = sub.gradingResults.find((g: any) => g.questionId === q.id);
                  return {
                    id: q.id, type: q.type, content: q.content, options: q.options?.length ? q.options : undefined,
                    knowledgePointName: q.knowledgePointName,
                    studentAnswer: ansMap[q.id] || '',
                    score: gr?.score ?? 0, maxScore: q.score,
                    isCorrect: gr?.isCorrect ?? false,
                    correctAnswer: gr?.correctAnswer || q.correctAnswer,
                    comment: gr?.comment || '',
                    errorType: gr?.errorType,
                  };
                }),
              });
              setLoading(false);
              return;
            }
          }
        }
        // 回退mock
        const mockStudent = getStudentById(studentId) || getStudentById('s1')!;
        const mockHw = getHomeworkById(homeworkId) || getHomeworkById('hw1')!;
        const answerMap = Object.fromEntries(sampleSubmission.answers.map(a => [a.questionId, a.answer]));
        setData({
          title: mockHw.title, className: mockHw.className,
          studentName: mockStudent.name, studentAvatar: mockStudent.avatar,
          totalScore: sampleGradingResults.reduce((s, r) => s + r.score, 0),
          totalMax: sampleGradingResults.reduce((s, r) => s + r.maxScore, 0),
          aiComment: '本次作业基础知识掌握整体不错，奇数偶数、除法应用和图形认识掌握较好，但重量单位概念需要加强，计算时要注意进位。继续加油！',
          questions: mockHw.questions.map(q => {
            const r = sampleGradingResults.find(x => x.questionId === q.id);
            return {
              id: q.id, type: q.type, content: q.content, options: q.options,
              knowledgePointName: q.knowledgePointName,
              studentAnswer: answerMap[q.id] || '',
              score: r?.score || 0, maxScore: q.score, isCorrect: !!r?.isCorrect,
              correctAnswer: r?.correctAnswer || q.correctAnswer,
              comment: r?.comment || '', errorType: r?.errorType,
            };
          }),
        });
      } catch {
        // fallback到mock
        const mockStudent = getStudentById(studentId) || getStudentById('s1')!;
        const mockHw = getHomeworkById(homeworkId) || getHomeworkById('hw1')!;
        setData({
          title: mockHw.title, className: mockHw.className, studentName: mockStudent.name,
          studentAvatar: mockStudent.avatar, totalScore: 51, totalMax: 75,
          aiComment: '本次作业有进步！',
          questions: mockHw.questions.map(q => ({
            id: q.id, type: q.type, content: q.content, options: q.options,
            knowledgePointName: q.knowledgePointName,
            studentAnswer: '', score: 0, maxScore: q.score, isCorrect: false, correctAnswer: q.correctAnswer, comment: '',
          })),
        });
      } finally { setLoading(false); }
    })();
  }, [homeworkId, studentId]);

  if (loading) return <div className="py-20 text-center"><Loader2 className="mx-auto animate-spin text-accent-500 mb-3" /><p className="text-muted-foreground">加载中...</p></div>;
  if (!data) return <div className="py-10 text-center text-muted-foreground">作业不存在</div>;

  const correctCount = data.questions.filter(q => q.isCorrect).length;
  const errorCount = data.questions.length - correctCount;

  return (
    <div className="pb-20 md:pb-6 animate-fade-in">
      {/* 作业概览 */}
      <div className="bg-white rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-2xl bg-accent-100 flex items-center justify-center text-3xl">
            {data.studentAvatar || '👦'}
          </div>
          <div>
            <h1 className="text-xl font-bold">{data.title}</h1>
            <p className="text-sm text-muted-foreground">{data.studentName} · {data.className}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="text-center p-3 rounded-xl bg-primary-50">
            <div className="text-2xl font-bold text-primary-700">{data.totalScore}<span className="text-sm text-primary-500">/{data.totalMax}</span></div>
            <div className="text-xs text-muted-foreground mt-1">总分</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-green-50">
            <div className="text-2xl font-bold text-green-700">{correctCount}</div>
            <div className="text-xs text-muted-foreground mt-1">正确</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-50">
            <div className="text-2xl font-bold text-red-700">{errorCount}</div>
            <div className="text-xs text-muted-foreground mt-1">错误</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
          <Brain size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900 mb-1">AI总体评语</p>
            <p className="text-sm text-blue-800">{data.aiComment || '本次作业已由AI批改完成。'}</p>
          </div>
        </div>
      </div>

      {/* 题目列表 */}
      <div className="space-y-4">
        {data.questions.map((q, idx) => (
          <div key={q.id} className={`bg-white rounded-2xl border-2 overflow-hidden ${q.isCorrect ? 'border-green-200' : 'border-red-200'}`}>
            <div className="p-5 border-b border-border flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{questionTypeMap[q.type] || q.type}</span>
                  <span className="text-xs text-muted-foreground">{q.knowledgePointName}</span>
                </div>
                <p className="font-medium">{q.content}</p>
                {q.options && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {q.options.map(opt => <div key={opt} className="px-3 py-2 rounded-lg bg-muted/50">{opt}</div>)}
                  </div>
                )}
              </div>
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${q.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {q.isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1 font-medium">孩子的答案：</div>
                <p className={`p-3 rounded-lg ${q.isCorrect ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>{q.studentAnswer || '（未作答）'}</p>
              </div>
              {!q.isCorrect && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1 font-medium">正确答案：</div>
                  <p className="p-3 rounded-lg bg-green-50 text-green-800">{q.correctAnswer}</p>
                </div>
              )}
              {q.comment && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary-50">
                  <Award size={18} className="text-primary-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-primary-700">得分 {q.score}/{q.maxScore}：</span>
                    <span className="text-primary-800">{q.comment}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 学习建议 */}
      <div className="mt-6 bg-gradient-to-br from-accent-50 to-primary-50 rounded-2xl p-6 border border-accent-100">
        <h3 className="font-bold flex items-center gap-2 mb-3">
          <Lightbulb size={20} className="text-accent-600" />给家长的建议
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {errorCount > 0 ? (
            <>
              <li className="flex gap-2"><span className="text-accent-600">•</span>建议陪孩子一起看看错题，理解出错原因比做对一道题更重要。</li>
              <li className="flex gap-2"><span className="text-accent-600">•</span>对于概念性错误，可以结合生活实例帮助孩子理解，避免死记硬背。</li>
              <li className="flex gap-2"><span className="text-accent-600">•</span>多鼓励少批评，看到孩子的进步，建立学习信心。</li>
            </>
          ) : (
            <li className="flex gap-2"><span className="text-accent-600">•</span>本次作业全部正确，非常棒！可以适当给一些拓展题提升思维能力。</li>
          )}
        </ul>
      </div>

      <div className="mt-6 text-center">
        <Link href={`/parent/child/${studentId}/report`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all">
          查看完整学习报告 <ArrowLeft size={18} className="rotate-180" />
        </Link>
      </div>
    </div>
  );
}
