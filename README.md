# 智学通 - AI试卷批改与远程打印平台

扫描仪上传全班试卷 → AI自动拆分/OCR/批改/红笔批注 → 生成两种PDF → 老师复核后一键推送到内网打印机。支持正反面试卷、WebDAV自动发现、FRP内网穿透远程打印、大文件压测。

## ✨ 核心功能

### 📄 试卷扫描自动处理流水线
- **扫描仪 WebDAV 上传**：扫描仪扫完直接传到WebDAV文件夹，webhook或轮询自动发现新文件
- **手动上传**：老师后台手动上传PDF备份
- **正反面自动拆分**：默认按2页/学生均分，AI识别姓名栏辅助验证
- **VL OCR识别**：调用SiliconFlow视觉大模型，识别学生姓名/学号、每道题位置（bbox百分比坐标）、学生答案
- **AI智能批改**：
  - 客观题（选择/判断/填空）本地自动判分
  - 主观题（数学/简答/作文）AI评分+详细鼓励性评语
  - 错误类型自动分类（概念/计算/粗心/表达）
- **红笔批注自动规划**：根据批改结果自动在试卷上放置：
  - ✔ 绿色勾（对题右上角）
  - ✘ 红色叉（错题右上角）+ "-N" 扣分值
  - 评语气泡（错题下方，自动换行避让）
  - 错题下划线/圈画
  - 首页总分 `{得分}/{满分}`（姓名栏旁）
  - 贪心IOU避让算法避免批注重叠

### 📑 两种PDF输出
1. **merged.pdf**（原卷+红批注合成）：直接发给打印机出卷
2. **overlay.pdf**（白底+纯红批注）：二次进纸套打到原卷上（打印机白墨区域不上墨）

### 🖨️ 远程打印（驱动无关）
- **RAW/JetDirect协议（TCP 9100，默认）**：零依赖，PDF字节直传，兼容所有支持PDF Direct Print的网络打印机
- **IPP协议（TCP 631，备选）**：自动探测打印机PDF支持，状态反馈更丰富
- **FRP + socat 内网穿透方案**：家里OpenWrt路由器通过FRP把内网打印机映射到云服务器，平台直接推PDF（详见 `docs/deploy.md`）
- **打印压测**：同一份PDF复制N份合并成单个大体积PDF一次性发送，测试FRP大文件传输稳定性/丢包/超时

### ✏️ 老师复核页
- SVG批注层（viewBox百分比坐标，任意分辨率）
- 批注工具栏：选择/拖动/✔/✘/分数/评语/圈画/下划线/自由绘
- 点击添加、拖拽移动、右键删除，1.5秒防抖自动保存
- Ctrl+滚轮缩放、右键/中键平移
- 学生身份下拉纠正，题目逐题改分/改评语
- 一键「发送打印」选择merged/overlay

### 👨‍👧‍👦 家长端（保留原有功能）
- 查看孩子作业批改结果、知识点雷达图、成绩趋势、薄弱点建议

## 🛠️ 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16 App Router (React 19), `output: 'standalone'` |
| 认证 | NextAuth (Credentials JWT) |
| 数据库 | PostgreSQL + Prisma ORM |
| 队列 | Postgres `SELECT FOR UPDATE SKIP LOCKED` 轮询（单进程内置，无Redis依赖） |
| AI | SiliconFlow API（Qwen VL视觉OCR + Qwen3.6文本批改） |
| PDF生成 | pdf-lib + @pdf-lib/fontkit（嵌入NotoSansSC中文字体） |
| PDF光栅化 | pdfjs-dist + node-canvas（服务端渲染JPG供OCR） |
| 打印 | Node.js `net.Socket`（RAW 9100）/ `ipp` npm库（IPP 631） |
| WebDAV | `webdav` npm库 |
| 前端数据 | SWR（自动轮询打印队列） |
| 部署 | Docker + docker-compose，单进程同时跑UI/API/队列/WebDAV轮询 |

## 🚀 快速开始（Docker部署 - 推荐）

### 前置要求
- Linux VPS（1核2G即可），已安装 Docker + docker-compose
- VPS公网IP一个（无需域名，后面可以用sslip.io免费拿HTTPS证书）
- （可选）SiliconFlow API Key（不配则走Mock模式，批改结果固定70%分）
- （可选）家里OpenWrt路由器 + FRP内网穿透，用于连接家里打印机

### 需要开放的端口

在VPS安全组/防火墙放行以下端口：

| 端口 | 协议 | 用途 | 备注 |
|---|---|---|---|
| **3000** | TCP | Web UI + API（HTTP直连） | 不配反代时直接用 `http://IP:3000` |
| **80** | TCP | HTTP（Caddy反代+证书验证） | 配HTTPS时需要 |
| **443** | TCP | HTTPS | 配HTTPS时需要 |
| **7000** | TCP | FRP 服务端 | OpenWrt frpc连过来建隧道 |
| 9100 | TCP | 打印机RAW端口 | **不要对公网开放**，FRP绑定127.0.0.1即可 |
| 22 | TCP | SSH | 运维需要 |

如果先简单跑通功能，只开 **3000** 和 **7000** 就行。

### 步骤一：部署平台

```bash
# 1. 克隆代码
git clone https://github.com/Feng-H/grading-print-demo.git
cd grading-print-demo

# 2. 从模板创建.env文件
cp env.docker.example .env

# 3. 编辑.env
nano .env
```

至少修改以下配置（无域名用IP直连的情况）：
```bash
# 必填：改成你的强密码，记下它
POSTGRES_PASSWORD=自己生成一个强密码

# 必填：生成随机密钥
# 生成命令: openssl rand -base64 32
AUTH_SECRET=粘贴上面命令生成的字符串

# 必填：平台访问URL（没有域名就用http://IP:3000，下面HTTPS章节会改）
AUTH_URL=http://你的VPS公网IP:3000
NEXTAUTH_URL=http://你的VPS公网IP:3000

# 打印机配置（FRP配好之前保持默认，能启动但打印会失败）
PRINTER_HOST=127.0.0.1
PRINTER_PORT=9100
PRINTER_PROTOCOL=raw
```

```bash
# 4. 启动（首次构建约3-5分钟）
docker compose up -d --build

# 5. 查看日志确认启动成功
docker compose logs -f app
# 看到 "Ready in xxxms" 和 "[scheduler] 队列调度器启动" 就OK了
# Ctrl+C 退出日志
```

浏览器访问 `http://你的VPS公网IP:3000`，用 `teacher / 123456` 登录。
首次启动自动执行 `prisma migrate deploy` 建表。数据持久化在 docker volume `swp-postgres` 和 `swp-storage`，`docker compose down` 不会丢失数据。

### 步骤二：配置HTTPS（可选，推荐）

没有域名也能上HTTPS，用 [sslip.io](https://sslip.io) 免费服务——`1-2-3-4.sslip.io` 会自动解析到IP `1.2.3.4`，Caddy可以自动为它申请Let's Encrypt证书。

1. 开放安全组的 80 和 443 端口
2. 安装Caddy：
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

3. 创建Caddy配置（把 `123-45-67-89` 换成你VPS公网IP用短横线连接）：
```bash
sudo nano /etc/caddy/Caddyfile
```

写入：
```
# HTTPS主站（把IP的.换成-，例如123.45.67.89 → 123-45-67-89.sslip.io）
123-45-67-89.sslip.io {
    reverse_proxy localhost:3000
}

# HTTP IP访问自动跳转到HTTPS
http://123.45.67.89 {
    redir https://123-45-67-89.sslip.io{uri} permanent
}
```

4. 启动Caddy：
```bash
sudo systemctl enable caddy
sudo systemctl restart caddy
# 等几秒，Caddy会自动申请证书
sudo systemctl status caddy  # 看状态是否active
```

5. 修改 `.env` 里的URL（改成HTTPS域名）：
```bash
nano /home/ubuntu/grading-print-demo/.env
```
```bash
AUTH_URL=https://123-45-67-89.sslip.io
NEXTAUTH_URL=https://123-45-67-89.sslip.io
```

6. 重启app：
```bash
cd /home/ubuntu/grading-print-demo
docker compose restart app
```

访问 `https://123-45-67-89.sslip.io` 就能看到HTTPS小锁了。此时**可以关闭公网3000端口**，所有流量走443经Caddy反代。

### 步骤三：配置FRP内网穿透（连接家里打印机）

VPS上需要跑一个FRP服务端（frps），OpenWrt上跑客户端（frpc）。

#### VPS端：安装frps

```bash
# 下载FRP（选最新版，去 https://github.com/fatedier/frp/releases 看最新版本号）
cd /tmp
wget https://github.com/fatedier/frp/releases/download/v0.61.1/frp_0.61.1_linux_amd64.tar.gz
tar xzf frp_0.61.1_linux_amd64.tar.gz
sudo mv frp_0.61.1_linux_amd64/frps /usr/local/bin/
rm -rf frp_0.61.1_linux_amd64*

# 创建配置
sudo mkdir -p /etc/frp
sudo nano /etc/frp/frps.toml
```

写入（改成你自己的token）：
```toml
bindPort = 7000
auth.token = "你自己设置一个复杂密码，frpc要用到"

# 只允许映射到本机回环，安全（避免端口暴露公网）
allowPorts = [
  { start = 9100, end = 9100 }
]
```

```bash
# 创建systemd服务
sudo nano /etc/systemd/system/frps.service
```

写入：
```ini
[Unit]
Description=FRP Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/frps -c /etc/frp/frps.toml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now frps
sudo systemctl status frps  # 看是否active
ss -tlnp | grep 7000        # 确认7000端口在监听
```

#### OpenWrt端：配置frpc

在OpenWrt上安装luci-app-frpc（如果用官方固件可以 `opkg install frpc` 或下载二进制）。在frpc配置里：

```toml
serverAddr = "你的VPS公网IP"
serverPort = 7000
auth.token = "和frps.toml里同一个token"

[[proxies]]
name = "printer-raw"
type = "tcp"
localIP = "192.168.1.100"   # 改成你打印机的内网IP
localPort = 9100            # 打印机RAW端口（大部分默认9100）
remotePort = 9100
```

**注意**：frpc配置里不要写 `remoteIP = 0.0.0.0`，默认就是绑定到服务端的0.0.0.0——但因为我们没开放9100公网安全组，加上frps allowPorts限制，只有VPS本地127.0.0.1能访问。如果想更安全，可以在frps配置里进一步限制bind。

启动frpc后，在VPS上测试连接：
```bash
# VPS上执行，能连通说明FRP通了
nc -zv 127.0.0.1 9100
# 输出 "Connection to 127.0.0.1 9100 port [tcp/*] succeeded!" 就是通了
```

然后在平台页面里进「设置」点「测试打印机连接」，能正常出纸说明打通了。

### 网络拓扑

```
[家里打印机:9100] ←───┐
                      │ 同局域网
[OpenWrt路由器:frpc] ──┘
      │ FRP加密隧道（连VPS:7000）
      ↓
[VPS]:7000 frps → 映射到127.0.0.1:9100
      │
      ├── [Caddy :80/:443] → 反代 → swp-app:3000（浏览器访问）
      └── [swp-app:3000] → 发PDF到127.0.0.1:9100 → 隧道回家 → 打印机出纸
```

## 💻 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 需要本地PostgreSQL（或用docker跑一个）
# createdb schoolwork_dev

# 3. 配置.env.local（参考.env.local.example）
#    DATABASE_URL 指向本地Postgres
#    STORAGE_ROOT=/tmp/swp-storage
#    RUN_QUEUE=1（开启自动任务处理）

# 4. 初始化DB + seed测试数据
npx prisma db push
export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/seed-db.ts

# 5. 启动
npm run dev
```

### 本地测试打印（无需真实打印机）
```bash
# 终端1：开nc监听9100端口，把收到的数据存成PDF
nc -l 9100 > /tmp/recv.pdf

# 终端2：启动dev server，在浏览器点"发送打印"
# 然后验证/tmp/recv.pdf是有效的PDF文件
```

### 测试脚本
```bash
# 核心lib单元测试（planner/duplicatePdf/render）
npx tsx scripts/test-lib.mjs

# 验证PDF有效性
npx tsx scripts/verify-pdf.ts <pdf文件>

# 生成6页模拟试卷PDF（3学生×正反面）
npx tsx scripts/make-test-pdf.mjs
```

## 🖨️ 打印协议说明（重要！）

本方案**不安装任何打印机驱动**，PDF字节直接发送给打印机，因此**硬性要求网络打印机原生支持PDF Direct Print**。

- ✅ 支持：2015年后企业级激光打印机（HP LaserJet Enterprise、Canon imageRUNNER、Xerox、Ricoh、Konica Minolta、Brother高端）、所有IPP Everywhere/AirPrint/Mopria认证机型
- ❌ 不支持：家用低端喷墨/激光打印机（这类打印机通常只接受PCL/PS/raster，需要驱动转换）
- 测试方法：在设置页点"测试打印机连接"，会发送1页测试PDF，能正常出纸说明支持

详细FRP/OpenWrt/socat配置指南见 [`docs/deploy.md`](docs/deploy.md)。

## 📁 项目结构

```
├── prisma/                      # Prisma schema & migrations
├── public/fonts/                # 内嵌中文字体 NotoSansSC
├── scripts/                     # 测试/seed/工具脚本
├── src/
│   ├── instrumentation.ts       # Next.js启动钩子（启动队列调度器）
│   ├── app/
│   │   ├── login/               # 登录页
│   │   ├── teacher/
│   │   │   ├── page.tsx         # 工作台（待复核/批改中/待打印/打印队列）
│   │   │   ├── batches/         # 批次列表+详情
│   │   │   ├── submissions/[id]/review/  # 核心复核页（批注画布+工具栏+打印）
│   │   │   └── settings/        # 打印机配置+测试
│   │   ├── parent/              # 家长端（保留）
│   │   └── api/
│   │       ├── batches/         # 批次上传/列表/详情/重拆分
│   │       ├── sheets/[id]      # 修正学生身份
│   │       ├── submissions/     # full/annotations/approve/print
│   │       ├── pdfs/[id]        # PDF流式下载
│   │       ├── storage/[...key] # 受保护的文件访问
│   │       ├── print-jobs/      # 打印队列列表/重试/取消
│   │       ├── print/stress-test # 压测：复制N份大PDF一次性发送
│   │       ├── printers/test    # 测试打印机连接
│   │       └── webhooks/webdav  # 扫描仪上传完成回调
│   ├── components/
│   │   ├── annotate/            # PaperCanvas + AnnotationLayer(SVG) + Toolbar + useAnnotations
│   │   ├── batches/SheetCard    # 试卷缩略图卡片
│   │   └── print/PrintButton, PrintQueue
│   └── lib/
│       ├── storage/local.ts     # 本地文件存储（/data/storage）
│       ├── ocr/parsePaper.ts    # VL OCR（bbox坐标+正反面+姓名栏）
│       ├── ai/grade.ts          # 批改逻辑（客观题本地+AI主观题）
│       ├── annotate/planner.ts  # 批注规划（√/×/-N/评语/总分+IOU避让）
│       ├── pdf/
│       │   ├── rasterize.ts     # PDF→JPG（pdfjs+node-canvas）
│       │   ├── split.ts         # 按2页/学生拆分
│       │   └── render.ts        # renderMergedPdf / renderOverlayPdf / duplicatePdf
│       ├── webdav/client.ts     # WebDAV客户端
│       ├── queue/
│       │   ├── scheduler.ts     # 2s轮询 FOR UPDATE SKIP LOCKED
│       │   ├── dispatcher.ts    # 任务路由+重试退避
│       │   ├── webdav-poller.ts # WebDAV轮询发现新文件
│       │   └── jobs/            # split/ocr/grade/annotate/render/stress_gen/print
│       └── print/
│           ├── raw.ts           # TCP 9100 RAW打印
│           ├── ipp.ts           # IPP 631打印
│           └── index.ts         # 协议分发
├── Dockerfile                   # node:20-alpine多阶段构建
├── docker-compose.yml           # app + postgres
├── docker-entrypoint.sh         # 启动前自动migrate
└── docs/deploy.md               # 完整部署文档（FRP/OpenWrt/压测/双feed套打说明）
```

## 🔑 环境变量（完整列表见 `.env.local.example`）

| 变量 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `POSTGRES_PASSWORD` | ✅(docker) | changeme | docker-compose自动创建postgres的密码 |
| `DATABASE_URL` | compose自动 | - | Postgres连接串（docker-compose已自动设置） |
| `AUTH_SECRET` | ✅ | dev-secret... | NextAuth JWT密钥（生产必须改随机值，`openssl rand -base64 32`生成） |
| `AUTH_URL` | ✅ | - | 平台对外访问URL（如 `http://IP:3000` 或 `https://域名`），NextAuth登录回调必需 |
| `NEXTAUTH_URL` | ⭕ | 同AUTH_URL | 同上（v4兼容） |
| `SILICONFLOW_API_KEY` | ⭕ | 空 | 留空则走Mock模式（演示/测试用） |
| `SILICONFLOW_MODEL` | ⭕ | Qwen/Qwen3.6-35B-A3B | 批改文本模型 |
| `STORAGE_ROOT` | compose自动 | /data/storage | PDF/JPG文件存储目录 |
| `RUN_QUEUE` | compose自动 | 1 | 是否在本进程启动任务队列 |
| `PRINTER_HOST` | ⭕ | - | 打印机地址（FRP映射后用 `127.0.0.1`） |
| `PRINTER_PORT` | ⭕ | 9100 | 打印机端口 |
| `PRINTER_PROTOCOL` | ⭕ | raw | raw 或 ipp |
| `PRINTER_TIMEOUT_MS` | ⭕ | 30000 | 打印超时（毫秒） |
| `WEBDAV_BASE_URL` | ⭕ | - | WebDAV服务器地址（扫描仪上传目录） |
| `WEBDAV_USER/PASS` | ⭕ | - | WebDAV认证 |
| `WEBDAV_POLL_INTERVAL_MS` | ⭕ | 60000 | WebDAV轮询间隔 |

### 常用运维命令

```bash
cd /home/ubuntu/grading-print-demo

# 查看实时日志
docker compose logs -f app
docker compose logs -f postgres

# 重启（改完.env后）
docker compose restart app

# 重新构建（代码更新后）
git pull
docker compose up -d --build

# 完全停止+清理数据（慎用！会清数据库）
docker compose down -v

# 进入app容器
docker compose exec app sh

# 手动跑打印压测（也可以在页面里点）
# 1. 老师账号登录，在复核页点"打印压测"
# 2. 设置复制份数（例如100），会生成大PDF一次性发送到打印机
```

## 🔄 工作流程

```
扫描仪扫完 → WebDAV文件夹 → webhook通知/轮询发现
                                    ↓
                    POST /api/webhooks/webdav
                                    ↓
                    创建PaperBatch → enqueue split
                                    ↓
                    split: 按pagesPerStudent(默认2)均分PDF → N个PaperSheet
                                    ↓
                    并行 ocr × N: VL识别每页JPG → 姓名/学号/题目bbox/答案
                                    ↓
                    并行 grade × N: 客观题本地判分 + 主观题AI批
                                    ↓
                    并行 annotate × N: planner生成批注坐标+IOU避让
                                    ↓
                    并行 render × N: 生成merged.pdf + overlay.pdf
                                    ↓
                    batch.status=ready → 老师复核页：
                      · 看SVG批注叠在原卷上
                      · 可拖拽/添加/删除/改分/纠正学生
                      · 点"发送打印" → 创建PrintJob
                                    ↓
                    串行 print: TCP连接PRINTER_HOST:PORT → 发PDF字节
                                    ↓
                              出纸🎉
```

## 🧪 本地测试验证过的功能

- ✅ TypeScript零错误、`next build`生产构建成功
- ✅ Planner批注规划（√/×/-N/评语/总分+IOU避让）
- ✅ duplicatePdf N份复制合并、merged/overlay PDF生成（中文嵌入正确）
- ✅ 上传6页PDF→拆分3份→光栅化→Mock OCR→Mock批改→批注→渲染全流程自动完成
- ✅ RAW TCP打印：nc -l 9100收到完整13MB merged PDF，文件无损
- ✅ 压测：10份复制生成132MB/20页大PDF→一次性TCP发送→nc收到完整20页有效PDF
- ✅ NextAuth登录鉴权、API路由保护

## ⚠️ 已知限制 / 后续可迭代

1. 学生自动身份匹配按姓名contains，准确率有限，老师复核时可下拉纠正
2. 题目bbox完全依赖VL返回精度，位置偏差时老师可在复核页手动拖
3. 批量"一键打印全班"按钮目前从复核页逐个打，未做批次级批量操作
4. WebDAV配置只支持环境变量，未做UI增删改
5. 家长端页面保持原样未改造
6. 未做断点续传/打印失败自动重试之外的高级队列特性（单进程MVP够用）
7. IPP打印仅实现fire-and-wait-close，未做job状态轮询

## 📝 演示账号

- 老师：`teacher` / `123456` → 工作台/批次/复核/打印
- 家长：`parent` / `123456` → 查看孩子作业（保留旧功能）
