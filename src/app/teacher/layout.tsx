'use client';

import Navbar from '@/components/Navbar';
import RequireAuth from '@/components/RequireAuth';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth role="teacher">
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar role="teacher" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
