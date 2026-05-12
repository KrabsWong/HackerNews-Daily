# 腾讯云轻量服务器部署指南

## 架构

```
腾讯云服务器 (Docker)
├── Node.js 主服务
├── Jina.ai 爬虫 (外部 API)
├── DeepSeek LLM (外部 API)
└── Cron 定时执行

内存占用: ~200MB
推荐配置: 2核2GB
```

## 快速部署

### 1. 本地构建

```bash
npm run build
docker build -f deploy/Dockerfile -t hackernews-daily:latest .
```

### 2. 配置环境变量

```bash
cp deploy/.env.example deploy/.env
vi deploy/.env
```

### 3. 上传到服务器

```bash
docker save hackernews-daily:latest | gzip > /tmp/hackernews-daily.tar.gz
scp /tmp/hackernews-daily.tar.gz root@your-ip:/tmp/
scp deploy/.env root@your-ip:/opt/hackernews-daily/
```

### 4. 服务器部署

```bash
ssh root@your-ip

# 安装 Docker
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun
systemctl start docker && systemctl enable docker

# 加载镜像
mkdir -p /opt/hackernews-daily
cd /opt/hackernews-daily
docker load < /tmp/hackernews-daily.tar.gz

# 测试执行
docker run --rm --env-file .env hackernews-daily
```

### 5. 配置定时任务

```bash
crontab -e

# 每天早晨 8 点执行
0 8 * * * cd /opt/hackernews-daily && docker run --rm --env-file .env hackernews-daily >> /var/log/hackernews-daily.log 2>&1
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `JINA_API_KEY` | ✅ | Jina.ai Reader API Key |
| `LLM_DEEPSEEK_API_KEY` | ✅ | DeepSeek API Key |
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token |
| `TARGET_REPO` | ✅ | 目标仓库 (owner/repo) |
| `TARGET_BRANCH` | ❌ | 分支 (默认 main) |
| `TELEGRAM_ENABLED` | ❌ | 是否启用 Telegram |
| `TELEGRAM_BOT_TOKEN` | ❌ | Telegram Bot Token |
| `TELEGRAM_CHANNEL_ID` | ❌ | Telegram Channel ID |

## 获取 API Key

- **Jina.ai**: https://jina.ai/reader/ (免费 500 RPM)
- **DeepSeek**: https://platform.deepseek.com/
- **GitHub Token**: https://github.com/settings/tokens (repo 权限)

## 故障排查

```bash
# 查看日志
tail -f /var/log/hackernews-daily.log

# 手动执行测试
docker run --rm --env-file .env hackernews-daily

# 检查环境变量
docker run --rm --env-file .env hackernews-daily env | grep API_KEY
```

## 更新服务

```bash
# 本地重新构建
docker build -f deploy/Dockerfile -t hackernews-daily:latest .
docker save hackernews-daily:latest | gzip > /tmp/hackernews-daily.tar.gz
scp /tmp/hackernews-daily.tar.gz root@your-ip:/tmp/

# 服务器更新
ssh root@your-ip
cd /opt/hackernews-daily
docker load < /tmp/hackernews-daily.tar.gz
```