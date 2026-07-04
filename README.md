# 智学通 - AI家校作业平台

AI智能批改作业，助力老师精准教学，家长实时掌握孩子学习情况。基于 Next.js 14 构建，一套代码支持 Web 和移动端响应式访问。

## ✨ 核心功能

### 👩‍🏫 老师端
- **AI智能批改**：支持选择题、判断题、填空题、数学解答题、简答题等多种题型自动批改
  - 客观题自动判分，主观题AI评分+写评语
  - 数学题支持解题步骤评分
  - 错误类型自动分类（概念错误/计算错误/粗心错误）
  - 老师可人工复核修改分数和评语
- **学情分析**
  - 班级分数分布统计
  - 知识点掌握度可视化
  - 典型错误自动分析
  - AI生成针对性教学建议
  - 学生个人成绩趋势追踪

### 👨‍👧‍👦 家长端
- 查看孩子作业批改结果
- 每道题得分、正确答案、AI评语一目了然
- 知识点掌握雷达图
- 薄弱点分析和个性化学习建议
- 成绩趋势对比班级平均水平

## 🛠️ 技术栈

- **框架**: Next.js 14+ App Router (React 19)
- **样式**: Tailwind CSS v4
- **图表**: Recharts
- **图标**: Lucide React
- **语言**: TypeScript
- **部署**: Vercel (一键部署)

## 🚀 本地运行

1. 安装依赖
```bash
npm install
```

2. 启动开发服务器
```bash
npm run dev
```

3. 打开浏览器访问 http://localhost:3000

4. 生产构建
```bash
npm run build
npm start
```

## 📱 核心演示流程

1. 首页 `/` - 选择角色（老师/家长）
2. 老师端：
   - `/teacher` 工作台查看统计
   - `/teacher/assign` 布置/选择示例作业
   - `/teacher/grade/hw1` 点击"开始AI批改"，体验批改动画，查看结果，可修改分数评语，发布
   - `/teacher/analytics` 查看班级学情分析、知识点掌握、教学建议
3. 家长端：
   - `/parent` 查看孩子概况
   - `/parent/child/s1` 孩子作业列表
   - `/parent/child/s1/homework/hw1` 作业详情，查看每道题批改结果
   - `/parent/child/s1/report` 学习报告，雷达图、成绩趋势、薄弱点建议

## 🌐 部署到Vercel

1. 将代码推送到GitHub私有仓库
2. 在 [Vercel](https://vercel.com) 导入GitHub仓库
3. Vercel会自动识别Next.js，零配置完成构建部署
4. 访问Vercel分配的域名即可使用

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页/角色选择
│   ├── teacher/           # 老师端页面
│   │   ├── page.tsx       # 工作台
│   │   ├── assign/        # 布置作业
│   │   ├── grade/[id]/    # AI批改
│   │   └── analytics/     # 学情分析
│   └── parent/            # 家长端页面
│       ├── page.tsx       # 孩子概览
│       └── child/[id]/    # 孩子作业/报告
├── components/            # React组件
├── lib/
│   └── mock-data.ts       # 演示数据
└── types/
    └── index.ts           # TypeScript类型定义
```

## 🎨 设计说明

- 主色调：青绿色系 - 代表成长、信任、教育
- 强调色：珊瑚橙 - 代表活力、关怀
- 响应式设计，同时支持桌面Web和手机移动端
- 动画过渡自然，交互反馈清晰

## 📝 说明

这是可演示的原型Demo版本，AI批改和OCR目前使用预设Mock数据，预留了API接口位置，后续接入真实AI服务只需填入对应API Key即可。
