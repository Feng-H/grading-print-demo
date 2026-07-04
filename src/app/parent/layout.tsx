'use client';

import Navbar from '@/components/Navbar';
import RequireAuth from '@/components/RequireAuth';

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth role="parent">
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Navbar role="parent" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
