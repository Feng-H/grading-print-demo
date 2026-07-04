# 智学通 - AI家校作业平台

AI智能批改作业，助力老师精准教学，家长实时掌握孩子学习情况。基于 Next.js 14 构建，一套代码支持 Web 和移动端响应式访问。

## ✨ 核心功能

### 🔐 账号登录
- 账号密码登录，老师/家长角色权限隔离
- 路由自动保护，未登录自动跳转到登录页
- 演示账号：
  - 老师：用户名 `teacher`，密码 `123456`
  - 家长：用户名 `parent`，密码 `123456`

### 👩‍🏫 老师端
- **AI智能批改**：对接 SiliconFlow，支持多种大模型（Qwen/DeepSeek/GLM等）
  - 支持选择题、判断题、填空题、数学解答题、简答题等多种题型
  - 客观题自动判分，主观题AI评分+写详细评语
  - 数学题支持解题步骤评分
  - 错误类型自动分类（概念错误/计算错误/粗心错误/表达不规范）
  - 老师可人工复核修改分数和评语
  - **未配置API Key时自动降级使用Mock数据，方便演示**
- **学情分析**
  - 班级分数分布统计
  - 知识点掌握度可视化
  - 典型错误自动分析
  - AI生成针对性教学建议

### 👨‍👧‍👦 家长端
- 查看孩子作业批改结果
- 每道题得分、正确答案、AI评语一目了然
- 知识点掌握雷达图
- 薄弱点分析和个性化学习建议
- 成绩趋势对比班级平均水平

## 🛠️ 技术栈

- **框架**: Next.js 14+ App Router (React 19)
- **认证**: NextAuth v5 (Auth.js)
- **数据库**: Vercel Postgres + Prisma ORM（可后续接入）
- **AI**: SiliconFlow API（兼容OpenAI格式，支持多种开源大模型）
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

2. 配置环境变量：复制 `.env.local.example` 为 `.env.local`，填入：
   - `SILICONFLOW_API_KEY`：从 [SiliconFlow官网](https://siliconflow.cn/) 获取API Key
   - 如果不填API Key，批改会使用演示Mock数据，不影响登录和页面流程体验

3. 启动开发服务器
```bash
npm run dev
```

4. 打开浏览器访问 http://localhost:3000

5. 生产构建
```bash
npm run build
npm start
```

## 📱 核心演示流程

1. 访问首页 `/`，点击登录
2. 使用演示账号登录：
   - 老师账号：`teacher` / `123456`
   - 家长账号：`parent` / `123456`
3. 老师端：
   - `/teacher` 工作台查看统计
   - `/teacher/assign` 布置/选择示例作业
   - `/teacher/grade/hw1` 点击"开始AI批改"，真实调用AI批改，查看结果，可修改分数评语，发布
   - `/teacher/analytics` 查看班级学情分析、知识点掌握、教学建议
4. 家长端：
   - `/parent` 查看孩子概况
   - `/parent/child/s1` 孩子作业列表
   - `/parent/child/s1/homework/hw1` 作业详情，查看每道题批改结果
   - `/parent/child/s1/report` 学习报告，雷达图、成绩趋势、薄弱点建议

## 🔑 配置SiliconFlow真实AI批改

1. 注册 [SiliconFlow](https://siliconflow.cn/) 账号，获取API Key
2. 在 `.env.local` 中填入：
   ```
   SILICONFLOW_API_KEY=sk-你的APIKey
   SILICONFLOW_MODEL=Qwen/Qwen2.5-72B-Instruct
   ```
3. 重启开发服务器，点击"开始AI批改"即可获得真实AI批改结果
4. 模型可自由切换，支持SiliconFlow上所有模型（DeepSeek-V3、GLM-4等）

## 🌐 部署到Vercel

1. 将代码推送到GitHub私有仓库
2. 在 [Vercel](https://vercel.com) 导入GitHub仓库
3. 在Vercel项目设置 → Environment Variables中配置环境变量：
   - `AUTH_SECRET`：随机生成的密钥
   - `SILICONFLOW_API_KEY`：你的SiliconFlow API Key
   - `SILICONFLOW_MODEL`：模型名称
4. Vercel会自动识别Next.js，零配置完成构建部署
5. （可选）在Vercel Storage中创建Postgres数据库，后续扩展数据持久化

## 📁 项目结构

```
├── prisma/                # 数据库模型定义 (Prisma schema)
├── src/
│   ├── app/
│   │   ├── login/         # 登录页面
│   │   ├── api/
│   │   │   ├── auth/      # NextAuth认证API
│   │   │   └── grade/     # AI批改API接口
│   │   ├── teacher/       # 老师端页面
│   │   └── parent/        # 家长端页面
│   ├── components/        # React组件
│   └── lib/
│       ├── prisma.ts      # Prisma客户端
│       └── mock-data.ts   # 演示数据
├── auth.ts                # NextAuth配置
├── middleware.ts          # 路由保护中间件
└── .env.local.example     # 环境变量示例
```

## 🎨 设计说明

- 主色调：青绿色系 - 代表成长、信任、教育
- 强调色：珊瑚橙 - 代表活力、关怀
- 响应式设计，同时支持桌面Web和手机移动端
- 动画过渡自然，交互反馈清晰

## 📝 版本说明

当前版本：
- ✅ 登录认证完成，路由权限控制
- ✅ 对接SiliconFlow真实AI批改，模型可配置
- ✅ 未配置API Key时自动降级Mock数据，可直接演示
- ⏳ 数据库持久化（Vercel Postgres + Prisma schema已定义，后续可接入）
- ⏳ OCR手写识别（后续接入）
