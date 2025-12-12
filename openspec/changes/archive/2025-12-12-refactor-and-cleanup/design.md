# Design: Code Refactoring and Cleanup

## Overview

This document details the architectural decisions for refactoring the codebase to improve maintainability, remove unused code, and align CLI and Worker implementations.

---

## 1. Shared Utilities Architecture

### Date Utilities (`src/shared/dateUtils.ts`)

```typescript
/**
 * Get the date boundaries for the previous calendar day (yesterday) in UTC
 * Returns start (00:00:00) and end (23:59:59) timestamps in Unix seconds
 */
export function getPreviousDayBoundaries(): { 
  start: number; 
  end: number; 
  date: Date 
}

/**
 * Format Unix timestamp to UTC datetime string
 * @param unixTime - Unix timestamp in seconds
 * @param includeSeconds - Whether to include seconds (default: true)
 * @returns Formatted string like "2024-12-11 14:30:00 UTC"
 */
export function formatTimestamp(unixTime: number, includeSeconds?: boolean): string

/**
 * Format Date for display (YYYY-MM-DD)
 * @param date - Date object
 * @returns Formatted string like "2024-12-11"
 */
export function formatDateForDisplay(date: Date): string
```

**Decision**: Use the Worker's timestamp format (`YYYY-MM-DD HH:mm:ss UTC`) as the standard since it's more complete. The `includeSeconds` parameter allows backward compatibility.

### Shared Types (`src/shared/types.ts`)

```typescript
/**
 * Processed story ready for display or export
 * Unified interface used by both CLI and Worker
 */
export interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;        // Formatted timestamp string
  timestamp: number;   // Unix timestamp for filtering/sorting
  description: string;
  commentSummary: string | null;
}
```

---

## 2. Comment Fetching Strategy

### Current State

| Approach | Used By | Requests per 30 stories |
|----------|---------|------------------------|
| Firebase (deprecated) | CLI | 30 (story details) + 300 (comments) = **330 requests** |
| Algolia (optimized) | Worker | **30 requests** (1 per story) |

### Decision

Align CLI with Worker's Algolia-based approach:

```typescript
// Before (CLI)
import { fetchCommentsBatch } from './api/hackerNews';
const commentArrays = await fetchCommentsBatch(storiesToProcess, 10);

// After (CLI)
import { fetchCommentsBatchFromAlgolia } from './api/hackerNews';
const commentArrays = await fetchCommentsBatchFromAlgolia(storiesToProcess, 10);
```

**Benefits**:
- 11x reduction in API requests (330 → 30)
- Faster execution
- Consistent behavior between CLI and Worker
- Reduced risk of hitting rate limits

---

## 3. Code Removal Plan

### Firebase Comment Functions (REMOVE)

These functions form a dependency chain that's no longer needed:

```
fetchCommentsBatch (deprecated, line 534)
    └── fetchComments (line 442)
            └── fetchCommentDetails (line 417)
                    └── fetchStoryDetails (KEEP - may be useful)
```

**Note**: `fetchStoryDetails` is kept because it's also used by `fetchBestStoriesByDateAndScore` for hybrid Firebase+Algolia strategy.

### SERVER_CONFIG (REMOVE)

```typescript
// This config is unused - no Express server exists
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3000,
  SHUTDOWN_TIMEOUT: 5000,
} as const;
```

The web frontend was removed in previous iterations. This config is now dead code.

---

## 4. File Structure (Future Refactoring)

### Phase 4 Optional: hackerNews.ts Split

Current `hackerNews.ts` (558 lines) handles:
1. Type definitions (interfaces)
2. Firebase API calls
3. Algolia API calls
4. Utility functions (stripHTML, mapping)

Proposed split:

```
src/api/
├── index.ts          # Re-exports for backward compatibility
├── types.ts          # HNStory, AlgoliaStory, HNComment, etc.
├── firebase.ts       # fetchBestStoryIds, fetchStoryDetails
├── algolia.ts        # fetchStoriesFromAlgolia, fetchTopStoriesByScore, etc.
└── utils.ts          # stripHTML, mapAlgoliaStoryToHNStory
```

### Phase 4 Optional: translator.ts Split

Current `translator.ts` (700 lines) handles:
1. TranslationService class
2. Single-item operations
3. Batch operations (optimized)

Proposed split:

```
src/services/translator/
├── index.ts          # TranslationService class, exports
├── single.ts         # translateTitle, summarizeContent, etc.
└── batch.ts          # translateTitlesBatch, summarizeContentBatch, etc.
```

**Decision**: Phase 4 is optional. The current structure works, and splitting may introduce unnecessary complexity. Recommend implementing only if files continue to grow.

---

## 5. Backward Compatibility

All changes maintain backward compatibility:

1. **Import paths**: Re-export from original locations
2. **Function signatures**: No changes to public APIs
3. **Behavior**: CLI will be faster but produce same output

### Migration Strategy

```typescript
// Old import (still works)
import { ProcessedStory } from './index';

// New import (preferred)
import { ProcessedStory } from './shared/types';
```

---

## 6. Testing Strategy

### Manual Testing Checklist

1. **CLI Default Mode**
   ```bash
   npm run fetch -- --no-cache
   ```
   Verify: Stories displayed with Chinese titles, descriptions, and comment summaries

2. **CLI Export Mode**
   ```bash
   npm run fetch -- --export-daily --no-cache
   ```
   Verify: Markdown file generated in `hacknews-export/`

3. **Worker Build**
   ```bash
   npm run build:worker
   ```
   Verify: Bundle size < 1MB, no TypeScript errors

4. **Worker Local Test**
   ```bash
   npm run dev:worker
   # Then trigger via HTTP request
   ```

### Automated Testing (Future)

Consider adding:
- Unit tests for date utilities
- Integration tests for API functions
- Type checking in CI

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking CLI | Test thoroughly before merging |
| Worker regression | Deploy to staging first |
| Missing imports | TypeScript compiler will catch |
| Performance degradation | Comment fetching will be 11x faster |

---

## 8. Error Handling Refactoring (Try-Catch Optimization)

### 8.1 Current Problems

代码库中充斥着 try-catch，存在以下问题：

1. **静默失败**: 捕获错误后返回空值，隐藏了潜在问题
2. **嵌套 try-catch**: 难以阅读和维护
3. **递归重试**: 使用递归实现重试，存在栈溢出风险
4. **空 catch 块**: 吞掉错误不做任何处理

### 8.2 Result Pattern Design

引入类型安全的 Result 模式：

```typescript
// src/shared/result.ts

/**
 * Result 类型 - 函数式错误处理
 * 替代 try-catch 的类型安全方案
 */
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * 创建成功结果
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * 创建失败结果
 */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * 从 Promise 创建 Result
 */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (e) {
    return Err(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * 批量执行并收集结果（不会因单个失败而中断）
 */
export async function collectResults<T>(
  promises: Promise<Result<T>>[]
): Promise<{ successes: T[]; failures: Error[] }> {
  const results = await Promise.all(promises);
  const successes: T[] = [];
  const failures: Error[] = [];
  
  for (const result of results) {
    if (result.ok) {
      successes.push(result.value);
    } else {
      failures.push(result.error);
    }
  }
  
  return { successes, failures };
}
```

### 8.3 Refactoring Examples

#### Example 1: Firebase Story Fetch

**Before (try-catch with silent failure):**
```typescript
export async function fetchStoryDetails(id: number): Promise<HNStory | null> {
  try {
    const response = await get<HNStory>(`${HN_API.BASE_URL}/item/${id}.json`);
    if (!response.data || !response.data.title) {
      return null;
    }
    return response.data;
  } catch (error) {
    console.warn(`Failed to fetch story ${id}`);
    return null;  // Silent failure
  }
}
```

**After (Result pattern + optional chaining):**
```typescript
export async function fetchStoryDetails(id: number): Promise<Result<HNStory>> {
  const result = await fromPromise(
    get<HNStory>(`${HN_API.BASE_URL}/item/${id}.json`)
  );
  
  if (!result.ok) {
    return Err(new Error(`Failed to fetch story ${id}: ${result.error.message}`));
  }
  
  if (!result.value.data?.title) {
    return Err(new Error(`Story ${id} has no title`));
  }
  
  return Ok(result.value.data);
}
```

#### Example 2: Batch Operations with Error Accumulation

**Before (silent skip on failure):**
```typescript
async fetchStoriesFromAlgoliaByIds(ids: number[]): Promise<HNStory[]> {
  const stories: HNStory[] = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    try {
      const batch = await this.fetchBatch(ids.slice(i, i + batchSize));
      stories.push(...batch);
    } catch (err) {
      console.warn(`Batch ${i / batchSize} failed, skipping...`);
      // Silent continue - errors are hidden
    }
  }
  return stories;
}
```

**After (Result pattern with error tracking):**
```typescript
async fetchStoriesFromAlgoliaByIds(ids: number[]): Promise<{ 
  stories: HNStory[]; 
  errors: Error[] 
}> {
  const batchPromises = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    batchPromises.push(
      this.fetchBatchSafe(ids.slice(i, i + batchSize))
    );
  }
  
  const { successes, failures } = await collectResults(batchPromises);
  
  if (failures.length > 0) {
    console.warn(`${failures.length} batches failed:`, failures.map(e => e.message));
  }
  
  return { stories: successes.flat(), errors: failures };
}

private async fetchBatchSafe(ids: number[]): Promise<Result<HNStory[]>> {
  return fromPromise(this.fetchBatch(ids));
}
```

#### Example 3: Recursive Retry → Loop-based Retry

**Before (recursive retry - stack overflow risk):**
```typescript
async translateTitle(title: string, retry = true): Promise<string> {
  try {
    const response = await this.provider.chatCompletion({ ... });
    return response.content || title;
  } catch (error) {
    if (retry && error instanceof FetchError && error.status === 429) {
      await delay(this.provider.getRetryDelay());
      return this.translateTitle(title, false);  // Recursive call
    }
    return title;
  }
}
```

**After (loop-based retry with config):**
```typescript
async translateTitle(title: string): Promise<string> {
  const maxRetries = 2;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await fromPromise(
      this.provider.chatCompletion({ ... })
    );
    
    if (result.ok) {
      return result.value.content || title;
    }
    
    // Check if retryable
    const isRateLimited = result.error instanceof FetchError && 
                          result.error.status === 429;
    
    if (isRateLimited && attempt < maxRetries) {
      console.warn(`Rate limit hit, retrying (${attempt}/${maxRetries})...`);
      await delay(this.provider.getRetryDelay());
      continue;
    }
    
    console.warn(`Translation failed: ${result.error.message}`);
    return title;  // Fallback to original
  }
  
  return title;
}
```

#### Example 4: Optional Chaining Simplification

**Before:**
```typescript
if (!story || !story.title) {
  return null;
}
const url = story.url ? story.url : '';
```

**After:**
```typescript
if (!story?.title) {
  return null;
}
const url = story.url ?? '';
```

### 8.4 Migration Strategy

**Phase 1: Infrastructure**
- 创建 `src/shared/result.ts` 模块
- 添加 Result 类型和辅助函数

**Phase 2: High-Impact Refactoring**
- 重构 `algolia.ts` 批量操作
- 重构 `translator.ts` 重试逻辑

**Phase 3: Cleanup**
- 替换空 catch 块
- 应用 optional chaining

**Phase 4: Validation**
- 确保构建通过
- 测试 CLI 和 Worker 功能

### 8.5 Backward Compatibility

- 对外 API 签名保持不变
- 内部使用 Result 模式，对外仍返回原类型
- 逐步迁移，不需要一次性完成

---

## 9. Directory Structure Optimization (Phase 6)

### 9.1 Move shared/types.ts to types/ Directory

当前 `src/shared/types.ts` 包含 `ProcessedStory` 接口，与现有的 `src/types/` 目录职责重叠。

**迁移方案**:

```typescript
// Before: src/shared/types.ts
export interface ProcessedStory { ... }

// After: src/types/shared.ts
export interface ProcessedStory { ... }
```

**导入更新**:
```typescript
// Before
import { ProcessedStory } from '../shared/types';

// After
import { ProcessedStory } from '../types/shared';
```

### 9.2 Split translator.ts into Module

当前 `translator.ts` 有 731 行，包含多种职责，应拆分为模块目录。

**模块结构设计**:

```
src/services/translator/
├── index.ts           # 主入口，导出 TranslationService
├── utils.ts           # 工具函数
├── titleTranslator.ts # 标题翻译
├── summarizer.ts      # 内容/评论摘要
└── batch.ts           # 批量操作
```

**utils.ts (~50 行)**:
```typescript
import { Result, Ok, Err } from '../../shared/result';

/** Maximum number of retry attempts */
export const MAX_RETRIES = 2;

/** Delay helper */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Parse JSON array from LLM response
 */
export function parseJsonArray<T>(content: string, expectedLength?: number): Result<T[]> {
  const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim();
  // ... parsing logic
}

/**
 * Split array into chunks
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  // ... chunking logic
}
```

**titleTranslator.ts (~100 行)**:
```typescript
import { LLMProvider, FetchError } from '../llmProvider';
import { Result, fromPromise } from '../../shared/result';
import { MAX_RETRIES, delay } from './utils';

export async function translateTitle(
  provider: LLMProvider,
  title: string
): Promise<string> {
  // 标题翻译逻辑，使用循环重试
}

export async function translateDescription(
  provider: LLMProvider,
  description: string | null
): Promise<string> {
  // 描述翻译逻辑
}
```

**summarizer.ts (~200 行)**:
```typescript
import { LLMProvider } from '../llmProvider';
import { HNComment } from '../../api/types';
import { stripHTML } from '../../api/utils';

export async function summarizeContent(
  provider: LLMProvider,
  content: string,
  maxLength: number
): Promise<string | null> {
  // 内容摘要逻辑
}

export async function summarizeComments(
  provider: LLMProvider,
  comments: HNComment[]
): Promise<string | null> {
  // 评论摘要逻辑
}
```

**batch.ts (~250 行)**:
```typescript
import { LLMProvider } from '../llmProvider';
import { HNComment } from '../../api/types';
import { Result, fromPromise } from '../../shared/result';
import { chunk, parseJsonArray } from './utils';
import { translateTitle, translateDescription } from './titleTranslator';
import { summarizeContent, summarizeComments } from './summarizer';

export async function translateTitlesBatch(
  provider: LLMProvider,
  titles: string[],
  batchSize: number
): Promise<string[]> {
  // 批量标题翻译
}

export async function summarizeContentBatch(
  provider: LLMProvider,
  contents: (string | null)[],
  maxLength: number,
  batchSize: number
): Promise<(string | null)[]> {
  // 批量内容摘要
}

export async function summarizeCommentsBatch(
  provider: LLMProvider,
  commentArrays: HNComment[][],
  batchSize: number
): Promise<(string | null)[]> {
  // 批量评论摘要
}
```

**index.ts (~100 行)**:
```typescript
import { LLMProvider, createLLMProvider, CreateProviderOptions } from '../llmProvider';
import { HNComment } from '../../api/types';
import * as titleTranslator from './titleTranslator';
import * as summarizer from './summarizer';
import * as batch from './batch';
import { chunk } from './utils';

class TranslationService {
  private provider: LLMProvider | null = null;
  private initialized = false;

  init(apiKeyOrOptions?: string | CreateProviderOptions): void {
    // 初始化逻辑
  }

  getProvider(): LLMProvider | null {
    return this.provider;
  }

  // 委托给各模块
  async translateTitle(title: string): Promise<string> {
    if (!this.provider) throw new Error('Not initialized');
    return titleTranslator.translateTitle(this.provider, title);
  }

  async translateTitlesBatch(titles: string[], batchSize = 10): Promise<string[]> {
    if (!this.provider) throw new Error('Not initialized');
    return batch.translateTitlesBatch(this.provider, titles, batchSize);
  }

  // ... 其他方法类似委托
}

export const translator = new TranslationService();
export { CreateProviderOptions } from '../llmProvider';
```

### 9.3 Backward Compatibility

- 导出的 `translator` 单例保持不变
- 所有公共方法签名保持不变
- 现有调用代码无需修改

---

## 10. Not In Scope

These items were considered but excluded:

1. **Full test suite implementation** - Would require significant effort
2. **API abstraction layer** - Unnecessary complexity
3. **Configuration refactoring** - `constants.ts` is already well-organized
