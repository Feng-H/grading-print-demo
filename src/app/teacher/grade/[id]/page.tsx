'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  CheckCircle2, XCircle, Loader2, Brain, Send, Edit3, Save,
  Clock, User, Award, AlertTriangle, ChevronRight
} from 'lucide-react';
import { getHomeworkById, sampleSubmission, sampleGradingResults } from '@/lib/mock-data';
import type { GradingResult } from '@/types';

const questionTypeMap: Record<string, string> = {
  choice: '选择题',
  judge: '判断题',
  fill: '填空题',
  math: '数学解答题',
  short_answer: '简答题',
  essay: '作文',
};

export default function GradePage() {
  const params = useParams();
  const router = useRouter();
  const homeworkId = params.id as string;
  const homework = getHomeworkById(homeworkId) || getHomeworkById('hw1')!;

  const [grading, setGrading] = useState(false);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [results, setResults] = useState<GradingResult[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editComment, setEditComment] = useState('');
  const [published, setPublished] = useState(false);
  const [error, setError] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0);

  // 真实AI批改 - 调用后端API
  const startGrading = async () => {
    setGrading(true);
    setGradingProgress(10);
    setResults([]);
    setError('');
    setWarningMsg('');

    // 构造请求参数
    const answers: Record<string, string> = {};
    sampleSubmission.answers.forEach(a => {
      answers[a.questionId] = a.answer;
    });

    // 进度动画
    const progressInterval = setInterval(() => {
      setGradingProgress(prev => Math.min(prev + Math.random() * 8 + 3, 85));
    }, 500);

    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: homework.questions.map(q => ({
            id: q.id,
            type: q.type,
            content: q.content,
            options: q.options,
            correctAnswer: q.correctAnswer,
            score: q.score,
            knowledgePointName: q.knowledgePointName,
          })),
          answers,
        }),
      });

      clearInterval(progressInterval);
      setGradingProgress(95);

      if (!response.ok) {
        throw new Error('批改请求失败');
      }

      const data = await response.json();

      if (data.warning) {
        setWarningMsg(data.warning);
      }

      setGradingProgress(100);
      setTimeout(() => {
        setResults(data.results as GradingResult[]);
        setGrading(false);
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Grading error:', err);
      setError('AI批改失败，请稍后重试，或手动批阅。');
      setGrading(false);
      // 降级：使用Mock结果
      setResults(sampleGradingResults as GradingResult[]);
    }
  };

  const handleEdit = (result: GradingResult) => {
    setEditingId(result.questionId);
    setEditScore(result.score);
    setEditComment(result.comment);
  };

  const handleSaveEdit = (questionId: string) => {
    setResults(prev => prev.map(r =>
      r.questionId === questionId
        ? { ...r, score: editScore, comment: editComment, isCorrect: editScore >= r.maxScore * 0.6 }
        : r
    ));
    setEditingId(null);
  };

  const handlePublish = () => {
    setPublished(true);
    setTimeout(() => {
      router.push('/teacher/analytics');
    }, 1500);
  };

  if (!homework) {
    return <div>作业不存在</div>;
  }

  const studentAnswerMap = Object.fromEntries(
    sampleSubmission.answers.map(a => [a.questionId, a.answer])
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar role="teacher" title="AI智能批改" showBack backUrl="/teacher" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
        {/* 作业信息头部 */}
        <div className="bg-white rounded-2xl border border-border p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl font-bold">{homework.title}</h1>
                <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  {homework.className}
                </span>
              </div>
              <p className="text-muted-foreground">{homework.description}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User size={16} /> 学生：张小明
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={16} /> 提交时间：{sampleSubmission.submitTime}
                </span>
                <span>共{homework.questions.length}题，满分{homework.totalScore}分</span>
              </div>
            </div>

            <div className="flex gap-2">
              {results.length === 0 && !grading && (
                <button
                  onClick={startGrading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-primary text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all"
                >
                  <Brain size={20} />
                  开始AI批改
                </button>
              )}
              {results.length > 0 && !published && (
                <button
                  onClick={handlePublish}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent-500 to-accent-400 text-white rounded-xl font-medium shadow-lg shadow-accent-500/25 hover:shadow-xl transition-all"
                >
                  <Send size={18} />
                  发布给家长
                </button>
              )}
            </div>
          </div>

          {/* 警告提示（未配置API Key） */}
          {warningMsg && !grading && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              ⚠️ {warningMsg}
            </div>
          )}

          {/* 错误提示 */}
          {error && !grading && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* 批改中进度条 */}
          {grading && (
            <div className="mt-6 p-4 rounded-xl bg-primary-50 border border-primary-100">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 size={20} className="text-primary-600 animate-spin" />
                <span className="font-medium text-primary-800">AI正在批改中，请稍候...</span>
                <span className="text-primary-600 font-bold ml-auto">{Math.round(gradingProgress)}%</span>
              </div>
              <div className="w-full h-3 bg-primary-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-300"
                  style={{ width: `${gradingProgress}%` }}
                />
              </div>
              <p className="text-xs text-primary-600 mt-2">
                正在识别答案 → 判断正误 → 生成评语 → 分析错误原因
              </p>
            </div>
          )}

          {/* 批改结果总结 */}
          {results.length > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-xl bg-primary-50">
                <div className="text-3xl font-bold text-primary-700">{totalScore}<span className="text-lg text-primary-500">/{maxScore}</span></div>
                <div className="text-sm text-muted-foreground mt-1">总分</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-green-50">
                <div className="text-3xl font-bold text-green-700">{results.filter(r => r.isCorrect).length}</div>
                <div className="text-sm text-muted-foreground mt-1">正确</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-red-50">
                <div className="text-3xl font-bold text-red-700">{results.filter(r => !r.isCorrect).length}</div>
                <div className="text-sm text-muted-foreground mt-1">错误</div>
              </div>
            </div>
          )}

          {published && (
            <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3 text-green-700">
              <CheckCircle2 size={20} />
              <span className="font-medium">已成功发布！家长可查看批改结果，正在跳转到学情分析...</span>
            </div>
          )}
        </div>

        {/* 题目列表 */}
        <div className="space-y-4">
          {homework.questions.map((q, idx) => {
            const studentAnswer = studentAnswerMap[q.id] || '';
            const result = results.find(r => r.questionId === q.id);
            const isEditing = editingId === q.id;

            return (
              <div key={q.id} className="bg-white rounded-2xl border border-border overflow-hidden animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                {/* 题目标题 */}
                <div className="p-5 border-b border-border flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                        {questionTypeMap[q.type]}
                      </span>
                      <span className="text-xs text-muted-foreground">知识点：{q.knowledgePointName}</span>
                      <span className="text-xs text-muted-foreground">满分{q.score}分</span>
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

                  {result && (
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      result.isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                    }`}>
                      {result.isCorrect ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
                    </div>
                  )}
                </div>

                {/* 学生答案 */}
                <div className="p-5 bg-muted/20 border-b border-border">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">学生答案：</div>
                  <p className="text-sm">{studentAnswer || <span className="text-muted-foreground">未作答</span>}</p>
                </div>

                {/* 批改结果 */}
                {result && !isEditing && (
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Award size={18} className="text-primary-600" />
                        <span className="font-bold text-lg">
                          <span className={result.isCorrect ? 'text-green-600' : 'text-red-600'}>{result.score}</span>
                          <span className="text-muted-foreground text-sm font-normal">/{result.maxScore}分</span>
                        </span>
                      </div>
                      {!published && (
                        <button
                          onClick={() => handleEdit(result)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary-600 transition-colors"
                        >
                          <Edit3 size={16} /> 修改
                        </button>
                      )}
                    </div>

                    {result.errorType && (
                      <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-3">
                        <AlertTriangle size={16} />
                        <span>错误类型：
                          {result.errorType === 'concept' ? '概念理解错误' :
                           result.errorType === 'calculation' ? '计算错误' :
                           result.errorType === 'careless' ? '粗心错误' : '表达不规范'}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-sm">
                      <Brain size={16} className="text-primary-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-primary-700">AI评语：</span>
                        <span className="text-muted-foreground">{result.comment}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-border text-sm">
                      <span className="text-green-700 font-medium">正确答案：</span>
                      <span className="text-muted-foreground">{result.correctAnswer}</span>
                    </div>
                  </div>
                )}

                {/* 编辑模式 */}
                {isEditing && (
                  <div className="p-5 bg-amber-50/50">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">分数（满分{result?.maxScore}分）</label>
                        <input
                          type="number"
                          min="0"
                          max={result?.maxScore}
                          value={editScore}
                          onChange={e => setEditScore(Number(e.target.value))}
                          className="w-24 px-3 py-2 rounded-lg border border-border focus:border-primary-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">评语</label>
                        <textarea
                          value={editComment}
                          onChange={e => setEditComment(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 outline-none resize-none"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 rounded-lg border border-border hover:bg-white transition-colors text-sm"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleSaveEdit(q.id)}
                          className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
                        >
                          <Save size={16} /> 保存修改
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 未批改状态提示 */}
                {!result && !grading && (
                  <div className="p-8 text-center text-muted-foreground">
                    等待批改...
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 下一页 */}
        {results.length > 0 && !published && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">当前已批改：张小明的作业</p>
            <button
              onClick={handlePublish}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
            >
              确认发布给家长 <ChevronRight size={20} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
