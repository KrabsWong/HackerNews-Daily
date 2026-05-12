# HackerNews Daily

每日自动获取 HackerNews 热门文章，使用 AI 翻译和摘要，发布到 GitHub 和 Telegram。

## 技术栈

- **爬虫**: [Jina.ai Reader API](https://jina.ai/reader/) (500 RPM)
- **LLM**: [DeepSeek](https://deepseek.com/) (翻译和摘要)
- **发布**: GitHub + Telegram

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# Jina.ai API Key（必填）
JINA_API_KEY=your-jina-api-key

# DeepSeek API Key（必填）
LLM_DEEPSEEK_API_KEY=your-deepseek-api-key

# GitHub 配置（必填）
GITHUB_TOKEN=your-github-token
TARGET_REPO=your-username/your-repo
TARGET_BRANCH=main

# Telegram 配置（可选）
TELEGRAM_ENABLED=false
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHANNEL_ID=@your-channel

# 可选配置
HN_STORY_LIMIT=30
SUMMARY_MAX_LENGTH=300
```

### 3. 本地运行

```bash
npm run dev
```

### 4. 编译

```bash
npm run build
npm start
```

## 部署到腾讯云

详见 [deploy/README.md](deploy/README.md)

### 快速部署

```bash
# 构建 Docker 镜像
docker build -f deploy/Dockerfile -t hackernews-daily .

# 运行
docker run --rm \
  -e JINA_API_KEY=xxx \
  -e LLM_DEEPSEEK_API_KEY=xxx \
  -e GITHUB_TOKEN=xxx \
  -e TARGET_REPO=xxx \
  hackernews-daily
```

## 项目结构

```
src/
├── api/
│   └── hackernews/     # Algolia HN API
├── services/
│   ├── articleFetcher/ # Jina.ai 爬虫
│   ├── llm/           # DeepSeek LLM
│   ├── translator/    # 翻译服务
│   └── markdownExporter.ts
├── scripts/
│   └── daily-export-simple.ts  # 主脚本
├── utils/
│   ├── date.ts
│   └── fetch.ts
└── types/
    └── index.ts
```

## 获取 API Key

- **Jina.ai**: https://jina.ai/reader/ (免费 500 RPM)
- **DeepSeek**: https://platform.deepseek.com/ (新用户送额度)
- **GitHub Token**: https://github.com/settings/tokens (需要 repo 权限)

## License

MIT