'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getStudentById, homeworkList } from '@/lib/mock-data';
import { ChevronRight, FileText, CheckCircle } from 'lucide-react';

export default function ChildHomeworkList() {
  const params = useParams();
  const studentId = params.id as string;
  const student = getStudentById(studentId) || getStudentById('s1')!;

  const allHomework = [
    { ...homeworkList[0], score: 61, status: '已批改', date: '2026-07-02', wrongCount: 2 },
    { ...homeworkList[1], score: 76, status: '已批改', date: '2026-06-27', wrongCount: 1 },
    { ...homeworkList[2], score: 82, status: '已批改', date: '2026-06-20', wrongCount: 0 },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar role="parent" title={`${student.name}的作业`} showBack backUrl="/parent" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
        {/* 学生信息 */}
        <div className="bg-white rounded-2xl border border-border p-5 mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent-100 flex items-center justify-center text-3xl">
            {student.avatar}
          </div>
          <div>
            <h1 className="font-bold text-lg">{student.name}</h1>
            <p className="text-sm text-muted-foreground">{student.className}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <FileText size={20} className="text-primary-600" />
              全部作业
            </h2>
          </div>
          <div className="divide-y divide-border">
            {allHomework.map(hw => {
              const scoreColor = hw.score >= 80 ? 'text-green-600 bg-green-50' : hw.score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
              return (
                <Link
                  key={hw.id}
                  href={`/parent/child/${studentId}/homework/${hw.id}`}
                  className="flex items-center gap-4 p-5 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <FileText size={20} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{hw.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{hw.date}</span>
                      {hw.wrongCount === 0 ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={12} /> 全部正确
                        </span>
                      ) : (
                        <span className="text-amber-600">{hw.wrongCount}道错题</span>
                      )}
                    </div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg font-bold ${scoreColor}`}>
                    {hw.score}
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
