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
3. 选择你的 Worker (`hacknews-daily-export`)
4. 点击 "Logs" 标签
5. 查看最近的请求日志（保留 24 小时）

### 3. Logpush (持久化日志) - 付费功能

Logpush 可以将日志推送到外部存储（如 S3、Google Cloud Storage 等），但需要 Workers Paid Plan。

## 当前项目的日志输出

### Orchestrator (`/start-export`)
```
🚀 Starting distributed export task {taskId}
  - totalStories: 30
  - batchSize: 10
  - totalBatches: 3
```

### Batch Processor (`/process-batch`)
```
📦 Processing batch {batchIndex} for task {taskId}: {count} stories
📥 Phase 1: Fetching comments and content for batch {batchIndex}
✅ Phase 1 complete: {count} comment arrays, {count} crawler calls
🤖 Phase 2: Batch AI processing for batch {batchIndex}
✅ Phase 2 complete: {count} LLM calls
📦 Phase 3: Assembling processed stories for batch {batchIndex}
✅ Phase 3 complete: {count} stories processed
✅ Batch {batchIndex} completed in {duration}ms: {count} stories, {count} subrequests
```

### Aggregator (`/aggregate-and-publish`)
```
📊 Aggregating results for task {taskId}
✅ Aggregated {count} stories from {count} batches
📊 Total subrequests across all batches: {count}
🚀 Pushing to GitHub repository
✅ Successfully published {count} stories to GitHub
```

### 错误日志
```
❌ Batch {batchIndex} failed after {duration}ms: {error}
⚠️ Only {completedBatches}/{totalBatches} batches completed
⚠️ Batch {batchIndex} failed: {error}
```

## 日志级别配置

在 `wrangler.toml` 中已配置：

```toml
# 生产环境：记录所有日志
[env.production]
log_level = "log"

# 开发环境：记录详细调试信息
[env.dev]
log_level = "debug"
```

## 监控任务执行

### 查询任务状态

```bash
# 获取任务 ID（从 /start-export 返回）
curl https://your-worker.workers.dev/start-export

# 查询任务状态
curl "https://your-worker.workers.dev/task-status?taskId=task_xxx"
```

### 查看实时执行过程

```bash
# 在一个终端启动日志流
npx wrangler tail --format pretty

# 在另一个终端触发任务
curl https://your-worker.workers.dev/start-export
```

## 性能指标

当前实现会自动记录以下指标：

- ✅ 每个批次的处理时间
- ✅ 每个批次的 subrequest 计数
- ✅ 总 subrequest 计数
- ✅ 失败的批次信息
- ✅ API 调用统计（Algolia, Crawler, LLM）

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
3. 搜索特定的 taskId 或错误信息

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

1. ✅ **使用结构化日志**: 当前代码已使用 emoji 和清晰的标识符
2. ✅ **记录关键指标**: 处理时间、请求计数、错误信息
3. ✅ **使用 taskId 关联**: 所有日志都包含 taskId 便于追踪
4. ✅ **区分日志级别**: 
   - `console.log()`: 正常操作
   - `console.warn()`: 警告（如部分批次失败）
   - `console.error()`: 错误
5. ✅ **避免敏感信息**: 不记录 API keys 或用户数据

## 告警配置（可选）

如果需要自动告警，可以使用以下方案：

### 方案 1: Workers Analytics Engine
```typescript
// 在 Worker 中记录自定义指标
env.ANALYTICS_ENGINE.writeDataPoint({
  blobs: [taskId, 'export_completed'],
  doubles: [totalSubrequests, duration],
  indexes: [taskId]
});
```

### 方案 2: 外部监控服务
- Sentry (错误追踪)
- Datadog (APM)
- New Relic (监控)

### 方案 3: Discord/Slack Webhook
在 Aggregator 完成时发送通知：
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
$ curl https://your-worker.workers.dev/start-export
{"success":true,"taskId":"task_1234","totalBatches":3}

# 终端 1 会显示：
🚀 Starting distributed export task task_1234
📦 Processing batch 0 for task task_1234: 10 stories
📦 Processing batch 1 for task task_1234: 10 stories
📦 Processing batch 2 for task task_1234: 10 stories
✅ Batch 0 completed in 15000ms: 10 stories, 22 subrequests
✅ Batch 1 completed in 14500ms: 10 stories, 21 subrequests
✅ Batch 2 completed in 15200ms: 10 stories, 23 subrequests
📊 Aggregating results for task task_1234
✅ Aggregated 30 stories from 3 batches
📊 Total subrequests across all batches: 66
✅ Successfully published 30 stories to GitHub
```

## 更多资源

- [Cloudflare Workers Logging Docs](https://developers.cloudflare.com/workers/observability/logging/)
- [Tail Workers Docs](https://developers.cloudflare.com/workers/observability/logging/tail-workers/)
- [Analytics Engine](https://developers.cloudflare.com/analytics/analytics-engine/)
