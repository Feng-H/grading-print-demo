#!/bin/sh
set -e

# 生成密码文件
if [ -n "$WEBDAV_USER" ] && [ -n "$WEBDAV_PASS" ]; then
    htpasswd -bc /usr/local/apache2/conf/.htpasswd "$WEBDAV_USER" "$WEBDAV_PASS"
    chown www-data:www-data /usr/local/apache2/conf/.htpasswd
    chmod 640 /usr/local/apache2/conf/.htpasswd
else
    echo "Warning: WEBDAV_USER or WEBDAV_PASS not set"
fi

# 确保数据目录权限正确
chown -R www-data:www-data /var/www/html
chmod -R 755 /var/www/html

exec "$@"
