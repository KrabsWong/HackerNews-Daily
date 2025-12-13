# Change: Add Telegram Channel Publisher

## Why
用户需要在数据拉取完成后，将 HackerNews 日报内容推送到 Telegram 频道，实现多渠道内容分发，方便订阅者通过 Telegram 接收每日更新。

## What Changes
- 新增 `TelegramPublisher` 类，实现 `Publisher` 接口
- 支持将 Markdown 内容发送到指定的 Telegram 频道
- 支持 Telegram Bot API 的 `sendMessage` 方法，使用 Markdown/HTML 格式化
- 由于 Telegram 消息有 4096 字符限制，需要实现消息分片逻辑
- 在 Worker 中支持多发布渠道并行执行
- 新增配置变量：`TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHANNEL_ID`

## Additional Changes (Post-Implementation)

### 移除 CLI 测试模式
决定统一使用 Worker 模式进行本地测试 (`npm run dev:worker`)，移除了 CLI 模式 (`npm run fetch`)：

**删除的文件**:
- `src/index.ts` - CLI 入口点
- `src/services/cache.ts` - CLI 专用本地缓存
- `src/types/cache.ts` - 缓存类型定义
- `src/utils/logger.ts` - CLI 文件日志
- `tsconfig.node.json` - CLI TypeScript 配置
- `scripts/` 目录

**更新的 package.json scripts**:
```json
{
  "build:worker": "node esbuild.worker.config.js",
  "build:worker:watch": "node esbuild.worker.config.js --watch",
  "clean:worker": "rm -rf dist/worker",
  "dev:worker": "wrangler dev --local --persist-to .wrangler/state",
  "deploy:worker": "npm run build:worker && wrangler deploy",
  "deploy:worker:staging": "npm run build:worker && wrangler deploy --env staging",
  "logs:worker": "wrangler tail",
  "validate:worker": "wrangler validate"
}
```

### 改进错误日志
修复了错误日志显示 `[object Object]` 的问题：

**新增函数** (`src/worker/logger.ts`):
- `formatError(error: unknown)` - 安全格式化任意类型错误对象
- `getErrorMessage(error: unknown)` - 从任意类型错误中提取消息字符串

**更新的文件**:
- `src/services/translator/title.ts` - 使用 `getErrorMessage()` 格式化错误
- `src/services/translator/summary.ts` - 使用 `getErrorMessage()` 格式化错误
- `src/api/hackernews/algolia.ts` - 使用 `getErrorMessage()` 格式化错误
- `src/services/contentFilter.ts` - 使用 `getErrorMessage()` 格式化错误

### 修复 Telegram 空消息问题
测试发现 Telegram 推送的消息内容为空，原因是 markdown 解析逻辑与实际生成的格式不匹配：

**问题**:
- `formatter.ts` 期望格式: `## 1. [Title](url)` 
- 实际生成格式: `## 1. 【中文标题】`
- 导致解析失败，返回 "今日暂无更新内容"

**解决方案**: 改为每条故事单独发送一条消息

**修改的类型**:
- `src/types/publisher.ts` - `PublishContent` 新增 `stories: ProcessedStory[]`
- `src/types/source.ts` - `SourceContent` 新增 `stories: ProcessedStory[]`

**修改的代码**:
- `src/worker/sources/hackernews.ts` - `runDailyExport` 返回 stories 数组
- `src/worker/publishers/telegram/formatter.ts` - 完全重写，直接使用 `ProcessedStory[]`
- `src/worker/publishers/telegram/index.ts` - 逐条发送，失败不中断后续消息

## Impact
- **Affected specs**: 新增 `telegram-publisher` capability
- **Affected code**: 
  - `src/types/publisher.ts` - 新增 `TelegramPublisherConfig` 类型
  - `src/worker/publishers/telegram/` - 新增 Telegram 发布器实现
  - `src/worker/index.ts` - 添加 Telegram 发布渠道
  - `src/types/worker.ts` - 扩展 `Env` 类型
  - `wrangler.toml` - 新增 Telegram 配置项
  - `src/worker/logger.ts` - 新增 `formatError()` 和 `getErrorMessage()` 函数
- **Removed code** (CLI mode):
  - `src/index.ts` - CLI 入口点
  - `src/services/cache.ts` - 本地缓存服务
  - `src/types/cache.ts` - 缓存类型
  - `src/utils/logger.ts` - 文件日志
  - `tsconfig.node.json` - CLI TypeScript 配置
- **Dependencies**: 无外部依赖，使用原生 fetch 调用 Telegram Bot API
