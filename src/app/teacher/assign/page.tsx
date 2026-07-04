'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Upload, FilePlus, Camera, FileText, Calendar, BookOpen, Check } from 'lucide-react';
import { classes, homeworkList } from '@/lib/mock-data';

export default function AssignHomework() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [selectedClass, setSelectedClass] = useState(classes[0].id);
  const [deadline, setDeadline] = useState('');
  const [uploadMode, setUploadMode] = useState<'upload' | 'select' | 'create'>('select');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // 模拟提交，跳转到示例作业的批改页
    setTimeout(() => {
      router.push(`/teacher/grade/${homeworkList[0].id}`);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar role="teacher" title="布置新作业" showBack backUrl="/teacher" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
          {/* 基本信息 */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <FileText size={20} className="text-primary-600" />
              作业基本信息
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">作业名称</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="例如：第三单元测试卷、除法练习十"
                  className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  required
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">选择班级</label>
                  <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-white"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-1">
                    <Calendar size={16} /> 截止日期
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 题目来源 */}
          <div className="bg-white rounded-2xl border border-border p-6">
            <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
              <BookOpen size={20} className="text-primary-600" />
              添加题目
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { key: 'upload', icon: Upload, label: '上传PDF/图片', desc: '支持拍照上传试卷' },
                { key: 'select', icon: FilePlus, label: '使用示例试卷', desc: '原型Demo演示用' },
                { key: 'create', icon: Camera, label: '手动创建题目', desc: '逐题录入' },
              ].map(mode => {
                const Icon = mode.icon;
                const isSelected = uploadMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => setUploadMode(mode.key as any)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-border hover:border-primary-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary-500 text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon size={20} />
                      </div>
                      {isSelected && <Check size={20} className="text-primary-600" />}
                    </div>
                    <p className="font-medium text-sm">{mode.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
                  </button>
                );
              })}
            </div>

            {uploadMode === 'select' && (
              <div className="p-5 rounded-xl bg-primary-50 border border-primary-100">
                <p className="text-sm text-primary-800">
                  📝 将使用预设的<b>5道不同题型</b>的示例试卷进行演示，包含选择题、填空题、判断题、数学计算题和简答题。
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {['选择题', '填空题', '判断题', '数学计算题', '简答题'].map(t => (
                    <span key={t} className="px-3 py-1 bg-white rounded-full text-xs text-primary-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {uploadMode === 'upload' && (
              <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary-300 transition-colors cursor-pointer">
                <Upload size={40} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">点击上传或拖拽文件到此处</p>
                <p className="text-sm text-muted-foreground mt-1">支持 PDF、JPG、PNG 格式，单文件不超过10MB</p>
                <p className="text-xs text-accent-600 mt-2">*原型Demo阶段暂不支持真实上传，可选择"使用示例试卷"体验完整流程</p>
              </div>
            )}

            {uploadMode === 'create' && (
              <div className="p-5 rounded-xl bg-muted text-center">
                <p className="text-sm text-muted-foreground">手动创建题目功能将在后续版本提供，建议先使用示例试卷体验完整流程。</p>
              </div>
            )}
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 sm:flex-none px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-muted transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none px-8 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  正在创建...
                </>
              ) : (
                '创建并开始批改'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
