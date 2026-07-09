#!/bin/sh
set -e

echo "[entrypoint] 等待数据库..."
# 简单等待
sleep 2

echo "[entrypoint] 运行数据库迁移..."
# 使用 npx 并锁定 Prisma 5.22.0 版本
npx prisma@5.22.0 db push

echo "[entrypoint] 启动应用..."
exec "$@"
