# ============================================
# AI教学平台前端 Dockerfile
# 多阶段构建：构建 + Nginx 托管
# ============================================

FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --production=false

COPY tsconfig.json tsconfig.node.json tsconfig.build.json vite.config.ts index.html ./
COPY src/ ./src/

RUN npm run build

FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD pgrep -x nginx || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]