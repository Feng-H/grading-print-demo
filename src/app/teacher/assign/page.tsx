'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, Calendar, Check, X, Plus, Trash2,
  FileUp, Sparkles, Loader2, ChevronRight,
  AlertCircle, Edit3, Wand2, Award, ArrowLeft, User,
} from 'lucide-react';
import { pdfToDataUrls, fileToDataUrl } from './pdf-client';
import { compressImage, dataUrlSizeKB, rotateCanvas90 } from './image-utils';

type Step = 1 | 2 | 3 | 4 | 5;
type QType = 'choice' | 'judge' | 'fill' | 'math' | 'short_answer' | 'essay';

interface ClassItem { id: string; name: string; grade: string; subject: string; studentCount: number; }
interface StudentItem { id: string; name: string; avatar: string; studentNo: string; className: string; }
interface RecognizedQuestion {
  tempId: string;
  number: number;
  type: QType;
  content: string;
  options: string[] | null;
  studentAnswer: string;
  correctAnswer: string;
  score: number;
  knowledgePointName: string;
  confidence: number;
}
interface PaperInfo {
  title: string;
  subject: string;
  studentName: string;
  className: string;
  studentNo: string | null;
  questions: RecognizedQuestion[];
  avgConfidence: number;
}

const TYPE_LABELS: Record<QType, string> = {
  choice: '选择题', judge: '判断题', fill: '填空题',
  math: '数学解答', short_answer: '简答题', essay: '作文题',
};

function genId() { return 'q_' + Math.random().toString(36).slice(2, 10); }

export default function AssignHomework() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('数学');
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [deadline, setDeadline] = useState('');
  const [fileItems, setFileItems] = useState<{ id: string; name: string; url: string; kind: 'image' | 'pdf-page' }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState({ done: 0, total: 0 });
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [paper, setPaper] = useState<PaperInfo | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeProgress, setGradeProgress] = useState(0);
  const [gradeResults, setGradeResults] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载班级和学生
  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(d => {
      if (d.classes?.length) {
        setClassList(d.classes);
        setSelectedClass(d.classes[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    fetch(`/api/students?classId=${selectedClass}`).then(r => r.json()).then(d => {
      setStudents(d.students || []);
    }).catch(() => {});
  }, [selectedClass]);

  const addImage = useCallback(async (file: File) => {
    try {
      if (file.type === 'application/pdf') {
        const pages = await pdfToDataUrls(file, 1.2);
        pages.forEach((url, i) => {
          console.log(`PDF页${i+1}压缩后大小: ${dataUrlSizeKB(url)}KB`);
        });
        setFileItems(prev => [
          ...prev,
          ...pages.map((url, i) => ({
            id: `${file.name}-${i}-${Date.now()}-${i}`,
            name: pages.length > 1 ? `${file.name}（第${i+1}页）` : file.name,
            url, kind: 'pdf-page' as const,
          })),
        ]);
      } else if (file.type.startsWith('image/')) {
        // EXIF自动旋转+压缩
        const { dataUrl: url, rotated } = await compressImage(file, 1600, 0.8);
        const sizeKB = dataUrlSizeKB(url);
        // 如果压缩后还大，再压一次
        let finalUrl = url;
        if (sizeKB > 1500) {
          // 把dataURL转回Blob再压
          const resp = await fetch(url);
          const blob = await resp.blob();
          const r2 = await compressImage(blob, 1280, 0.7);
          finalUrl = r2.dataUrl;
        }
        console.log(`图片处理完成: ${dataUrlSizeKB(finalUrl)}KB, EXIF自动旋转:${rotated}`);
        setFileItems(prev => [...prev, {
          id: `${file.name}-${Date.now()}`, name: file.name + (rotated ? ' (已自动旋转)' : ''), url: finalUrl, kind: 'image' as const,
        }]);
      } else {
        setErrorMsg('不支持的文件类型，请上传JPG/PNG图片或PDF');
      }
    } catch (e: any) {
      setErrorMsg('文件处理失败: ' + (e.message || ''));
    }
  }, []);

  const handleFiles = (files: FileList | File[]) => {
    setErrorMsg('');
    const arr = Array.from(files);
    arr.forEach(f => addImage(f));
  };

  const removeFile = (id: string) => {
    setFileItems(prev => prev.filter(f => f.id !== id));
  };

  // 手动旋转图片90度
  const rotateFile = async (id: string) => {
    const item = fileItems.find(f => f.id === id);
    if (!item) return;
    // dataURL -> Image -> Canvas -> rotate
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('img load error'));
      img.src = item.url;
    });
    const src = document.createElement('canvas');
    src.width = img.naturalWidth;
    src.height = img.naturalHeight;
    src.getContext('2d')!.drawImage(img, 0, 0);
    const newUrl = rotateCanvas90(src, true);
    setFileItems(prev => prev.map(f => f.id === id ? { ...f, url: newUrl } : f));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const startParse = async () => {
    if (fileItems.length === 0) {
      setErrorMsg('请先上传作业照片或PDF');
      return;
    }
    setErrorMsg('');
    setParsing(true);
    setStep(2);
    setParseProgress({ done: 0, total: fileItems.length });
    setParseWarnings([]);

    try {
      const resp = await fetch('/api/upload/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: fileItems.map(f => f.url),
          classHint: classList.find(c => c.id === selectedClass)?.name,
          subjectHint: subject,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || '识别失败');
      }

      const p = data.paper;
      const questions: RecognizedQuestion[] = p.questions.map((q: any, i: number) => ({
        tempId: genId(),
        number: q.number || i + 1,
        type: q.type || 'fill',
        content: q.content,
        options: q.options,
        studentAnswer: q.studentAnswer,
        correctAnswer: q.suggestedCorrectAnswer || '',
        score: q.type === 'math' || q.type === 'short_answer' || q.type === 'essay' ? 10 : 5,
        knowledgePointName: inferKp(q.type, q.content),
        confidence: q.confidence || 0.5,
      }));

      // AI识别的title/subject/className回填到表单
      const recognizedTitle = p.title || '作业';
      const recognizedSubject = p.subject || '数学';
      setTitle(recognizedTitle);
      setSubject(recognizedSubject);

      // 尝试匹配班级
      let matchedClassId = selectedClass;
      if (p.className) {
        const cls = classList.find(c => c.name === p.className.trim());
        if (cls) matchedClassId = cls.id;
      }
      setSelectedClass(matchedClassId);
      // 等学生列表加载后再尝试匹配学生
      setTimeout(async () => {
        try {
          const stu = await fetch(`/api/students?classId=${matchedClassId}`).then(r => r.json());
          if (stu.students) {
            setStudents(stu.students);
            if (p.studentName) {
              const matched = stu.students.find((s: StudentItem) => s.name === p.studentName.trim());
              if (matched) setSelectedStudentId(matched.id);
            }
          }
        } catch {}
      }, 100);

      setPaper({
        title: recognizedTitle,
        subject: recognizedSubject,
        studentName: p.studentName || '',
        className: p.className || '',
        studentNo: p.studentNo,
        questions,
        avgConfidence: p.avgConfidence,
      });
      setParseWarnings(data.warnings || []);

      setStep(3);
    } catch (e: any) {
      setErrorMsg(e.message || '识别失败，请重试');
      setStep(1);
    } finally {
      setParsing(false);
    }
  };

  const inferKp = (type: string, content: string): string => {
    if (content.includes('+') || content.includes('-') || content.includes('×') || content.includes('÷') || content.includes('计算')) return '计算能力';
    if (content.includes('千克') || content.includes('克') || content.includes('米') || content.includes('厘米')) return '单位认识';
    if (content.includes('平行') || content.includes('三角') || content.includes('长方') || content.includes('正方') || content.includes('图形')) return '图形认识';
    if (type === 'choice') return '概念理解';
    if (type === 'judge') return '概念判断';
    return '综合应用';
  };

  const updateQuestion = (tid: string, patch: Partial<RecognizedQuestion>) => {
    if (!paper) return;
    setPaper({
      ...paper,
      questions: paper.questions.map(q => q.tempId === tid ? { ...q, ...patch } : q),
    });
  };

  const addQuestion = () => {
    if (!paper) return;
    const nq: RecognizedQuestion = {
      tempId: genId(), number: paper.questions.length + 1,
      type: 'fill', content: '', options: null, studentAnswer: '',
      correctAnswer: '', score: 5, knowledgePointName: '综合应用', confidence: 1,
    };
    setPaper({ ...paper, questions: [...paper.questions, nq] });
  };

  const removeQuestion = (tid: string) => {
    if (!paper) return;
    const qs = paper.questions.filter(q => q.tempId !== tid).map((q, i) => ({ ...q, number: i + 1 }));
    setPaper({ ...paper, questions: qs });
  };

  const addOption = (tid: string) => {
    if (!paper) return;
    setPaper({
      ...paper,
      questions: paper.questions.map(q => {
        if (q.tempId !== tid) return q;
        const opts = [...(q.options || []), ''];
        return { ...q, options: opts, type: 'choice' };
      }),
    });
  };

  const updateOption = (tid: string, idx: number, val: string) => {
    if (!paper) return;
    setPaper({
      ...paper,
      questions: paper.questions.map(q => {
        if (q.tempId !== tid || !q.options) return q;
        const opts = [...q.options];
        opts[idx] = val;
        return { ...q, options: opts };
      }),
    });
  };

  const removeOption = (tid: string, idx: number) => {
    if (!paper) return;
    setPaper({
      ...paper,
      questions: paper.questions.map(q => {
        if (q.tempId !== tid || !q.options) return q;
        const opts = q.options.filter((_, i) => i !== idx);
        return { ...q, options: opts.length ? opts : null, type: opts.length ? 'choice' : q.type };
      }),
    });
  };

  const startGrading = async () => {
    if (!paper) return;
    const student = students.find(s => s.id === selectedStudentId);
    if (!paper.studentName.trim()) {
      setErrorMsg('请填写学生姓名（或在右侧选择学生）');
      return;
    }
    if (!student && selectedStudentId) {
      setErrorMsg('请确认学生信息');
      return;
    }
    setErrorMsg('');
    setWarningMsg('');
    setGrading(true);
    setGradeProgress(0);

    const answersMap: Record<string, string> = {};
    paper.questions.forEach(q => { answersMap[q.tempId] = q.studentAnswer; });

    // 进度动画
    const totalQ = paper.questions.length;
    let done = 0;
    const progressTimer = setInterval(() => {
      done = Math.min(done + 1, totalQ);
      setGradeProgress(Math.round((done / totalQ) * 90));
    }, 500);

    try {
      const resp = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: paper.questions.map(q => ({
            id: q.tempId,
            type: q.type,
            content: q.content,
            options: q.options,
            correctAnswer: q.correctAnswer,
            score: q.score,
            knowledgePointName: q.knowledgePointName,
            vlSuggestedAnswer: q.correctAnswer,
          })),
          answers: answersMap,
        }),
      });
      const data = await resp.json();
      clearInterval(progressTimer);
      setGradeProgress(100);
      if (!resp.ok) throw new Error(data.error || '批改失败');
      if (data.warning) setWarningMsg(data.warning);
      setGradeResults(data.results || []);
      setStep(4);
    } catch (e: any) {
      clearInterval(progressTimer);
      setErrorMsg(e.message || '批改失败');
    } finally {
      setGrading(false);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editComment, setEditComment] = useState('');

  const beginEdit = (r: any) => {
    setEditingId(r.questionId);
    setEditScore(r.score);
    setEditComment(r.comment);
  };
  const saveEdit = (qid: string) => {
    setGradeResults(prev => prev.map(r => {
      if (r.questionId !== qid) return r;
      const q = paper?.questions.find(x => x.tempId === qid);
      return { ...r, score: editScore, comment: editComment, isCorrect: editScore >= (q?.score || r.maxScore) * 0.6 };
    }));
    setEditingId(null);
  };

  const handlePublish = async () => {
    if (!paper) return;
    setPublishing(true);
    try {
      const student = students.find(s => s.id === selectedStudentId) || {
        id: 'new-' + Date.now(), name: paper.studentName,
      };
      const answersMap: Record<string, string> = {};
      paper.questions.forEach(q => { answersMap[q.tempId] = q.studentAnswer; });

      const resp = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: paper.questions.map(q => {
            const gr = gradeResults.find(r => r.questionId === q.tempId);
            return {
              id: q.tempId, type: q.type, content: q.content,
              options: q.options, correctAnswer: gr?.correctAnswer || q.correctAnswer,
              score: q.score, knowledgePointName: q.knowledgePointName,
            };
          }),
          answers: answersMap,
          persist: true,
          paperInfo: {
            homeworkTitle: title,
            homeworkDescription: `通过AI识别批改上传 · 学生：${paper.studentName}`,
            subject,
            classId: selectedClass,
            deadline: deadline || undefined,
            studentId: student.id,
            studentName: paper.studentName,
            sourceImages: fileItems.map(f => f.url.length < 200_000 ? f.url : ''), // 限制避免DB超大
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || '保存失败');

      setStep(5);
      setTimeout(() => router.push('/teacher/analytics'), 1500);
    } catch (e: any) {
      setErrorMsg(e.message || '发布失败');
    } finally {
      setPublishing(false);
    }
  };

  const totalMax = gradeResults.reduce((s, r) => s + r.maxScore, 0);
  const totalGot = gradeResults.reduce((s, r) => s + r.score, 0);

  return (
    <div className="animate-fade-in -mx-4 sm:-mx-6 -mt-6">
      {/* 页面头部 - 带返回按钮 */}
      <div className="sticky top-16 z-30 bg-white/90 backdrop-blur border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between">
        <button onClick={() => step > 1 ? setStep((step - 1) as Step) : router.push('/teacher')}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} />
          <span className="text-sm">{step > 1 ? '返回上一步' : '返回工作台'}</span>
        </button>
        <h1 className="font-semibold text-sm sm:text-base">
          {step === 1 ? '上传作业 · AI批改' : step === 2 ? 'AI识别中' : step === 3 ? '确认识别结果' : step === 4 ? '批改结果' : '发布完成'}
        </h1>
        <div className="w-16" />
      </div>

      <div className="px-4 sm:px-6 py-6">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-6 gap-1 sm:gap-2 flex-wrap">
          {[
            { n: 1, label: '上传试卷' },
            { n: 2, label: 'AI识别' },
            { n: 3, label: '确认修改' },
            { n: 4, label: '批改结果' },
            { n: 5, label: '发布完成' },
          ].map((s, i) => {
            const active = step === s.n;
            const done = step > s.n;
            return (
              <div key={s.n} className="flex items-center">
                <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  active ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' :
                  done ? 'bg-primary-100 text-primary-700' : 'bg-muted text-muted-foreground'
                }`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    active ? 'bg-white/20' : done ? 'bg-primary-500 text-white' : 'bg-border'
                  }`}>{done ? <Check size={12} /> : s.n}</div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < 4 && <div className={`w-4 sm:w-8 h-0.5 ${done ? 'bg-primary-300' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={18} />{errorMsg}
            <button onClick={() => setErrorMsg('')} className="ml-auto"><X size={16} /></button>
          </div>
        )}
        {warningMsg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm flex items-center gap-2">
            <AlertCircle size={18} />{warningMsg}
          </div>
        )}

        {/* Step 1: 上传 */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <Upload size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">上传学生试卷</h2>
                  <p className="text-sm text-muted-foreground">AI将自动识别作业名称、科目、班级、学生姓名和所有题目答案</p>
                </div>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-300 hover:bg-primary-50/30'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/20">
                  <FileUp size={28} className="text-white" />
                </div>
                <p className="font-medium text-base mb-1">点击或拖拽文件到此处上传</p>
                <p className="text-sm text-muted-foreground mb-3">支持 JPG/PNG 照片、PDF 文档（可多页，可一次选多张）</p>
                <p className="text-xs text-primary-600">💡 拍照建议：光线充足、正对试卷、文字清晰可辨</p>
                <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf"
                  className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
              </div>

              {fileItems.length > 0 && (
                <div className="mt-5">
                  <div className="text-sm text-muted-foreground mb-3">
                    已添加 {fileItems.length} 个文件/页面
                    <span className="ml-2 text-xs text-primary-600">💡 图片如果方向不对，把鼠标移到图片上点↻按钮旋转</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {fileItems.map(f => (
                      <div key={f.id} className="relative group rounded-xl overflow-hidden border border-border bg-muted">
                        <img src={f.url} alt={f.name} className="w-full h-32 object-contain bg-white" />
                        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); rotateFile(f.id); }}
                            className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-primary-600" title="旋转90度">
                            ↻
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                            className="w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600" title="删除">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">{f.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl border border-primary-100 p-5 flex items-start gap-3">
              <Sparkles size={20} className="text-primary-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-primary-900 mb-1">AI会帮你做什么？</p>
                <ul className="text-primary-700 space-y-0.5">
                  <li>✓ 自动识别学生姓名、班级</li>
                  <li>✓ 识别每道题目和学生的手写答案</li>
                  <li>✓ 自动批改客观题（选择/判断/填空），主观题给出智能评分和评语</li>
                  <li>✓ 所有结果你都可以预览和人工修改后再发布</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => router.back()}
                className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors">
                取消
              </button>
              <button onClick={startParse} disabled={parsing || fileItems.length === 0}
                className="flex-1 sm:flex-none px-8 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {parsing ? <><Loader2 size={18} className="animate-spin" /> 开始识别...</> : <><Wand2 size={18} /> 开始AI识别 <ChevronRight size={18} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 识别中 */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-border p-10 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-5 relative">
              <Sparkles size={32} className="text-primary-600 animate-pulse" />
              <div className="absolute inset-0 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI 正在识别试卷...</h3>
            <p className="text-muted-foreground mb-6">正在识别第 {parseProgress.done + 1}/{parseProgress.total} 页，请稍候</p>
            <div className="w-full max-w-sm mx-auto h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary transition-all duration-500"
                style={{ width: `${Math.round((parseProgress.done / Math.max(1, parseProgress.total)) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              💡 小提示：识别手写内容需要一点时间，通常每页5-15秒
            </p>
          </div>
        )}

        {/* Step 3: 确认识别结果 */}
        {step === 3 && paper && (
          <div className="space-y-5 animate-fade-in">
            {/* 作业信息（AI识别，可修改） */}
            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary-600" />
                作业信息 <span className="text-xs font-normal text-muted-foreground ml-2">AI自动识别，可修改</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">作业名称</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">科目</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-white">
                      <option>数学</option><option>语文</option><option>英语</option><option>科学</option><option>其他</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">所属班级</label>
                    <select value={selectedClass} onChange={e => {
                      setSelectedClass(e.target.value);
                      fetch(`/api/students?classId=${e.target.value}`).then(r=>r.json()).then(d=>setStudents(d.students||[]));
                    }}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-white">
                      {classList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      {classList.length === 0 && <option value="">加载中...</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                      <Calendar size={16} /> 截止日期
                    </label>
                    <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User size={20} className="text-primary-600" />
                学生信息
                {paper.avgConfidence < 0.6 && (
                  <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">识别置信度较低，请确认</span>
                )}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">学生姓名</label>
                  <input type="text" value={paper.studentName}
                    onChange={e => setPaper({ ...paper, studentName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    从班级名单选择（自动填充）
                  </label>
                  <select value={selectedStudentId}
                    onChange={e => {
                      const s = students.find(x => x.id === e.target.value);
                      setSelectedStudentId(e.target.value);
                      if (s) setPaper({ ...paper, studentName: s.name, className: s.className, studentNo: s.studentNo });
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none bg-white">
                    <option value="">—— 手动输入或选择 ——</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.studentNo} {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">班级</label>
                  <input type="text" value={paper.className}
                    onChange={e => setPaper({ ...paper, className: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">学号</label>
                  <input type="text" value={paper.studentNo || ''}
                    onChange={e => setPaper({ ...paper, studentNo: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-border p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Edit3 size={20} className="text-primary-600" />
                  题目与答案 <span className="text-sm font-normal text-muted-foreground">共 {paper.questions.length} 题</span>
                </h2>
                <button onClick={addQuestion}
                  className="text-sm px-3 py-1.5 rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 flex items-center gap-1">
                  <Plus size={16} /> 添加题目
                </button>
              </div>

              <div className="space-y-4">
                {paper.questions.map((q, idx) => (
                  <div key={q.tempId} className={`rounded-xl border p-4 ${q.confidence < 0.5 ? 'border-amber-200 bg-amber-50/30' : 'border-border bg-white'}`}>
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <select value={q.type} onChange={e => updateQuestion(q.tempId, { type: e.target.value as QType })}
                          className="text-sm px-2 py-1 rounded-lg border border-border bg-white">
                          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <div className="flex items-center gap-1">
                          <input type="number" min={1} max={100} value={q.score}
                            onChange={e => updateQuestion(q.tempId, { score: Number(e.target.value) })}
                            className="w-14 text-sm px-2 py-1 rounded-lg border border-border text-center" />
                          <span className="text-sm text-muted-foreground">分</span>
                        </div>
                        <input type="text" value={q.knowledgePointName}
                          onChange={e => updateQuestion(q.tempId, { knowledgePointName: e.target.value })}
                          placeholder="知识点" className="text-sm px-2 py-1 rounded-lg border border-border w-24 sm:w-auto" />
                        {q.confidence < 0.5 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">识别模糊，请核对</span>
                        )}
                      </div>
                      <button onClick={() => removeQuestion(q.tempId)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">题目内容</label>
                        <textarea value={q.content} rows={2}
                          onChange={e => updateQuestion(q.tempId, { content: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-border focus:border-primary-500 outline-none text-sm resize-none" />
                      </div>

                      {(q.type === 'choice') && (
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1 flex items-center justify-between">
                            <span>选项</span>
                            <button onClick={() => addOption(q.tempId)} className="text-primary-600 hover:underline"><Plus size={12} className="inline" /> 添加</button>
                          </label>
                          <div className="space-y-1.5">
                            {(q.options || []).map((opt, oi) => (
                              <div key={oi} className="flex gap-2">
                                <input type="text" value={opt} onChange={e => updateOption(q.tempId, oi, e.target.value)}
                                  className="flex-1 px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary-500"
                                  placeholder={`${String.fromCharCode(65 + oi)}. 选项内容`} />
                                <button onClick={() => removeOption(q.tempId, oi)}
                                  className="p-2 rounded-lg text-muted-foreground hover:text-red-600"><X size={16} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            学生答案 {q.type !== 'choice' && q.type !== 'judge' && q.type !== 'fill' && <span className="text-amber-600">（手写识别，请仔细核对）</span>}
                          </label>
                          <textarea value={q.studentAnswer} rows={q.type === 'math' || q.type === 'short_answer' ? 2 : 1}
                            onChange={e => updateQuestion(q.tempId, { studentAnswer: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border focus:border-primary-500 outline-none text-sm resize-none bg-blue-50/30" />
                        </div>
                        <div>
                          <label className="block text-xs text-muted-foreground mb-1">
                            标准答案 {q.type === 'math' || q.type === 'short_answer' || q.type === 'essay' ? <span className="text-primary-600">（AI会综合参考答案评分）</span> : ''}
                          </label>
                          <textarea value={q.correctAnswer} rows={q.type === 'math' || q.type === 'short_answer' ? 2 : 1}
                            onChange={e => updateQuestion(q.tempId, { correctAnswer: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-border focus:border-primary-500 outline-none text-sm resize-none bg-green-50/30" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {parseWarnings.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
                  <p className="font-medium mb-1">识别警告：</p>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    {parseWarnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              <button onClick={() => { setStep(1); }}
                className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted flex items-center gap-1">
                <ArrowLeft size={16} /> 返回修改上传
              </button>
              <button onClick={startGrading} disabled={grading}
                className="flex-1 sm:flex-none px-8 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2">
                {grading ? <><Loader2 size={18} className="animate-spin" /> AI批改中...</> : <><Wand2 size={18} /> 确认并开始AI批改 <ChevronRight size={18} /></>}
              </button>
            </div>

            {grading && (
              <div className="bg-white rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 size={20} className="text-primary-600 animate-spin" />
                  <span className="font-medium">正在批改第 {Math.min(Math.ceil(gradeProgress / 100 * paper.questions.length) + 1, paper.questions.length)}/{paper.questions.length} 题...</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary transition-all" style={{ width: `${gradeProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: 批改结果 */}
        {step === 4 && paper && (
          <div className="space-y-5 animate-fade-in">
            <div className="bg-gradient-to-br from-primary-500 to-accent-500 text-white rounded-2xl p-6 shadow-xl shadow-primary-500/20">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-primary-100 text-sm mb-1">{paper.studentName} · {paper.className}</p>
                  <h2 className="text-2xl font-bold">{title}</h2>
                  <p className="text-primary-100 text-sm mt-1">AI批改完成，共 {gradeResults.length} 题，可人工调整后发布</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold">{totalGot}<span className="text-2xl text-primary-200">/{totalMax}</span></div>
                  <p className="text-sm text-primary-100 mt-1">
                    {totalGot / totalMax >= 0.9 ? '优秀！🎉' : totalGot / totalMax >= 0.7 ? '良好，继续加油' : totalGot / totalMax >= 0.6 ? '及格，需要加强' : '需要多努力哦'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {gradeResults.map((r, idx) => {
                const q = paper.questions.find(x => x.tempId === r.questionId);
                if (!q) return null;
                const isEditing = editingId === r.questionId;
                const errLabels: Record<string, string> = { concept: '概念错误', calculation: '计算错误', careless: '粗心', expression: '表达不规范' };
                return (
                  <div key={r.questionId} className="bg-white rounded-2xl border border-border overflow-hidden">
                    <div className={`px-5 py-3 flex items-center justify-between gap-3 ${r.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          r.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}>{idx + 1}</span>
                        <div>
                          <span className="text-sm font-medium">{TYPE_LABELS[q.type]} · {q.score}分</span>
                          {r.errorType && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{errLabels[r.errorType]}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={() => saveEdit(r.questionId)}
                              className="text-sm px-3 py-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600">保存</button>
                            <button onClick={() => setEditingId(null)}
                              className="text-sm px-3 py-1 rounded-lg border border-border hover:bg-muted">取消</button>
                          </>
                        ) : (
                          <>
                            <span className={`text-xl font-bold ${r.isCorrect ? 'text-green-600' : 'text-red-600'}`}>{r.score}<span className="text-sm text-muted-foreground font-normal">/{r.maxScore}</span></span>
                            <button onClick={() => beginEdit(r)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary-600 hover:bg-primary-50" title="修改">
                              <Edit3 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">题目</div>
                        <div className="text-sm whitespace-pre-wrap">{q.content}</div>
                        {q.options && q.options.length > 0 && (
                          <div className="text-sm text-muted-foreground mt-1">{q.options.join('  ')}</div>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                          <div className="text-xs text-blue-600 font-medium mb-1">学生答案</div>
                          <div className="text-sm">{q.studentAnswer || '（未作答）'}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50/50 border border-green-100">
                          <div className="text-xs text-green-600 font-medium mb-1">标准答案</div>
                          <div className="text-sm">{r.correctAnswer || q.correctAnswer}</div>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-muted-foreground">分数</label>
                            <input type="number" value={editScore} min={0} max={r.maxScore}
                              onChange={e => setEditScore(Number(e.target.value))}
                              className="ml-2 w-20 px-2 py-1 rounded border border-border text-sm" />
                            <span className="text-sm text-muted-foreground"> / {r.maxScore}</span>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">评语</label>
                            <textarea value={editComment} rows={2}
                              onChange={e => setEditComment(e.target.value)}
                              className="w-full mt-1 px-3 py-2 rounded-lg border border-border text-sm outline-none focus:border-primary-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-muted/50 text-sm">
                          <span className="text-xs text-muted-foreground block mb-1">AI评语</span>
                          {r.comment}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl border border-border font-medium hover:bg-muted flex items-center gap-1">
                <ArrowLeft size={16} /> 返回修改题目
              </button>
              <button onClick={handlePublish} disabled={publishing}
                className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-green-500/25 hover:shadow-xl disabled:opacity-60 flex items-center justify-center gap-2">
                {publishing ? <><Loader2 size={18} className="animate-spin" /> 保存中...</> : <><Award size={18} /> 确认无误，保存并发布</>}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: 完成 */}
        {step === 5 && (
          <div className="bg-white rounded-2xl border border-border p-10 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <Check size={40} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">批改结果已发布！</h3>
            <p className="text-muted-foreground mb-6">{paper?.studentName} 的作业已保存，家长端可查看。正在跳转学情分析...</p>
            <Loader2 size={20} className="mx-auto animate-spin text-primary-600" />
          </div>
        )}
      </div>
    </div>
  );
}
