# Post-Archive Fixes

## Overview
本文档记录了在归档 `add-comprehensive-test-coverage` 提案后发现并修复的问题。这些修复是为了解决测试运行时的错误和确保 Mock 数据的完整性。

## Timestamp
- **Archive Date**: 2025-12-20 19:32
- **Fixes Applied**: 2025-12-20 19:45 - 20:30

## Issues Fixed

### 1. Unhandled Promise Rejection in fetch.test.ts

**Issue**: 
执行 `npm run test:coverage` 时出现未处理的 Promise 拒绝错误：
```
Vitest caught 1 unhandled error during the test run.
⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
TypeError: Network request failed
 ❯ src/__tests__/utils/fetch.test.ts:305:48
```

**Root Cause**: 
在测试 "should throw network error if all retries fail" 中，使用了 fake timers。当调用 `vi.runAllTimersAsync()` 时，promise 在 timer 推进过程中被拒绝，但此时还没有 `.catch()` 处理器捕获它，导致 unhandled rejection 警告。

**Fix**:
修改了 `src/__tests__/utils/fetch.test.ts:305-320`：

```typescript
// Before:
const promise = fetchJSON('https://api.example.com/data', { retries: 1, retryDelay: 10 });
await vi.runAllTimersAsync();
await expect(promise).rejects.toThrow('Network request failed');

// After:
const promise = fetchJSON('https://api.example.com/data', { retries: 1, retryDelay: 10 });
const timerPromise = vi.runAllTimersAsync();

// Wait for both the timer advancement and the promise rejection
await Promise.all([
  timerPromise,
  promise.catch(() => {}) // Catch to prevent unhandled rejection
]);

// Now verify the promise rejects with the expected error
await expect(promise).rejects.toThrow('Network request failed');
```

**Verification**:
```bash
npm run test:coverage
# ✅ No unhandled errors, 111/111 tests passing
```

---

### 2. Mock Data Integrity Issues (CRITICAL)

**Issue**: 
在 `src/__tests__/helpers/` 目录下发现多个 Mock 数据与实际类型定义不匹配的问题：

#### 2.1 AlgoliaStory - 错误的字段名

**Location**: `src/__tests__/helpers/mockHNApi.ts:31`

**Problem**: 
使用了 `score` 字段，但 `AlgoliaStory` 接口实际使用 `points`

**Fix**:
```typescript
// Before:
const hits = storyIds.map((id, index) => createMockAlgoliaStory({
  story_id: id,
  objectID: String(id),
  title: `Story ${id}`,
  score: 200 - index * 10, // ❌ Wrong field name
}));

// After:
const hits = storyIds.map((id, index) => createMockAlgoliaStory({
  story_id: id,
  objectID: String(id),
  title: `Story ${id}`,
  points: 200 - index * 10, // ✅ Correct field name
}));
```

**TypeScript Error Before Fix**:
```
src/__tests__/helpers/mockHNApi.ts(31,5): error TS2353: Object literal may only specify known properties, and 'score' does not exist in type 'Partial<AlgoliaStory>'.
```

#### 2.2 ProcessedStory - 完全不匹配的结构

**Location**: `src/__tests__/helpers/fixtures.ts:81-96`

**Problems**:
1. **Missing Required Fields**: `rank`, `titleEnglish`, `timestamp`
2. **Non-existent Fields**: `title`, `by`, `descriptionChinese`, `commentSummaryChinese`
3. **Wrong Type**: `time` 应该是 `string` 而不是 `number`

**Fix**:
```typescript
// Before:
export function createMockProcessedStory(overrides: Partial<ProcessedStory> = {}): ProcessedStory {
  return {
    storyId: 12345,
    title: 'Example HackerNews Story',           // ❌ Field doesn't exist
    titleChinese: '示例 HackerNews 故事',
    url: 'https://example.com/article',
    score: 150,
    time: Math.floor(Date.now() / 1000) - 3600,  // ❌ Wrong type (number vs string)
    by: 'testuser',                               // ❌ Field doesn't exist
    description: '...',
    descriptionChinese: '...',                    // ❌ Field doesn't exist
    commentSummary: '...',
    commentSummaryChinese: '...',                 // ❌ Field doesn't exist
    // ❌ Missing: rank, titleEnglish, timestamp
    ...overrides,
  };
}

// After:
/**
 * Create a mock ProcessedStory with customizable fields
 * CRITICAL: Must match ProcessedStory interface exactly
 */
export function createMockProcessedStory(overrides: Partial<ProcessedStory> = {}): ProcessedStory {
  return {
    rank: 1,                                       // ✅ Added required field
    storyId: 12345,
    titleChinese: '示例 HackerNews 故事',
    titleEnglish: 'Example HackerNews Story',     // ✅ Correct field name
    score: 150,
    url: 'https://example.com/article',
    time: '2025-12-20 10:00:00 UTC',              // ✅ Correct type (string)
    timestamp: Math.floor(Date.now() / 1000) - 3600, // ✅ Added required field
    description: 'This is a generated summary of the article content. It provides a comprehensive overview of the key points discussed in the article, including technical details and implementation considerations.',
    commentSummary: 'Users discussed the technical implementation, performance considerations, and potential use cases. Some commenters raised concerns about scalability while others praised the elegant solution.', // ✅ Correct (string | null)
    ...overrides,
  };
}
```

#### 2.3 Non-existent Cache Module Import

**Location**: `src/types/index.ts:17-25`

**Problem**: 
尝试导入不存在的 `./cache` 模块

**Fix**:
```typescript
// Removed entire block:
// Cache types
export type {
  CacheConfig,
  CachedStory,
  CacheData,
  CacheResult,
} from './cache';  // ❌ cache.ts doesn't exist
```

**TypeScript Error Before Fix**:
```
src/types/index.ts(23,8): error TS2307: Cannot find module './cache' or its corresponding type declarations.
```

#### 2.4 Type Annotation Error in result.test.ts

**Location**: `src/__tests__/utils/result.test.ts:273`

**Problem**: 
使用了错误的类型注解语法 `typeof Ok<number> | typeof Err<Error>`

**Fix**:
```typescript
// Before:
const result: typeof Ok<number> | typeof Err<Error> = Ok(5);
const mapped2 = mapResult(error, x => x + 3);

// After:
const result = Ok(5);
const mapped2 = mapResult(error, (x: number) => x + 3);
```

**TypeScript Error Before Fix**:
```
src/__tests__/utils/result.test.ts(273,13): error TS2322: Type 'Result<number, never>' is not assignable to type 'typeof Ok<number> | typeof Err<Error>'.
```

---

### 3. Enhanced Mock Data Safety

**Changes Applied**:

1. **Added File-level CRITICAL Comments**:
```typescript
/**
 * Test fixtures providing common test data structures
 * 
 * CRITICAL: All mock factories MUST match their corresponding TypeScript interfaces exactly.
 * Any mismatch in field names, types, or required/optional properties is strictly prohibited.
 */
```

2. **Added Function-level CRITICAL Comments**:
```typescript
/**
 * Create a mock ProcessedStory with customizable fields
 * CRITICAL: Must match ProcessedStory interface exactly
 */
export function createMockProcessedStory(overrides: Partial<ProcessedStory> = {}): ProcessedStory {
  // ...
}
```

3. **All Mock Files Updated**:
- `src/__tests__/helpers/fixtures.ts` - Added CRITICAL comments to all 7 mock factories
- `src/__tests__/helpers/mockHNApi.ts` - Added CRITICAL comments, fixed field names
- `src/__tests__/helpers/mockLLMProvider.ts` - Added CRITICAL comments

---

### 4. Project Constitution Update

**Location**: `openspec/project.md`

**Added**: New "Mock Data Integrity (CRITICAL)" section after "Test Organization (CRITICAL)"

**Content**:
```markdown
### Mock Data Integrity (CRITICAL)
- **Type Accuracy**: Mock 数据**必须**严格匹配实际的 TypeScript 类型定义
- **Prohibition**: **绝对禁止** Mock 数据与类型定义不一致（字段名、字段类型、必填/可选属性）
- **Verification**: 所有 Mock 工厂函数必须使用正确的类型注解，让 TypeScript 编译器验证正确性
- **Examples of Violations** (不可接受):
  - ❌ 使用 `score` 而实际类型定义是 `points`
  - ❌ Mock 数据缺少必填字段（如 `rank`, `timestamp`）
  - ❌ Mock 数据包含类型定义中不存在的字段（如 `descriptionChinese`）
  - ❌ 字段类型不匹配（如 `num_comments: number` 而定义是 `number | null`）
- **Enforcement**: 
  - 所有 Mock 工厂必须在函数签名中明确返回类型（如 `(): HNStory`）
  - 必须运行 `npx tsc --noEmit` 验证类型正确性
  - Mock 数据必须在顶部注释中标注 "CRITICAL: Must match [TypeName] interface exactly"
- **Maintenance**: 当类型定义更新时，**必须**同步更新对应的 Mock 数据
- **Rationale**: Mock 数据不匹配会导致测试失去意义，产生误导性的测试结果
```

---

## Verification Results

### TypeScript Compilation
```bash
$ npx tsc --noEmit
# ✅ No errors
```

### Test Suite
```bash
$ npm test

 ✓ src/__tests__/utils/array.test.ts (25 tests) 253ms
 ✓ src/__tests__/utils/date.test.ts (21 tests) 150ms
 ✓ src/__tests__/utils/fetch.test.ts (27 tests) 245ms
 ✓ src/__tests__/utils/html.test.ts (12 tests) 98ms
 ✓ src/__tests__/utils/result.test.ts (26 tests) 187ms

Test Files  5 passed (5)
Tests       111 passed (111)
Duration    1.88s (transform 45ms, setup 0ms, collect 523ms, tests 933ms, environment 0ms, prepare 287ms)
```

### Coverage Report
```bash
$ npm run test:coverage

File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------|---------|----------|---------|---------|-------------------
All files              |   10.57 |     9.26 |   11.38 |   10.57 |
 src/utils             |   98.48 |    94.73 |   97.22 |   98.48 |
  array.ts             |   97.33 |    91.66 |     100 |   97.33 | 121
  date.ts              |     100 |      100 |     100 |     100 |
  fetch.ts             |     100 |      100 |     100 |     100 |
  html.ts              |   78.57 |       75 |      75 |   78.57 | 40-42,50-54,69
  result.ts            |     100 |      100 |     100 |     100 |

✅ No unhandled errors
✅ All tests passing
✅ Utils module: 98.48% coverage
```

---

## Files Changed (Post-Archive)

### Modified Files:
1. `src/__tests__/utils/fetch.test.ts` - Fixed unhandled promise rejection
2. `src/__tests__/helpers/fixtures.ts` - Fixed ProcessedStory mock, added CRITICAL comments
3. `src/__tests__/helpers/mockHNApi.ts` - Fixed AlgoliaStory field name, added CRITICAL comments
4. `src/__tests__/helpers/mockLLMProvider.ts` - Added CRITICAL comments
5. `src/__tests__/utils/result.test.ts` - Fixed type annotation
6. `src/types/index.ts` - Removed non-existent cache module import
7. `openspec/project.md` - Added "Mock Data Integrity (CRITICAL)" section

### Created Files:
1. `MOCK_DATA_FIXES.md` - Comprehensive documentation of all mock data issues
2. `openspec/changes/archive/2025-12-20-add-comprehensive-test-coverage/POST_ARCHIVE_FIXES.md` - This file

---

## Impact on Original Proposal

### Completion Status Update

**Original Completion**: 15 of 27 tasks completed (55.6%)

**Post-Archive Additions**:
- Fixed 1 test reliability issue (unhandled promise rejection)
- Fixed 4 type safety issues in mock data
- Enhanced 3 mock helper files with CRITICAL comments
- Added 1 critical project convention (Mock Data Integrity)
- Created 2 documentation files

**Test Quality Improvement**:
- All 111 tests now run without warnings or errors
- Mock data now 100% type-safe and verified by TypeScript compiler
- Future mock data issues prevented by project constitution rule

### Lessons Learned

1. **Mock Data Validation**: Mock data type mismatches are **silent failures** that can invalidate test results. Always verify with `npx tsc --noEmit`.

2. **Async Testing with Fake Timers**: When using fake timers with promises that reject, wrap both timer advancement and promise in `Promise.all()` with `.catch()` handler to prevent unhandled rejections.

3. **Type Annotations on Mock Factories**: Explicit return type annotations on mock factory functions are **essential** for catching type mismatches at compile time.

4. **Documentation in Project Constitution**: Critical testing rules must be documented in `openspec/project.md` to ensure all future AI agents and developers follow them.

---

## Future Prevention Measures

### For AI Agents:
1. When creating mock factories, **always** add explicit return type annotations
2. **Always** run `npx tsc --noEmit` after creating/modifying mock data
3. **Always** add CRITICAL comments to mock files referencing the interface name
4. When archiving test-related proposals, **verify** all tests run without warnings

### For Developers:
1. Review `openspec/project.md` "Mock Data Integrity (CRITICAL)" section before creating mocks
2. Use `npx tsc --noEmit` as pre-commit check
3. If type definitions change, search for all mock factories using that type and update them

---

## Related Documentation

- Main fixes documentation: `/MOCK_DATA_FIXES.md`
- Project constitution: `/openspec/project.md` (Mock Data Integrity section)
- Original proposal: `/openspec/changes/archive/2025-12-20-add-comprehensive-test-coverage/proposal.md`
- Tasks: `/openspec/changes/archive/2025-12-20-add-comprehensive-test-coverage/tasks.md`
- Completion summary: `/openspec/changes/archive/2025-12-20-add-comprehensive-test-coverage/COMPLETION_SUMMARY.md`
