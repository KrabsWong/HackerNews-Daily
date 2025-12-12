# 快速参考指南

## 常用命令

### 本地开发

```bash
# 安装依赖
npm install

# 运行本地 fetch（显示在终端）
npm run fetch

# 导出昨天的文章到文件
npm run fetch -- --export-daily

# 强制刷新（跳过缓存）
npm run fetch -- --no-cache

# 构建项目
npm run build
```

### Cloudflare Worker 开发

```bash
# 启动本地 Worker 开发服务器
npx wrangler dev

# 部署到生产环境
npx wrangler deploy

# 查看实时日志
npx wrangler tail --format pretty

# 查看错误日志
npx wrangler tail --status error

# 查看 Worker 信息
npx wrangler whoami
```

### 测试 Worker 端点

```bash
# 健康检查
curl https://your-worker.workers.dev/

# 手动触发导出（异步，后台执行）
curl -X POST https://your-worker.workers.dev/trigger-export

# 手动触发导出（同步，等待完成）
curl -X POST https://your-worker.workers.dev/trigger-export-sync
```

## 环境变量配置

### 必需的环境变量

```bash
# .env (本地)
DEEPSEEK_API_KEY=your_deepseek_api_key
GITHUB_TOKEN=your_github_token

# Cloudflare Workers Secrets (生产)
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put GITHUB_TOKEN
```

### 可选的环境变量

```bash
# wrangler.toml 或 .env
HN_STORY_LIMIT=30                    # 故事数量
HN_TIME_WINDOW_HOURS=24              # 时间窗口（小时）
SUMMARY_MAX_LENGTH=300               # 摘要最大长度
LLM_BATCH_SIZE=0                     # LLM 批量处理大小（0=不分批）
ENABLE_CONTENT_FILTER=false          # 内容过滤
CACHE_ENABLED=true                   # 本地缓存（仅本地）
CACHE_TTL_MINUTES=30                 # 缓存时效（仅本地）
CRAWLER_API_URL=                     # 爬虫 API URL（必需，用于内容抓取）
```

## 项目结构

```
hacknews-daily/
├── src/
│   ├── index.ts                 # 本地 CLI 入口
│   ├── api/                     # API 调用层
│   │   ├── hackernews/          # HackerNews API 模块
│   │   │   ├── algolia.ts       # Algolia Search API
│   │   │   ├── firebase.ts      # Firebase API
│   │   │   ├── index.ts         # 统一导出
│   │   │   └── mapper.ts        # 数据映射
│   │   └── index.ts             # API 统一导出
│   ├── services/                # 业务逻辑层
│   │   ├── translator/          # 翻译服务
│   │   │   ├── index.ts         # 翻译服务入口
│   │   │   ├── summary.ts       # 摘要翻译
│   │   │   └── title.ts         # 标题翻译
│   │   ├── articleFetcher.ts    # 文章内容抓取
│   │   ├── cache.ts             # 本地缓存管理
│   │   ├── contentFilter.ts     # AI 内容过滤
│   │   ├── llmProvider.ts       # LLM 提供商抽象
│   │   └── markdownExporter.ts  # Markdown 导出
│   ├── types/                   # 类型定义
│   │   ├── api.ts               # API 相关类型
│   │   ├── shared.ts            # 共享类型
│   │   └── task.ts              # 任务类型
│   ├── utils/                   # 工具函数
│   │   ├── array.ts             # 数组工具
│   │   ├── date.ts              # 日期工具
│   │   ├── fetch.ts             # HTTP 请求封装
│   │   ├── html.ts              # HTML 处理
│   │   └── result.ts            # Result 类型
│   ├── worker/                  # Cloudflare Worker
│   │   ├── index.ts             # Worker 入口
│   │   ├── exportHandler.ts     # 导出处理器
│   │   ├── githubClient.ts      # GitHub API
│   │   ├── githubPush.ts        # GitHub 推送
│   │   ├── logger.ts            # 日志工具
│   │   └── stubs/               # Worker 存根
│   └── config/                  # 配置文件
│       └── constants.ts         # 常量配置
├── docs/                        # 文档
│   ├── cloudflare-worker-deployment.md
│   ├── LOCAL_DEVELOPMENT.md     # 本地开发指南
│   ├── LOGGING.md               # 日志配置指南
│   ├── QUICK_REFERENCE.md       # 快速参考（本文件）
│   └── README.md                # 文档索引
├── wrangler.toml                # Cloudflare Worker 配置
├── tsconfig.json                # TypeScript 配置（Worker）
├── tsconfig.node.json           # TypeScript 配置（本地）
└── package.json                 # 项目配置
```

## API 端点

### Worker HTTP 端点

| 端点 | 方法 | 用途 | 返回 |
|-----|------|------|------|
| `/` | GET | 健康检查 | 文本状态 |
| `/trigger-export` | POST | 手动触发导出（异步，后台执行） | `{ success, message }` |
| `/trigger-export-sync` | POST | 手动触发导出（同步，等待完成） | `{ success, message }` |

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
pushToGitHub()
  - 推送到目标仓库
```

### API 调用说明

处理 30 个故事的典型 API 调用数：

| API Type | 调用次数 | 说明 |
|----------|---------|------|
| Firebase API | 1 | 获取 best stories ID 列表 |
| Algolia API (stories) | 1 | 批量获取故事详情 |
| Crawler API | 30 | 每个故事 1 次内容抓取 |
| Algolia API (comments) | 30 | 每个故事 1 次评论查询 |
| LLM API (翻译/摘要) | 3-6 | 批量处理（取决于配置） |
| GitHub API | 1 | 推送最终结果 |
| **总计** | **~66** | 实际数量取决于批次配置 |

## 故障排查

### 本地问题

**问题**: `npm run fetch` 失败
```bash
# 检查 Node.js 版本
node --version  # 应该 >= 20.x

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 检查环境变量
cat .env | grep DEEPSEEK_API_KEY
```

**问题**: TypeScript 错误
```bash
# 清理并重新构建
npm run build
```

**问题**: 缓存问题
```bash
# 清除缓存
rm -rf .cache/

# 强制刷新
npm run fetch -- --no-cache
```

### Worker 问题

**问题**: `wrangler dev` 打包错误
```bash
# 确保配置正确
cat wrangler.toml | grep compatibility_flags

# 应该包含: compatibility_flags = ["nodejs_compat"]

# 重新构建
npm run build
npx wrangler dev
```

**问题**: Algolia API 500 错误
```
Error: Failed to fetch stories from Algolia HN API: HTTP 500: Internal Server Error
```

**解决方案**:
- Algolia API 偶尔会返回 500 错误（服务器临时问题）
- 系统已内置自动重试机制（默认 3 次，指数退避）
- 如果持续失败，稍后重试或检查 Algolia 服务状态

## 性能调优

### 本地 Fetch 调优

```bash
# 减少故事数量
export HN_STORY_LIMIT=10

# 缩短时间窗口
export HN_TIME_WINDOW_HOURS=12

# 启用缓存
export CACHE_ENABLED=true
export CACHE_TTL_MINUTES=60
```

### Worker 调优

```toml
# wrangler.toml

# 调整 LLM 批次大小
LLM_BATCH_SIZE = "0"   # 0 = 不分批，一次处理所有
LLM_BATCH_SIZE = "10"  # 每批 10 个
LLM_BATCH_SIZE = "15"  # 每批 15 个
```

### LLM 批量配置

通过环境变量 `LLM_BATCH_SIZE` 配置：

```bash
# wrangler.toml 或 .env
LLM_BATCH_SIZE=0   # 0 = 不分批，一次处理所有（推荐）
LLM_BATCH_SIZE=10  # 每批 10 个
LLM_BATCH_SIZE=15  # 每批 15 个
```

## 监控和日志

### 查看实时日志

```bash
# 启动日志流
npx wrangler tail --format pretty

# 在另一个终端触发任务
curl -X POST https://your-worker.workers.dev/trigger-export

# 你会看到：
# === Daily Export Started ===
# Running export pipeline
# Fetching stories from Firebase and Algolia...
# Fetching article content from Crawler API...
# Generating AI summaries...
# Fetching comments...
# Translating titles and summaries...
# Pushing to GitHub repository
# === Daily Export Completed ===
```

### 查看 Cloudflare Dashboard

1. 登录 https://dash.cloudflare.com/
2. Workers & Pages
3. 选择 `hacknews-daily-export`
4. 点击 "Logs" 标签
5. 查看最近 24 小时的日志

## 更多资源

- [完整本地开发指南](./LOCAL_DEVELOPMENT.md)
- [日志配置详解](./LOGGING.md)
- [Cloudflare Workers 部署指南](./cloudflare-worker-deployment.md)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
