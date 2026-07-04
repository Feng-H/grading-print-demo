import Link from 'next/link';
import { BookOpen, Users, Sparkles, Brain, BarChart3, MessageSquare } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-hero pb-16 md:pb-0">
      {/* 顶部导航 */}
      <nav className="px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/20">
              <BookOpen size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-700 to-accent-600 bg-clip-text text-transparent">
              智学通
            </span>
          </div>
          <div className="text-sm text-muted-foreground hidden sm:block">
            AI赋能 · 家校协同
          </div>
        </div>
      </nav>

      {/* Hero区域 */}
      <section className="px-4 sm:px-6 py-8 sm:py-16 md:py-20">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur border border-primary-200 text-primary-700 text-sm mb-6">
            <Sparkles size={16} />
            AI智能批改 · 精准学情分析
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-6 leading-tight">
            让老师轻松教，
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              让家长放心育
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 md:mb-12 px-2">
            智能批改作业试卷，自动分析班级学情，精准定位学生薄弱点，
            打通家校沟通壁垒，共同助力孩子成长。
          </p>

          {/* 角色选择 */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Link
              href="/teacher"
              className="group card-hover rounded-3xl bg-white p-6 sm:p-8 border border-border shadow-xl shadow-primary-500/5 text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-100 to-transparent rounded-bl-full opacity-60 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-5 shadow-lg shadow-primary-500/30">
                  <Users size={28} className="text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-primary-600 transition-colors">
                  我是老师
                </h2>
                <p className="text-muted-foreground mb-5 text-sm sm:text-base">
                  AI智能批改作业，班级学情一目了然，精准识别学生薄弱点，助力高效教学
                </p>
                <div className="flex flex-wrap gap-2">
                  {['AI自动批改', '学情分析', '知识点诊断', '教学建议'].map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs sm:text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center text-primary-600 font-medium group-hover:gap-3 gap-2 transition-all">
                  进入工作台
                  <span>→</span>
                </div>
              </div>
            </Link>

            <Link
              href="/parent"
              className="group card-hover rounded-3xl bg-white p-6 sm:p-8 border border-border shadow-xl shadow-accent-500/5 text-left relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-100 to-transparent rounded-bl-full opacity-60 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="relative">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-400 flex items-center justify-center mb-5 shadow-lg shadow-accent-500/30">
                  <MessageSquare size={28} className="text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-3 group-hover:text-accent-600 transition-colors">
                  我是家长
                </h2>
                <p className="text-muted-foreground mb-5 text-sm sm:text-base">
                  实时查看孩子作业完成情况，了解知识点掌握程度，获取个性化学习建议
                </p>
                <div className="flex flex-wrap gap-2">
                  {['作业查看', '成绩跟踪', '薄弱点分析', '学习建议'].map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-accent-50 text-accent-700 text-xs sm:text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center text-accent-600 font-medium group-hover:gap-3 gap-2 transition-all">
                  查看孩子情况
                  <span>→</span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 特性展示 */}
      <section className="px-4 sm:px-6 py-12 bg-white/50">
        <div className="max-w-5xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-10">核心能力</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Brain, title: 'AI智能批改', desc: '支持选择、填空、计算、简答等多种题型自动批改', color: 'primary' },
              { icon: BarChart3, title: '精准学情', desc: '多维度数据分析，班级和个人情况直观呈现', color: 'accent' },
              { icon: Sparkles, title: '薄弱点诊断', desc: '自动识别知识盲区，给出针对性教学建议', color: 'info' },
              { icon: Users, title: '家校协同', desc: '批改结果实时同步，家长随时了解学习状况', color: 'success' },
            ].map((item, i) => {
              const Icon = item.icon;
              const colorClasses: Record<string, string> = {
                primary: 'bg-primary-100 text-primary-600',
                accent: 'bg-accent-100 text-accent-600',
                info: 'bg-blue-100 text-blue-600',
                success: 'bg-green-100 text-green-600',
              };
              return (
                <div key={i} className="text-center p-4 sm:p-6 rounded-2xl bg-white card-hover">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${colorClasses[item.color]} flex items-center justify-center mx-auto mb-3 sm:mb-4`}>
                    <Icon size={24} />
                  </div>
                  <h4 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-sm text-muted-foreground">
        <p>© 2026 智学通 - AI家校作业平台 · 让每个孩子都被看见</p>
      </footer>
    </div>
  );
}
