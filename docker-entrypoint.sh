#!/bin/sh
set -e

echo "[entrypoint] 等待数据库..."
# 简单等待
sleep 2

echo "[entrypoint] 运行数据库迁移..."
npx prisma migrate deploy || npx prisma db push --accept-data-loss

echo "[entrypoint] 启动应用..."
exec "$@"
