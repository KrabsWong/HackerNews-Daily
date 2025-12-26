# 快速参考指南

## 常用命令

### 本地开发

```bash
# 安装依赖
npm install

# 启动本地 Worker 开发服务器
npm run dev:worker

# 构建 Worker
npm run build:worker

# 监视模式构建
npm run build:worker:watch
```

### Cloudflare Worker 部署

```bash
# 部署到生产环境
npm run deploy:worker

# 部署到 staging 环境
npm run deploy:worker:staging

# 查看实时日志
npm run logs:worker

# 验证配置
npm run validate:worker
```

### Wrangler 命令

```bash
# 查看实时日志
npx wrangler tail --format pretty

# 查看错误日志
npx wrangler tail --status error

# 查看 Worker 信息
npx wrangler whoami

# 设置 Secrets
npx wrangler secret put LLM_ZHIPU_API_KEY
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHANNEL_ID
```

### 测试 Worker 端点

```bash
# 本地测试
curl http://localhost:8787/
curl -X POST http://localhost:8787/trigger-export
curl -X POST http://localhost:8787/trigger-export-sync

# 生产环境测试
curl https://your-worker.workers.dev/
curl -X POST https://your-worker.workers.dev/trigger-export
curl -X POST https://your-worker.workers.dev/trigger-export-sync
```

## 环境变量配置

### 必需的环境变量

```bash
# .dev.vars (本地开发)
LLM_PROVIDER=zhipu
LLM_ZHIPU_API_KEY=your_api_key

# 至少启用一个发布渠道
GITHUB_ENABLED=true
GITHUB_TOKEN=your_github_token
TARGET_REPO=owner/repo

# 或 Telegram
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@your_channel
```

### 可选的环境变量

```bash
# wrangler.toml 或 .dev.vars
HN_STORY_LIMIT=30                    # 故事数量
HN_TIME_WINDOW_HOURS=24              # 时间窗口（小时）
SUMMARY_MAX_LENGTH=300               # 摘要最大长度
LLM_BATCH_SIZE=0                     # LLM 批量处理大小（0=不分批）
ENABLE_CONTENT_FILTER=false          # 内容过滤
CRAWLER_API_URL=                     # 爬虫 API URL（用于内容抓取）
```

## 项目结构

```
hacknews-daily/
├── src/
│   ├── api/                     # API 调用层
│   │   ├── hackernews/          # HackerNews API 模块
│   │   │   ├── algolia.ts       # Algolia Search API
│   │   │   ├── firebase.ts      # Firebase API
│   │   │   ├── index.ts         # 统一导出
│   │   │   └── mapper.ts        # 数据映射
│   │   └── index.ts             # API 统一导出
│   ├── services/                # 业务逻辑层
│   │   ├── translator/          # 翻译服务
│   │   ├── articleFetcher.ts    # 文章内容抓取
│   │   ├── contentFilter.ts     # AI 内容过滤
│   │   └── markdownExporter.ts  # Markdown 导出
│   ├── types/                   # 类型定义
│   │   ├── api.ts               # API 相关类型
│   │   ├── shared.ts            # 共享类型
│   │   ├── publisher.ts         # 发布者类型
│   │   └── worker.ts            # Worker 类型
│   ├── utils/                   # 工具函数
│   │   ├── array.ts             # 数组工具
│   │   ├── date.ts              # 日期工具
│   │   ├── fetch.ts             # HTTP 请求封装
│   │   ├── html.ts              # HTML 处理
│   │   └── result.ts            # Result 类型
│   ├── worker/                  # Cloudflare Worker
│   │   ├── index.ts             # Worker 入口
│   │   ├── exportHandler.ts     # 导出处理器
│   │   ├── config/              # 配置验证
│   │   ├── publishers/          # 发布渠道
│   │   │   ├── github/          # GitHub 发布
│   │   │   └── telegram/        # Telegram 发布
│   │   ├── sources/             # 内容源
│   │   ├── logger.ts            # 日志工具
│   │   └── stubs/               # Worker 存根
│   └── config/                  # 配置文件
│       └── constants.ts         # 常量配置
├── docs/                        # 文档
├── wrangler.toml                # Cloudflare Worker 配置
├── tsconfig.json                # TypeScript 配置
└── package.json                 # 项目配置
```

## API 端点

### Worker HTTP 端点

| 端点 | 方法 | 用途 | 返回 |
|-----|------|------|------|
| `/` | GET | 健康检查 | 文本状态 |
| `/trigger-export` | POST | 手动触发导出（异步） | `{ success, message }` |
| `/trigger-export-sync` | POST | 手动触发导出（同步） | `{ success, message }` |

### Cron 触发器

Worker 配置了每日定时任务：
```toml
[triggers]
crons = ["0 1 * * *"]  # 每天 01:00 UTC
```

## 架构说明

### 执行流程

```
Cron Trigger (01:00 UTC 每天)
    ↓
handleDailyExport()
    ↓
runDailyExport(env)
  - 获取故事列表 (Firebase + Algolia)
  - 获取文章内容 (Crawler API)
  - 生成 AI 摘要 (LLM Provider)
  - 获取评论 (Algolia)
  - 生成评论摘要 (LLM Provider)
  - 翻译标题和摘要 (LLM Provider)
  - 生成 Markdown
    ↓
Publishers
  - GitHub (如果启用)
  - Telegram (如果启用)
```

### API 调用说明

处理 30 个故事的典型 API 调用数：

| API Type | 调用次数 | 说明 |
|----------|---------|------|
| Firebase API | 1 | 获取 best stories ID 列表 |
| Algolia API (stories) | 1 | 批量获取故事详情 |
| Crawler API | 30 | 每个故事 1 次内容抓取 |
| Algolia API (comments) | 30 | 每个故事 1 次评论查询 |
| LLM API (翻译/摘要) | 3-6 | 批量处理 |
| GitHub API | 1 | 推送最终结果（如启用） |
| Telegram API | 1-3 | 消息分片发送（如启用） |
| **总计** | **~66-70** | 实际数量取决于配置 |

## 故障排查

### Worker 问题

**问题**: 环境变量未加载
```bash
# 检查 .dev.vars 文件
cat .dev.vars

# 重启开发服务器
npm run dev:worker
```

**问题**: 构建错误
```bash
# 重新构建
npm run build:worker

# 检查 wrangler.toml 配置
cat wrangler.toml | grep compatibility_flags
# 应该包含: compatibility_flags = ["nodejs_compat"]
```

**问题**: Algolia API 500 错误
```
Error: Failed to fetch stories from Algolia HN API: HTTP 500
```
- Algolia API 偶尔会返回 500 错误（服务器临时问题）
- 系统已内置自动重试机制（默认 3 次，指数退避）
- 如果持续失败，稍后重试

## 性能调优

### Worker 调优

```toml
# wrangler.toml

# 调整 LLM 批次大小
LLM_BATCH_SIZE = "0"   # 0 = 不分批，一次处理所有
LLM_BATCH_SIZE = "10"  # 每批 10 个
LLM_BATCH_SIZE = "15"  # 每批 15 个

# 减少故事数量
HN_STORY_LIMIT = "10"
```

## 监控和日志

### 查看实时日志

```bash
# 启动日志流
npm run logs:worker

# 或
npx wrangler tail --format pretty

# 在另一个终端触发任务
curl -X POST http://localhost:8787/trigger-export-sync
```

### 查看 Cloudflare Dashboard

1. 登录 https://dash.cloudflare.com/
2. Workers & Pages
3. 选择 `hackernews-daily-export`
4. 点击 "Logs" 标签

## 更多资源

- [本地开发指南](./local-development.md)
- [日志配置详解](./logging.md)
- [Cloudflare Workers 部署指南](./cloudflare-worker-deployment.md)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
