# HackerNews Daily - Docker Image
FROM node:20-alpine

WORKDIR /app

# 安装必要工具
RUN apk add --no-cache git curl tzdata

# 设置时区
ENV TZ=Asia/Shanghai

# 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# 复制编译后的代码
COPY dist/ ./dist/

# 环境变量
ENV NODE_ENV=production

# 执行命令
CMD ["node", "dist/scripts/daily-export-simple.js"]
