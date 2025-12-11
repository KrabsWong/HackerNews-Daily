# Proposal: Optimize Worker Subrequests

## Why

Cloudflare Workers 免费版限制每次请求最多 50 个 subrequests。当前系统在处理 30 个 stories 时会产生约 480-520 个 subrequests，远超此限制。必须通过批量化策略大幅减少 API 调用次数。

### Original Subrequest Breakdown (30 stories)

| API | 调用次数 | 说明 |
|-----|----------|------|
| Algolia (stories) | ~10 | 分页获取 stories |
| Firebase (comments) | 330 | 30 stories + 300 comments |
| Crawler API | 30 | 每个 story 获取全文 |
| DeepSeek API | 120+ | 标题翻译 + 内容摘要 + 评论摘要 + 描述翻译 |
| GitHub API | 1 | 推送结果 |
| **Total** | **~491** | |

## What Changes

采用**两阶段优化策略**：

### Strategy 1: Algolia 替代 Firebase 获取评论
- **优化前**: Firebase 逐个获取 → 330 requests (30 stories + 300 comments)
- **优化后**: Algolia 批量查询 → 30 requests (每个 story 1 次)
- **节省**: 300 requests

### Strategy 2: LLM 批量翻译/摘要
- **优化前**: 每个 story 单独调用 → 120+ requests
- **优化后**: 批量处理 → 3-6 requests
- **节省**: 114+ requests

**批量方法**:
- `translateTitlesBatch()`: 30 标题 → 1 API 调用
- `summarizeContentBatch()`: 30 内容 → 1 API 调用
- `summarizeCommentsBatch()`: 30 评论 → 1-3 API 调用

### 当前 API 调用统计 (30 stories)

| API Type | 调用次数 | 说明 |
|----------|----------|------|
| Algolia (stories) | 1-2 | 分页获取 |
| Algolia (comments) | 30 | 每个 story 1 次 |
| Crawler API | 30 | 每个 URL 1 次 |
| DeepSeek (titles) | 1 | 批量翻译 |
| DeepSeek (content) | 1 | 批量摘要 |
| DeepSeek (comments) | 1-3 | 批量摘要 |
| DeepSeek (filter) | 0-1 | 内容过滤（可选）|
| GitHub API | 1 | 推送结果 |
| **Total** | **~68** | -86% 减少 |

## Key Configuration

### LLM 批量配置 (`src/config/constants.ts`)

```typescript
export const LLM_BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 0,        // 0 = 不分批，一次处理所有
  MIN_BATCH_SIZE: 5,            // 仅在 batchSize > 0 时生效
  MAX_BATCH_SIZE: 0,            // 0 = 无上限
  MAX_CONTENT_PER_ARTICLE: 0,   // 0 = 不截断文章内容
} as const;
```

### 环境变量

```bash
LLM_BATCH_SIZE=0  # 0 = 不分批（默认），>0 = 指定批量大小
```

## Code Changes Summary

### 修改的文件

1. **`src/api/hackerNews.ts`**
   - 新增 `fetchCommentsFromAlgolia()` - Algolia 评论获取
   - 新增 `fetchCommentsBatchFromAlgolia()` - 批量评论获取
   - 增加 `MAX_HITS_PER_PAGE` 到 1000

2. **`src/services/translator.ts`**
   - 新增 `translateTitlesBatch()` - 批量标题翻译
   - 新增 `summarizeContentBatch()` - 批量内容摘要
   - 优化 `summarizeCommentsBatch()` - 批量评论摘要
   - 新增 `chunk()` 类方法支持 batchSize=0

3. **`src/services/articleFetcher.ts`**
   - 简化为仅使用 Crawler API
   - 移除智能内容获取策略
   - 串行处理避免服务过载

4. **`src/worker/exportHandler.ts`**
   - 三阶段处理：收集数据 → 批量 AI → 组装结果
   - 新增 `parseLLMBatchSize()` 函数
   - 使用批量翻译/摘要方法

5. **`src/config/constants.ts`**
   - 新增 `LLM_BATCH_CONFIG` 配置

## Success Criteria

- ✅ Subrequests 从 ~491 降至 ~68 (-86%)
- ✅ DeepSeek API 调用从 120+ 降至 3-6 (-95%+)
- ✅ Firebase API 调用从 330 降至 0 (-100%)
- ✅ TypeScript 编译通过
- ✅ 代码简洁，配置灵活

## Related Specs

- `batch-translation-service` - LLM 批量翻译规格
- `batch-comment-fetching` - Algolia 评论获取规格
- `worker-subrequest-optimization` - 整体优化规格

## Change History

- 2025-12-11: Initial proposal
- 2025-12-11: 实现 Algolia 评论获取和 LLM 批量处理
- 2025-12-12: 放宽批量限制，支持 batchSize=0
- 2025-12-12: 统一使用 Crawler API 获取所有文章内容
