'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { BookOpen, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const { data: session, status } = useSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 已登录自动跳转
  useEffect(() => {
    if (status === 'authenticated') {
      if (session.user.role === 'teacher') {
        router.push('/teacher');
      } else if (session.user.role === 'parent') {
        router.push('/parent');
      } else {
        router.push('/');
      }
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
        callbackUrl: callbackUrl || (
          username === 'teacher' ? '/teacher' : '/parent'
        ),
      });

      if (result?.error) {
        setError('用户名或密码错误，请重试');
      } else {
        router.push(result?.url || (username === 'teacher' ? '/teacher' : '/parent'));
        router.refresh();
      }
    } catch (err) {
      setError('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-hero flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-hero flex flex-col">
      {/* 顶部Logo */}
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/20">
            <BookOpen size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
            智学通
          </span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">欢迎登录</h1>
            <p className="text-muted-foreground">AI赋能 · 家校协同育人</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-primary-500/5 border border-border p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="teacher / parent"
                  className="w-full px-4 py-3 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="演示密码：123456"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-center text-muted-foreground mb-3">演示账号</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setUsername('teacher'); setPassword('123456'); }}
                  className="p-3 rounded-xl border border-primary-100 bg-primary-50 text-primary-700 text-sm hover:bg-primary-100 transition-colors"
                >
                  <span className="block font-medium">👩‍🏫 老师账号</span>
                  <span className="text-xs text-primary-500">teacher / 123456</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setUsername('parent'); setPassword('123456'); }}
                  className="p-3 rounded-xl border border-accent-100 bg-accent-50 text-accent-700 text-sm hover:bg-accent-100 transition-colors"
                >
                  <span className="block font-medium">👨 家长账号</span>
                  <span className="text-xs text-accent-500">parent / 123456</span>
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            还没有账号？<Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">返回首页</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-hero flex items-center justify-center">
        <Loader2 className="animate-spin text-primary-600" size={32} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
