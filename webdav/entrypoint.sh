#!/bin/sh
set -e

# 生成密码文件
if [ -n "$WEBDAV_USER" ] && [ -n "$WEBDAV_PASS" ]; then
    htpasswd -bc /etc/nginx/.htpasswd "$WEBDAV_USER" "$WEBDAV_PASS"
    chmod 644 /etc/nginx/.htpasswd
else
    echo "Warning: WEBDAV_USER or WEBDAV_PASS not set"
fi

# 确保数据目录存在
mkdir -p /data
mkdir -p /data/.tmp
chown -R nginx:nginx /data
chmod -R 755 /data

exec "$@"
