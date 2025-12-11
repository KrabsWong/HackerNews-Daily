# Implementation Summary: Optimize Worker Subrequests

**Date**: 2025-12-11 (Updated: 2025-12-12)  
**Status**: ✅ Complete  

---

## 🎯 Objective

将 API 调用从 ~491 降低到 ~68 (-86%)，同时通过 Crawler API 获取更丰富的文章内容。

---

## ✅ Implemented Optimizations

### 1. Algolia 评论获取

**变更**: 用 Algolia Search API 替代 Firebase API 获取评论

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 评论获取 | 330 requests | 30 requests |
| 减少 | - | -91% |

**实现**:
- `fetchCommentsFromAlgolia(storyId, limit)` - 单个 story 评论
- `fetchCommentsBatchFromAlgolia(stories, limit)` - 批量评论

### 2. LLM 批量处理

**变更**: 批量翻译/摘要替代逐个处理

| 操作 | 优化前 | 优化后 |
|------|--------|--------|
| 标题翻译 | 30 requests | 1 request |
| 内容摘要 | 30 requests | 1 request |
| 评论摘要 | 30 requests | 1-3 requests |
| **总计** | 90+ requests | 3-5 requests |
| **减少** | - | -95%+ |

**批量方法**:
- `translateTitlesBatch(titles, batchSize)`
- `summarizeContentBatch(contents, maxLength, batchSize)`
- `summarizeCommentsBatch(commentArrays, batchSize)`

### 3. 统一 Crawler 内容获取

**变更**: 所有文章内容通过 Crawler API 获取

- 移除 Algolia `story_text` 优先策略
- 串行处理避免服务过载
- 内容更丰富、更完整

---

## 📊 Final API Call Statistics

### 30 Stories 场景

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
| **Total** | **~68** | |

### 对比

| 指标 | 优化前 | 优化后 | 改进 |
|------|--------|--------|------|
| 总 API 调用 | ~491 | ~68 | -86% |
| DeepSeek 调用 | 120+ | 3-6 | -95%+ |
| Firebase 调用 | 330 | 0 | -100% |

---

## 🔧 Key Configuration

### LLM Batch Config

```typescript
// src/config/constants.ts
export const LLM_BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 0,        // 0 = 不分批，一次处理所有
  MIN_BATCH_SIZE: 5,            // 仅在 batchSize > 0 时生效
  MAX_BATCH_SIZE: 0,            // 0 = 无上限
  MAX_CONTENT_PER_ARTICLE: 0,   // 0 = 不截断文章内容
} as const;
```

### 环境变量

```bash
LLM_BATCH_SIZE=0  # 0 = 不分批（推荐）
```

---

## 📁 Modified Files

| 文件 | 变更 |
|------|------|
| `src/api/hackerNews.ts` | Algolia 评论获取 |
| `src/services/translator.ts` | 批量翻译/摘要方法 |
| `src/services/articleFetcher.ts` | 统一 Crawler 获取 |
| `src/worker/exportHandler.ts` | 三阶段批量处理 |
| `src/config/constants.ts` | LLM_BATCH_CONFIG |

---

## ✅ Verification

```bash
npm run build
# ✅ SUCCESS - No TypeScript errors
```

---

**Last Updated**: December 12, 2025
