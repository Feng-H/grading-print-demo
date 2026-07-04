import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-hero flex items-center justify-center px-4">
      <div className="text-center animate-fade-in">
        <h1 className="text-8xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <h2 className="text-2xl font-bold mb-2">页面走丢了</h2>
        <p className="text-muted-foreground mb-8">抱歉，您访问的页面不存在</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
        >
          <Home size={20} />
          返回首页
        </Link>
      </div>
    </div>
  );
}
