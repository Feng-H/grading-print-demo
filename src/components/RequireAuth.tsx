'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface RequireAuthProps {
  children: React.ReactNode;
  role: 'teacher' | 'parent';
}

export default function RequireAuth({ children, role }: RequireAuthProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      // 未登录，跳转到登录页
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    // 角色不匹配，跳转到对应首页
    if (session.user.role !== role) {
      if (session.user.role === 'teacher') {
        router.push('/teacher');
      } else if (session.user.role === 'parent') {
        router.push('/parent');
      } else {
        router.push('/login');
      }
    }
  }, [session, status, router, pathname, role]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== role) {
    return null;
  }

  return <>{children}</>;
}
