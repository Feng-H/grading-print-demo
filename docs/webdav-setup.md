# WebDAV 部署指南

本项目内置 WebDAV 服务，供扫描仪上传 PDF 文件。

## 快速开始

### 1. 配置环境变量

复制 `env.docker.example` 为 `.env`，修改以下配置：

```env
# WebDAV 服务端口（宿主机端口，默认8081）
WEBDAV_PORT=8081

# WebDAV 用户名和密码（请修改为强密码）
WEBDAV_USER=scanner
WEBDAV_PASS=your-strong-password-here

# 智学通应用连接 WebDAV
# 方式一：同一 Docker 网络内使用服务名（推荐）
WEBDAV_BASE_URL=http://webdav
WEBDAV_WATCH_PATH=/

# 方式二：通过 Nginx Manager 反向代理（需要配置 HTTPS）
# WEBDAV_BASE_URL=https://webdav.your-domain.com
```

### 2. 启动服务

```bash
docker compose up -d
```

### 3. 验证 WebDAV

- 本地访问：`http://localhost:8081`
- 或通过 Nginx Manager 配置的 HTTPS 域名访问

## 在 Nginx Manager 中配置反向代理

1. 登录 Nginx Manager
2. 添加 Proxy Host
3. 配置如下：

| 配置项 | 值 |
|-------|-----|
| Domain Names | 你的域名（如 `webdav.your-domain.com`） |
| Scheme | `http` |
| Forward Hostname / IP | `webdav`（Docker 服务名）或宿主机 IP |
| Forward Port | `80` 或 `8081` |
| Cache Assets | 关闭 |
| Block Common Exploits | 开启 |
| Websockets Support | 关闭 |

4. 在 SSL 标签页中申请 Let's Encrypt 证书

## 扫描仪配置

在扫描仪中配置 WebDAV 连接：

- 服务器地址：`https://webdav.your-domain.com`
- 路径：`/`
- 用户名：`scanner`（或你设置的 `WEBDAV_USER`）
- 密码：你的密码

## 智学通应用连接说明

如果智学通应用和 WebDAV 在同一 `docker-compose.yml` 中：

- `WEBDAV_BASE_URL=http://webdav`（使用 Docker 内部网络，性能更好）

如果智学通在其他地方：

- `WEBDAV_BASE_URL=https://webdav.your-domain.com`（通过 Nginx Manager）

## 数据持久化

WebDAV 上传的文件存储在 Docker volume `swp-webdav-data` 中。

查看文件：
```bash
# 查看 volume 内容
docker run --rm -v swp-webdav-data:/data alpine ls -la /data
```

备份数据：
```bash
docker run --rm -v swp-webdav-data:/data -v $(pwd):/backup alpine tar czf /backup/webdav-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## 故障排查

### WebDAV 无法访问

```bash
# 查看容器状态
docker compose ps webdav

# 查看日志
docker compose logs webdav
```

### 智学通无法连接 WebDAV

确认 `.env` 中的 `WEBDAV_BASE_URL` 配置正确。同一 Docker 网络内使用 `http://webdav`。

```bash
# 在 app 容器内测试连接
docker compose exec app wget -O- --user=scanner --password=your-password http://webdav/
```
