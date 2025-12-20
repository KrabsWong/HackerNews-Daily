# Mock Data Integrity Fixes

## 问题描述

在 `src/__tests__/helpers/` 目录下的 Mock 数据存在与实际类型定义不匹配的情况，这会导致测试失去意义，产生误导性结果。

## 发现的问题

### 1. AlgoliaStory Mock - 字段名错误
**文件**: `src/__tests__/helpers/mockHNApi.ts`

**问题**: 使用了 `score` 字段，但 AlgoliaStory 接口使用的是 `points`
```typescript
// ❌ 错误
createMockAlgoliaStory({
  score: 200 - index * 10,  // AlgoliaStory 没有 score 字段
})

// ✅ 修复
createMockAlgoliaStory({
  points: 200 - index * 10,  // 使用正确的 points 字段
})
```

### 2. ProcessedStory Mock - 字段结构完全不匹配
**文件**: `src/__tests__/helpers/fixtures.ts`

**问题**: Mock 数据使用了旧版本的字段结构，缺少必填字段，包含了不存在的字段

```typescript
// ❌ 错误的 Mock 数据
{
  storyId: 12345,
  title: 'Example HackerNews Story',           // ❌ 字段不存在
  titleChinese: '示例 HackerNews 故事',
  url: 'https://example.com/article',
  score: 150,
  time: Math.floor(Date.now() / 1000) - 3600,  // ❌ 类型错误 (应该是 string)
  by: 'testuser',                                // ❌ 字段不存在
  description: '...',
  descriptionChinese: '...',                     // ❌ 字段不存在
  commentSummary: '...',
  commentSummaryChinese: '...',                  // ❌ 字段不存在
  // ❌ 缺少必填字段: rank, titleEnglish, timestamp
}

// ✅ 正确的 Mock 数据
{
  rank: 1,                                       // ✅ 必填字段
  storyId: 12345,
  titleChinese: '示例 HackerNews 故事',
  titleEnglish: 'Example HackerNews Story',     // ✅ 正确的字段名
  score: 150,
  url: 'https://example.com/article',
  time: '2025-12-20 10:00:00 UTC',              // ✅ 正确的类型 (string)
  timestamp: Math.floor(Date.now() / 1000) - 3600, // ✅ 必填字段
  description: '...',
  commentSummary: '...',                         // ✅ 可以是 string | null
}
```

**实际 ProcessedStory 接口定义**:
```typescript
export interface ProcessedStory {
  rank: number;              // Display rank (1-based)
  storyId: number;           // HackerNews story ID
  titleChinese: string;      // Chinese translated title
  titleEnglish: string;      // Original English title
  score: number;             // HackerNews score (points)
  url: string;               // Article URL
  time: string;              // Formatted timestamp string
  timestamp: number;         // Unix timestamp for filtering
  description: string;       // AI-generated summary
  commentSummary: string | null; // AI summary of comments
}
```

### 3. 类型导入错误
**文件**: `src/types/index.ts`

**问题**: 尝试导入不存在的 `cache.ts` 模块

```typescript
// ❌ 错误
export type {
  CacheConfig,
  CachedStory,
  CacheData,
  CacheResult,
} from './cache';  // cache.ts 文件不存在

// ✅ 修复：删除该导入
```

### 4. 测试代码类型注解错误
**文件**: `src/__tests__/utils/result.test.ts`

**问题**: 使用了错误的类型注解语法

```typescript
// ❌ 错误
const result: typeof Ok<number> | typeof Err<Error> = Ok(5);

// ✅ 修复
const result = Ok(5);  // 让 TypeScript 推断类型
```

## 修复措施

### 1. 修复所有 Mock 数据
- ✅ 更新 `createMockAlgoliaStory` 使用 `points` 而不是 `score`
- ✅ 完全重构 `createMockProcessedStory` 以匹配最新接口
- ✅ 修复 `mockAlgoliaStoriesResponse` 中的字段引用

### 2. 添加类型安全注释
在所有 Mock 工厂函数上添加 CRITICAL 标记：

```typescript
/**
 * Create a mock HNStory with customizable fields
 * CRITICAL: Must match HNStory interface exactly
 */
export function createMockHNStory(overrides: Partial<HNStory> = {}): HNStory {
  // ...
}
```

### 3. 修复类型导入
- ✅ 删除不存在的 `cache` 模块导入
- ✅ 修复 `result.test.ts` 中的类型注解

### 4. 验证修复
- ✅ 运行 `npx tsc --noEmit` 确保无类型错误
- ✅ 运行 `npm test` 确保所有测试通过 (111/111 ✅)

## 项目宪法更新

已将 **Mock Data Integrity (CRITICAL)** 规范写入 `openspec/project.md`：

### 核心要求：
1. **Type Accuracy**: Mock 数据**必须**严格匹配实际的 TypeScript 类型定义
2. **Prohibition**: **绝对禁止** Mock 数据与类型定义不一致
3. **Verification**: 所有 Mock 工厂函数必须使用正确的类型注解
4. **Enforcement**: 
   - 所有 Mock 工厂必须明确返回类型
   - 必须运行 `npx tsc --noEmit` 验证
   - Mock 数据必须标注 "CRITICAL: Must match [TypeName] interface exactly"
5. **Maintenance**: 类型定义更新时，**必须**同步更新 Mock 数据

### 违规示例（不可接受）：
- ❌ 使用 `score` 而实际类型定义是 `points`
- ❌ Mock 数据缺少必填字段
- ❌ Mock 数据包含类型定义中不存在的字段
- ❌ 字段类型不匹配

## 验证结果

### TypeScript 编译检查
```bash
$ npx tsc --noEmit
# No errors ✅
```

### 测试执行
```bash
$ npm test
Test Files  5 passed (5)
Tests       111 passed (111)
Duration    1.88s
✅ All tests passing
```

### 覆盖率
```
Utils Module:  98.48%
Overall:       10.57%
✅ No regression in coverage
```

## 未来防护措施

1. **Code Review Checklist**: 
   - 新增 Mock 数据时，必须验证类型匹配
   - 修改类型定义时，必须检查并更新相关 Mock

2. **CI/CD Integration** (未来):
   - 在 CI 中运行 `npx tsc --noEmit` 强制类型检查
   - 自动化测试覆盖率报告

3. **Documentation**:
   - Mock 工厂函数必须包含 CRITICAL 注释
   - 定期审查 `src/__tests__/helpers/` 中的 Mock 数据

## 总结

通过这次修复：
- ✅ 修复了 **4 处** Mock 数据类型不匹配问题
- ✅ 建立了 **Mock Data Integrity** 规范并写入项目宪法
- ✅ 添加了 **类型安全注释** 提醒维护人员
- ✅ 所有测试继续通过，无功能回归
- ✅ TypeScript 编译零错误

**关键原则**: Mock 数据必须是真实数据的忠实镜像，否则测试就失去了意义。
