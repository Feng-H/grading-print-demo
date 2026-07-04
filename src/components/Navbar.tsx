'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BookOpen, Home, User, BarChart3, FilePlus } from 'lucide-react';

interface NavbarProps {
  role: 'teacher' | 'parent' | null;
  title?: string;
  showBack?: boolean;
  backUrl?: string;
}

export default function Navbar({ role, title, showBack = false, backUrl = '/' }: NavbarProps) {
  const pathname = usePathname();

  const teacherLinks = [
    { href: '/teacher', label: '工作台', icon: Home },
    { href: '/teacher/assign', label: '布置作业', icon: FilePlus },
    { href: '/teacher/analytics', label: '学情分析', icon: BarChart3 },
  ];

  const parentLinks = [
    { href: '/parent', label: '孩子情况', icon: Home },
  ];

  const links = role === 'teacher' ? teacherLinks : role === 'parent' ? parentLinks : [];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {showBack ? (
              <Link href={backUrl} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={20} />
                <span className="hidden sm:inline">返回</span>
              </Link>
            ) : (
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <BookOpen size={18} className="text-white" />
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent hidden sm:inline">
                  智学通
                </span>
              </Link>
            )}
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </div>

          {role && links.length > 0 && (
            <nav className="hidden md:flex items-center gap-1">
              {links.map(link => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon size={18} />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {role && (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-lg">
                  {role === 'teacher' ? '👩‍🏫' : '👨'}
                </div>
                <span className="text-sm font-medium hidden sm:inline">
                  {role === 'teacher' ? '李老师' : '张明爸爸'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 移动端底部导航 */}
        {role && links.length > 0 && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border pb-safe">
            <div className="flex items-center justify-around py-2">
              {links.map(link => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname?.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-all ${
                      isActive ? 'text-primary-600' : 'text-muted-foreground'
                    }`}
                  >
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-xs">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
