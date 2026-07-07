# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装系统依赖（canvas需要）
RUN apk add --no-cache \
  build-base \
  cairo-dev \
  pango-dev \
  jpeg-dev \
  giflib-dev \
  librsvg-dev \
  python3

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ============ 运行阶段 ============
FROM node:20-alpine

WORKDIR /app

# 安装运行期依赖
RUN apk add --no-cache \
  dumb-init \
  cairo \
  pango \
  jpeg \
  giflib \
  librsvg \
  ttf-noto-cjk \
  poppler-utils \
  && addgroup -S nodejs && adduser -S nextjs -G nodejs

# 复制构建产物
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/canvas ./node_modules/canvas
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/ipp ./node_modules/ipp

# 准备存储目录
RUN mkdir -p /data/storage && chown -R nextjs:nodejs /data/storage

# 启动脚本
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV STORAGE_ROOT=/data/storage
ENV RUN_QUEUE=1
ENV PORT=3000

EXPOSE 3000

USER nextjs

ENTRYPOINT ["dumb-init", "--", "/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
