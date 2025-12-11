# Implementation Tasks - Optimize Worker Subrequests

## 总览

本实现采用**两阶段优化策略**：Algolia 评论获取 + LLM 批量处理，将 API 调用从 ~491 降至 ~68。

---

## Phase 1: Algolia 评论获取优化 ✅

### Task 1.1: 实现 Algolia 评论获取 ✅
- 新增 `AlgoliaComment` 接口
- 实现 `fetchCommentsFromAlgolia(storyId, limit)`
- 实现 `fetchCommentsBatchFromAlgolia(stories, limit)`
- **文件**: `src/api/hackerNews.ts`

### Task 1.2: 优化 Algolia 分页 ✅
- 增加 `MAX_HITS_PER_PAGE` 从 100 到 1000
- 减少 story 获取的分页请求
- **文件**: `src/config/constants.ts`

### Task 1.3: 更新 exportHandler ✅
- 替换 Firebase 评论获取为 Algolia
- 更新 API 调用统计
- **文件**: `src/worker/exportHandler.ts`

**Phase 1 结果**: 评论获取从 330 requests 降至 30 requests (-91%)

---

## Phase 2: LLM 批量处理优化 ✅

### Task 2.1: 实现批量标题翻译 ✅
- 新增 `translateTitlesBatch(titles, batchSize)` 方法
- 使用 JSON Array 格式批量翻译
- 包含失败回退到单独翻译
- **文件**: `src/services/translator.ts`

### Task 2.2: 实现批量内容摘要 ✅
- 新增 `summarizeContentBatch(contents, maxLength, batchSize)` 方法
- 过滤 null/空内容
- 支持配置的内容长度限制
- **文件**: `src/services/translator.ts`

### Task 2.3: 实现批量评论摘要 ✅
- 优化 `summarizeCommentsBatch(commentArrays, batchSize)` 方法
- 过滤评论数 < 3 的故事
- 使用 JSON Array 格式
- **文件**: `src/services/translator.ts`

### Task 2.4: 添加 LLM_BATCH_CONFIG 配置 ✅
```typescript
export const LLM_BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 0,        // 0 = 不分批
  MIN_BATCH_SIZE: 5,
  MAX_BATCH_SIZE: 0,            // 0 = 无上限
  MAX_CONTENT_PER_ARTICLE: 0,   // 0 = 不截断
}
```
- **文件**: `src/config/constants.ts`

### Task 2.5: 新增 chunk() 类方法 ✅
- 提取为 TranslationService 类方法
- 支持 `batchSize=0` 不分批处理
- 移除三处重复的内联函数
- **文件**: `src/services/translator.ts`

### Task 2.6: 重构 exportHandler ✅
- 三阶段处理：收集数据 → 批量 AI → 组装结果
- 新增 `parseLLMBatchSize()` 函数
- 使用批量翻译/摘要方法
- **文件**: `src/worker/exportHandler.ts`

**Phase 2 结果**: DeepSeek API 从 120+ requests 降至 3-6 requests (-95%+)

---

## Phase 3: 统一 Crawler 内容获取 ✅

### Task 3.1: 简化 articleFetcher ✅
- 移除 Algolia `story_text` 优先策略
- 所有内容通过 Crawler API 获取
- 移除 `storyTexts` 参数和 `source` 字段
- **文件**: `src/services/articleFetcher.ts`

### Task 3.2: 清理 hackerNews.ts ✅
- 移除 `HNStory.story_text` 字段
- 移除 `AlgoliaStory.story_text` 映射
- **文件**: `src/api/hackerNews.ts`

### Task 3.3: 更新 exportHandler ✅
- 移除 `storyTexts` 传递
- 简化 API 调用统计
- **文件**: `src/worker/exportHandler.ts`

**Phase 3 结果**: 代码更简洁，内容更丰富

---

## Phase 4: 文档更新 ✅

### Task 4.1: 更新 proposal.md ✅
- 反映实际实现的优化策略
- 更新 API 调用统计

### Task 4.2: 更新 tasks.md ✅
- 标记所有完成的任务
- 添加 Phase 3 和 Phase 4

### Task 4.3: 更新 IMPLEMENTATION_SUMMARY.md ✅
- 更新最终状态和统计

### Task 4.4: 更新 specs 目录 ✅
- 更新 batch-translation-service spec
- 更新 worker-subrequest-optimization spec
- 移除 intelligent-content-fetching spec

### Task 4.5: 更新 README.md ✅
- 更新 Crawler API 描述
- 移除智能内容获取说明

### Task 4.6: 更新 QUICK_REFERENCE.md ✅
- 更新 API 调用统计
- 更新执行流程说明

---

## 最终结果

### API 调用对比

| API Type | 优化前 | 优化后 | 减少 |
|----------|--------|--------|------|
| Algolia (stories) | 10 | 1-2 | -80% |
| Firebase (comments) | 330 | 0 | -100% |
| Algolia (comments) | 0 | 30 | +30 |
| Crawler API | 30 | 30 | 0 |
| DeepSeek API | 120+ | 3-6 | -95%+ |
| GitHub API | 1 | 1 | 0 |
| **Total** | **~491** | **~68** | **-86%** |

### 关键优化

| 组件 | 优化方式 | 效果 |
|------|----------|------|
| 标题翻译 | 批量 JSON prompts | 30 → 1 调用 |
| 内容摘要 | 批量 JSON prompts | 30 → 1 调用 |
| 评论摘要 | 批量 JSON prompts | 30 → 1-3 调用 |
| 评论获取 | Algolia 替代 Firebase | 330 → 30 调用 |
| 内容获取 | 统一 Crawler API | 更丰富的内容 |

### 配置选项

```bash
# 环境变量
LLM_BATCH_SIZE=0  # 0 = 不分批（推荐），>0 = 指定批量大小

# 配置常量 (src/config/constants.ts)
LLM_BATCH_CONFIG.DEFAULT_BATCH_SIZE = 0
LLM_BATCH_CONFIG.MAX_CONTENT_PER_ARTICLE = 0
```
