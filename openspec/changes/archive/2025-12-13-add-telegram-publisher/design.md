# Design: Telegram Channel Publisher

## Context

HackerNews Daily 需要多渠道内容分发能力。当前仅支持 GitHub 发布，用户希望在数据拉取完成后自动推送到 Telegram 频道，使订阅者可以通过 Telegram 接收每日更新。

### Constraints
- Telegram 单条消息最大 4096 字符
- Telegram Bot API 使用 HTTP REST 接口
- Worker 环境无法使用 WebSocket（无需 polling）
- 需要兼容现有 Publisher 接口

## Goals / Non-Goals

### Goals
- 实现 Telegram 频道推送功能
- 遵循现有 Publisher 抽象模式
- 支持 Markdown 格式化消息
- 处理长内容的消息分片
- 可选启用（不影响现有 GitHub 发布）

### Non-Goals
- 不实现双向交互（仅发送，不处理回复）
- 不实现消息编辑/删除功能
- 不支持媒体文件发送（仅文本）
- 不实现 Webhook 接收

## Decisions

### Decision 1: 使用原生 fetch 调用 Telegram Bot API

**选择**: 直接使用 `fetch` 调用 `https://api.telegram.org/bot{token}/sendMessage`

**原因**:
- 项目已有 `utils/fetch.ts` 封装
- 无需引入额外依赖（如 node-telegram-bot-api）
- Cloudflare Worker 环境原生支持 fetch
- Telegram Bot API 是简单的 REST API

**替代方案**:
- node-telegram-bot-api: 功能强大但体积大，Worker 兼容性不确定
- grammy: 现代化但增加 bundle 大小

### Decision 2: 消息分片策略

**选择**: 按故事为单位分片，每条消息包含完整故事信息

**策略**:
1. 每条消息发送一批故事（约 3-5 篇）
2. 第一条消息包含日报标题和日期
3. 后续消息继续发送剩余故事
4. 消息间添加适当延迟（避免 rate limit）

**原因**:
- 保持每篇故事信息的完整性
- 便于用户阅读和分享
- 避免在故事中间截断

**替代方案**:
- 纯字符计数分片: 可能在句子中间截断
- 单独发送每篇故事: 消息过多，可能触发 rate limit

### Decision 3: 可选启用机制

**选择**: 通过 `TELEGRAM_ENABLED` 环境变量控制

**配置**:
```
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_CHANNEL_ID=@channel_name 或 -100xxxxxxxxx
```

**原因**:
- 不影响现有 GitHub 发布流程
- 用户可以选择性启用
- 简化配置验证逻辑

### Decision 4: 发布顺序

**选择**: GitHub 发布成功后，再执行 Telegram 发布

**流程**:
```
Source.fetchContent() → GitHub.publish() → Telegram.publish()
```

**原因**:
- GitHub 发布是主要目标，Telegram 是补充
- 如果 GitHub 失败，无需发送 Telegram 通知
- 避免部分成功导致的不一致状态

**替代方案**:
- 并行发布: 可能导致 GitHub 失败但 Telegram 成功的情况
- 先 Telegram 后 GitHub: 优先级不符合当前需求

## Risks / Trade-offs

### Risk 1: Telegram Rate Limit
- **风险**: 短时间发送过多消息可能被限流
- **缓解**: 消息间添加 500ms 延迟，限制每次发送的消息数量

### Risk 2: 消息格式兼容性
- **风险**: Markdown 语法在 Telegram 和标准 Markdown 有差异
- **缓解**: 使用 `parse_mode: 'HTML'` 提供更好的格式控制

### Risk 3: Channel ID 配置
- **风险**: 用户可能不知道如何获取 Channel ID
- **缓解**: 文档说明支持 `@channel_username` 格式

## API Design

### TelegramPublisherConfig

```typescript
interface TelegramPublisherConfig extends PublisherConfig {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}
```

### Telegram API Usage

```typescript
// POST https://api.telegram.org/bot{token}/sendMessage
{
  chat_id: "@channel_username",
  text: "消息内容",
  parse_mode: "HTML",
  disable_web_page_preview: false
}
```

### Message Format

```
📰 HackerNews 日报 | 2024-12-13

━━━━━━━━━━━━━━━━━━━━

1️⃣ <b>Story Title Here</b>
🔗 <a href="url">原文链接</a>
📝 AI 生成的中文摘要内容...
💬 评论摘要: 用户讨论的主要观点...

━━━━━━━━━━━━━━━━━━━━

2️⃣ <b>Another Story</b>
...
```

## Open Questions

1. ~~是否需要支持发送失败重试？~~ - 暂不实现，失败记录日志即可
2. ~~是否需要支持自定义消息模板？~~ - 暂不实现，使用固定格式

## Post-Implementation Decisions

### Decision 5: 统一使用 Worker 模式进行本地测试

**选择**: 移除 CLI 模式 (`npm run fetch`)，统一使用 `npm run dev:worker` 进行本地测试

**原因**:
- 减少维护两套代码的负担（CLI 和 Worker）
- Worker 模式更接近生产环境
- 使用 `.dev.vars` 配置本地环境变量，与 Cloudflare Workers 开发模式一致
- 避免 CLI 和 Worker 代码分歧

**删除的代码**:
- `src/index.ts` - CLI 入口点
- `src/services/cache.ts` - CLI 专用本地缓存
- `src/types/cache.ts` - 缓存类型定义
- `src/utils/logger.ts` - CLI 文件日志
- `tsconfig.node.json` - CLI TypeScript 配置

**本地测试方式**:
```bash
# 启动本地 Worker
npm run dev:worker

# 触发导出
curl -X POST http://localhost:8787/trigger-export-sync
```

### Decision 6: 集中错误格式化逻辑

**选择**: 在 `src/worker/logger.ts` 中添加 `formatError()` 和 `getErrorMessage()` 函数

**原因**:
- 修复错误日志显示 `[object Object]` 的问题
- 统一处理各种错误类型（Error 对象、普通对象、原始值）
- 避免在多个文件中重复错误处理逻辑

**实现**:
```typescript
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const message = obj.message || obj.error || obj.msg;
    if (typeof message === 'string') {
      return message;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return '[Unserializable object]';
    }
  }
  return String(error);
}
```
