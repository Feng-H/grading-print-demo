'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ArrowLeft, BookOpen, Home, BarChart3, FilePlus, LogOut, Layers, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  role: 'teacher' | 'parent' | null;
  title?: string;
  showBack?: boolean;
  backUrl?: string;
}

export default function Navbar({ role: propRole, title, showBack = false, backUrl = '/' }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  // 从session获取角色和用户信息，优先使用props传入的
  const role = propRole || (session?.user?.role as 'teacher' | 'parent' | null);
  const userName = session?.user?.name || '';
  const userAvatar = session?.user?.avatar || '👤';

  const teacherLinks = [
    { href: '/teacher', label: '工作台', icon: Home },
    { href: '/teacher/batches', label: '批次管理', icon: Layers },
    { href: '/teacher/assign', label: '手动批改', icon: FilePlus },
    { href: '/teacher/analytics', label: '学情分析', icon: BarChart3 },
    { href: '/teacher/settings', label: '设置', icon: Settings },
  ];

  const parentLinks = [
    { href: '/parent', label: '孩子情况', icon: Home },
  ];

  const links = role === 'teacher' ? teacherLinks : role === 'parent' ? parentLinks : [];

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  };

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
              <Link href={role === 'teacher' ? '/teacher' : role === 'parent' ? '/parent' : '/'} className="flex items-center gap-2">
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
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-lg">
                    {userAvatar}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{userName}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="退出登录"
                >
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 移动端底部导航 */}
        {role && links.length > 0 && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-40">
            <div className="flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom)]">
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
              <button
                onClick={handleSignOut}
                className="flex flex-col items-center gap-1 px-4 py-1 text-muted-foreground"
              >
                <LogOut size={22} strokeWidth={2} />
                <span className="text-xs">退出</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
