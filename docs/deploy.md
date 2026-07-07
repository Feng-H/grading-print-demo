# 部署指南

## 架构
- Next.js 应用（单进程包含Web+队列+WebDAV轮询+打印推送）
- PostgreSQL 数据库
- 扫描仪通过WebDAV文件夹上传PDF，平台webhook或定时轮询发现新文件自动处理

## 前置要求
- Docker + Docker Compose v2
- 已支持 PDF Direct Print 的网络打印机（2015年后企业级激光打印机普遍支持；所有IPP Everywhere/AirPrint/Mopria认证机原生支持PDF）
- （可选）FRP内网穿透 + OpenWrt + socat 映射内网打印机到服务器

## 快速启动

1. 复制环境变量模板：
```bash
cp .env.local.example .env
```

2. 编辑 `.env` 配置：
```env
# 数据库（docker-compose里的postgres）
POSTGRES_PASSWORD=your-strong-password
DATABASE_URL=postgresql://swp:your-strong-password@postgres:5432/swp

# NextAuth
NEXTAUTH_SECRET=your-random-secret-here
NEXTAUTH_URL=http://your-server:3000

# SiliconFlow API
SILICONFLOW_API_KEY=sk-your-key
SILICONFLOW_MODEL=Qwen/Qwen3.6-35B-A3B
SILICONFLOW_VL_MODEL=Qwen/Qwen3-VL-32B-Instruct

# 打印机（FRP映射后的地址）
PRINTER_HOST=127.0.0.1
PRINTER_PORT=9100
PRINTER_PROTOCOL=raw
PRINTER_TIMEOUT_MS=30000

# WebDAV（可选，扫描仪直接调webhook可以不配）
# WEBDAV_BASE_URL=http://scanner.local/dav
# WEBDAV_USER=user
# WEBDAV_PASS=pass
# WEBDAV_WATCH_PATH=/scans/inbox
# WEBDAV_WEBHOOK_TOKEN=your-secret-token
```

3. 启动：
```bash
docker compose up -d --build
```

4. 初始化数据库种子（可选演示数据）：
```bash
docker compose exec app npx prisma db seed
```

5. 访问 http://your-server:3000，用 `teacher/123456` 登录

## 打印机对接（FRP + OpenWrt + socat）

### OpenWrt端（内网）
1. 安装socat：`opkg install socat`
2. 映射打印机9100端口：
```bash
socat TCP-LISTEN:9100,fork,reuseaddr TCP:192.168.1.100:9100
```
（192.168.1.100 是内网打印机IP，9100是RAW端口）

### FRP配置
**服务端frps.toml**（VPS上）：
```toml
bindPort = 7000
```

**客户端frpc.toml**（OpenWrt上）：
```toml
serverAddr = "your-vps-ip"
serverPort = 7000

[[proxies]]
name = "printer"
type = "tcp"
localIP = "127.0.0.1"
localPort = 9100
remotePort = 9100
```

启动后服务器上 `127.0.0.1:9100` 即转发到内网打印机。

### 测试打印
在平台设置页点"测试打印机连接"验证RAW协议可达。IPP协议用户把`PRINTER_PROTOCOL=ipp PRINTER_PORT=631`，确保打印机开启IPP。

## 扫描仪webhook配置
扫描仪或WebDAV服务上传完成后，POST到：
```
http://your-server:3000/api/webhooks/webdav
```
Header: `X-Webhook-Token: your-secret-token`（如果配置了）
Body: `{"path": "/relative/path/to/file.pdf"}`

平台会自动下载PDF→拆分→OCR→批改→生成批注PDF→进入"待复核"列表。

## 压测
在任意复核页右侧"打印压测"按钮，设置复制份数（如100份），平台将源PDF复制N份合并成大PDF一次性发送到打印机，用于测试FRP网络稳定性、超时、丢包。

## 数据存储
- `/data/storage` 容器内路径，docker卷持久化，包含：上传PDF、拆分页JPG、渲染的批注PDF
- Postgres数据在`swp-postgres`卷

## 二次进纸套打说明
生成两种PDF：
1. **原卷+批注（merged）**：学生试卷图片/原PDF + 红笔批注，直接打印到白纸即可看到完整批改效果
2. **纯批注（overlay）**：白底+红字，用于"二次进纸套打"——把学生原卷纸再次放入打印机进纸器，只打印红色批注叠在原卷上，效果等同老师直接在卷子上批
