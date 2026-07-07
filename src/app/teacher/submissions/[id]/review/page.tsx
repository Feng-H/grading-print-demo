'use client';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import PaperCanvas from '@/components/annotate/PaperCanvas';
import AnnotationToolbar from '@/components/annotate/AnnotationToolbar';
import { useAnnotations } from '@/components/annotate/useAnnotations';
import PrintButton from '@/components/print/PrintButton';
import { ChevronLeft, Check, User, FileText, RotateCw, Save } from 'lucide-react';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data, error, isLoading, mutate } = useSWR(id ? `/api/submissions/${id}/full` : null, fetcher, {
    refreshInterval: 5000,
  });

  const {
    annotations, addAnnotation, updateAnnotation, deleteAnnotation, dirty, flushSave,
  } = useAnnotations(id);

  const [currentPage, setCurrentPage] = React.useState(0);
  const [selectedTool, setSelectedTool] = React.useState('select');
  const [selectedColor, setSelectedColor] = React.useState('#E11D48');
  const [strokeWidth, setStrokeWidth] = React.useState(2);
  const [editingScore, setEditingScore] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);

  // 当数据加载完成，初始化当前页
  React.useEffect(() => {
    if (data?.pages) setCurrentPage(0);
  }, [id, data]);

  const handleApprove = async () => {
    if (dirty) await flushSave();
    setSaving(true);
    await fetch(`/api/submissions/${id}/approve`, { method: 'POST' });
    mutate();
    setSaving(false);
    alert('已确认');
  };

  const handleScoreChange = async (questionId: string, newScore: number) => {
    setEditingScore(prev => ({ ...prev, [questionId]: newScore }));
    // 简单更新 - 实际应该调用API更新GradingResult，v1暂不实现复杂分数编辑
  };

  if (isLoading) return <div className="p-8 text-center">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">加载失败: {error.message}</div>;
  if (!data) return <div className="p-8 text-center">未找到</div>;

  const { submission, pages, questions, gradingResults, pdfs } = data;

  const pageImg = pages[currentPage]?.imageUrl;
  const studentName = submission.student?.name || submission.sheet?.detectedName || '未识别学生';
  const isApproved = !!submission.teacherApprovedAt;
  const isRendering = submission.status === 'rendering' || submission.status === 'annotated' || submission.status === 'grading' || submission.status === 'ocr';

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部栏 */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="font-semibold flex items-center gap-2">
              <User size={16} /> {studentName}
            </h1>
            <div className="text-xs text-gray-500">
              状态: {submission.status} · 得分: {submission.totalScore ?? '-'}/{submission.maxScore}
              {isApproved && <span className="ml-2 text-green-600">已确认</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-orange-600 flex items-center gap-1">
              <Save size={12} /> 自动保存中...
            </span>
          )}
          <button
            onClick={handleApprove}
            disabled={isApproved || saving || isRendering}
            className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            <Check size={16} /> {isApproved ? '已确认' : '确认通过'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：页面缩略图 */}
        <div className="w-24 bg-white border-r p-2 overflow-y-auto flex-shrink-0">
          <div className="space-y-2">
            {pages.map((p: any, i: number) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-full block rounded overflow-hidden border-2 transition ${
                  currentPage === i ? 'border-red-500' : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img src={p.imageUrl} className="w-full h-auto" />
                <div className="text-xs py-0.5 bg-gray-50">
                  第{i+1}页{i%2===0?'(正)':'(反)'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 中间：画布 */}
        <div className="flex-1 flex">
          <div className="p-2 flex-shrink-0">
            <AnnotationToolbar
              selectedTool={selectedTool}
              onSelectTool={setSelectedTool}
              color={selectedColor}
              onColorChange={setSelectedColor}
              strokeWidth={strokeWidth}
              onStrokeWidthChange={setStrokeWidth}
            />
          </div>
          <div className="flex-1 p-4">
            {pageImg ? (
              <PaperCanvas
                pageImageUrl={pageImg}
                annotations={annotations}
                currentPage={currentPage}
                selectedTool={selectedTool}
                selectedColor={selectedColor}
                strokeWidth={strokeWidth}
                onAddAnnotation={addAnnotation}
                onUpdateAnnotation={updateAnnotation}
                onDeleteAnnotation={deleteAnnotation}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">页面加载失败</div>
            )}
          </div>
        </div>

        {/* 右栏 */}
        <div className="w-80 bg-white border-l overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-4">
            {/* 学生信息 */}
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">学生身份</div>
              <div className="p-2 bg-gray-50 rounded flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                <span className="font-medium">{studentName}</span>
              </div>
            </div>

            {/* 总分 */}
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">总分</div>
              <div className="text-3xl font-bold text-red-600">
                {submission.totalScore ?? '-'}<span className="text-lg text-gray-400">/{submission.maxScore}</span>
              </div>
            </div>

            {/* 打印按钮 */}
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                <FileText size={14} /> 打印
                {isRendering && <RotateCw size={12} className="animate-spin text-orange-500" />}
              </div>
              <PrintButton submissionId={id} pdfs={pdfs} onPrint={() => mutate()} />
            </div>

            {/* 题目列表 */}
            <div>
              <div className="text-sm font-medium text-gray-500 mb-2">题目批改详情</div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {gradingResults.map((r: any) => {
                  const q = questions.find((qq: any) => qq.id === r.questionId);
                  if (!q) return null;
                  return (
                    <div key={r.id} className={`p-2 rounded border ${r.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium">第{q.order+1}题 ({q.type})</span>
                        <span className={`text-sm font-bold ${r.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {r.score}/{r.maxScore}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">{q.content}</div>
                      {r.comment && <div className="text-xs mt-1 text-gray-700">💬 {r.comment}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
