# Cloudflare Workers 日志配置说明

## 日志系统概述

Cloudflare Workers 会自动记录所有 `console.log()`, `console.error()`, `console.warn()` 等输出到其日志系统。

## 查看日志的方法

### 1. 实时日志流 (Tail Logs) - 免费

**本地开发**:
```bash
# 启动 Worker 后，所有 console 输出会直接显示在终端
npx wrangler dev
```

**生产环境实时日志**:
```bash
# 查看实时日志流
npx wrangler tail

# 查看特定环境的日志
npx wrangler tail --env production

# 格式化输出
npx wrangler tail --format pretty

# 只显示错误
npx wrangler tail --status error
```

### 2. Cloudflare Dashboard - 免费

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Workers & Pages
3. 选择你的 Worker (`hackernews-daily-export`)
4. 点击 "Logs" 标签
5. 查看最近的请求日志（保留 24 小时）

### 3. Logpush (持久化日志) - 付费功能

Logpush 可以将日志推送到外部存储（如 S3、Google Cloud Storage 等），但需要 Workers Paid Plan。

## 当前项目的日志输出

### 主要执行流程日志

```
=== Daily Export Started ===
Running export pipeline
Fetching stories from Firebase and Algolia...
Found X stories from best list
Fetching article content...
Generating AI summaries...
Fetching comments...
Translating titles and summaries...
Pushing to GitHub repository
=== Daily Export Completed ===
```

### 错误日志示例

```
❌ Export failed: <error message>
❌ Failed to fetch stories: <error details>
❌ GitHub push failed: <error details>
```

## 日志级别配置

在 `wrangler.toml` 中可配置（可选）:

```toml
# 生产环境：记录所有日志
[env.production]
log_level = "log"

# 开发环境：记录详细调试信息
[env.dev]
log_level = "debug"
```

## 监控任务执行

### 查看实时执行过程

```bash
# 在一个终端启动日志流
npx wrangler tail --format pretty

# 在另一个终端触发任务
curl -X POST https://your-worker.workers.dev/trigger-export
```

### 检查定时任务执行

Cloudflare Dashboard 会显示每次 Cron 触发的执行结果：

1. 进入 Worker 页面
2. 点击 "Triggers" 标签
3. 查看 "Cron Triggers" 部分的执行历史

## 性能指标

当前实现会自动记录以下指标：

- ✅ 总执行时间
- ✅ 故事数量
- ✅ API 调用状态（成功/失败）
- ✅ GitHub 推送结果
- ✅ 错误详情和堆栈跟踪

## 故障排查

### 查看最近的错误

```bash
# 只显示错误日志
npx wrangler tail --status error
```

### 查看特定时间的日志

在 Cloudflare Dashboard 中：
1. 进入 Worker 的 Logs 页面
2. 使用时间过滤器选择时间范围
3. 搜索特定的错误信息

### 调试模式

```bash
# 本地调试模式（显示更详细的信息）
npx wrangler dev --log-level debug
```

## 日志保留策略

- **实时日志 (Tail)**: 实时流式传输，不持久化
- **Dashboard 日志**: 保留 24 小时（免费版）
- **Logpush**: 可配置长期存储（付费版）

## 最佳实践

1. ✅ **使用结构化日志**: 当前代码使用清晰的日志前缀（如 `===`、`❌`）
2. ✅ **记录关键指标**: 处理时间、故事数量、错误信息
3. ✅ **区分日志级别**: 
   - `console.log()`: 正常操作
   - `console.warn()`: 警告
   - `console.error()`: 错误
4. ✅ **避免敏感信息**: 不记录 API keys 或敏感数据
5. ✅ **包含上下文**: 日志中包含足够信息用于调试

## 告警配置（可选）

如果需要自动告警，可以使用以下方案：

### 方案 1: Workers Analytics Engine

```typescript
// 在 Worker 中记录自定义指标
env.ANALYTICS_ENGINE.writeDataPoint({
  blobs: ['export_completed'],
  doubles: [duration, storiesCount],
  indexes: [dateStr]
});
```

### 方案 2: 外部监控服务
- Sentry (错误追踪)
- Datadog (APM)
- New Relic (监控)

### 方案 3: Discord/Slack Webhook

在导出完成时发送通知：
```typescript
await fetch('https://discord.com/api/webhooks/xxx', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: `✅ 成功导出 ${storiesCount} 个故事到 GitHub`
  })
});
```

## 示例：完整的日志流程

```bash
# 终端 1: 启动日志监控
$ npx wrangler tail --format pretty

# 终端 2: 触发任务
$ curl -X POST https://your-worker.workers.dev/trigger-export
{"success":true,"message":"Export started in background"}

# 终端 1 会显示：
=== Daily Export Started ===
Running export pipeline
Fetching stories from Firebase and Algolia...
Found 30 stories from best list
Fetching article content from Crawler API...
Generating AI summaries...
Fetching comments...
Translating titles and summaries...
Pushing to GitHub repository
=== Daily Export Completed ===
```

## 常见日志消息说明

| 日志消息 | 含义 | 级别 |
|---------|------|------|
| `=== Daily Export Started ===` | 导出任务开始 | INFO |
| `Running export pipeline` | 执行导出流程 | INFO |
| `Fetching stories from...` | 获取故事列表 | INFO |
| `Found X stories...` | 找到 X 个故事 | INFO |
| `Fetching article content...` | 获取文章内容 | INFO |
| `Generating AI summaries...` | 生成 AI 摘要 | INFO |
| `Translating...` | 翻译内容 | INFO |
| `Pushing to GitHub repository` | 推送到 GitHub | INFO |
| `=== Daily Export Completed ===` | 导出完成 | INFO |
| `Export failed: ...` | 导出失败 | ERROR |
| `Missing ... secret` | 缺少必需的密钥 | ERROR |

## 更多资源

- [Cloudflare Workers Logging Docs](https://developers.cloudflare.com/workers/observability/logging/)
- [Tail Workers Docs](https://developers.cloudflare.com/workers/observability/logging/tail-workers/)
- [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
