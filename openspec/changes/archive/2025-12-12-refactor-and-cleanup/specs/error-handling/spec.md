# Delta Spec: Error Handling Refactoring

## Context

This spec describes changes to error handling patterns across the codebase, replacing excessive try-catch blocks with more elegant and type-safe alternatives.

---

## Changes

### 1. New Module: Result Pattern

**Add**: `src/shared/result.ts`

```typescript
/**
 * Result 类型 - 函数式错误处理
 * 
 * 使用 Result 替代 try-catch 可以：
 * 1. 让错误处理在类型系统中可见
 * 2. 避免静默失败
 * 3. 强制调用者处理错误情况
 */
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

export function Ok<T>(value: T): Result<T, never>;
export function Err<E>(error: E): Result<never, E>;
export function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>>;
export function collectResults<T>(promises: Promise<Result<T>>[]): Promise<{
  successes: T[];
  failures: Error[];
}>;
```

### 2. API Layer Changes

**Modify**: `src/api/algolia.ts`

| Function | Before | After |
|----------|--------|-------|
| `fetchStoriesFromAlgoliaByIds` | Silent skip on batch failure | Return `{ stories, errors }` |
| `fetchCommentsFromAlgolia` | Return `[]` on error | Use Result internally, log warning if errors > threshold |

**Modify**: `src/api/firebase.ts`

| Function | Before | After |
|----------|--------|-------|
| `fetchStoryDetails` | `try-catch` + null return | Optional chaining `response?.data?.title` |

### 3. Translator Service Changes

**Modify**: `src/services/translator.ts`

| Function | Before | After |
|----------|--------|-------|
| `translateTitle` | Recursive retry | Loop-based retry with max attempts |
| `translateTitlesBatch` | Nested try-catch | Result pattern + `collectResults` |
| `summarizeComments` | Recursive retry | Loop-based retry |
| `summarizeCommentsBatch` | Nested try-catch | Result pattern |

### 4. Cache Service Changes

**Modify**: `src/services/cache.ts`

| Location | Before | After |
|----------|--------|-------|
| Line 149 | Empty `catch {}` | `catch (_) { /* cache cleanup failure is non-critical */ }` |
| Nested try-catch | Inline cleanup | Extract to `cleanupCorruptedCache()` function |

### 5. Markdown Exporter Changes

**Modify**: `src/services/markdownExporter.ts`

| Location | Before | After |
|----------|--------|-------|
| Line 121 | Empty `catch {}` for file access | `catch (_) { /* file doesn't exist, will create */ }` |

---

## Patterns to Apply

### Pattern A: Optional Chaining

```typescript
// Before
if (!story || !story.title) { ... }

// After  
if (!story?.title) { ... }
```

### Pattern B: Nullish Coalescing

```typescript
// Before
const url = story.url || '';

// After
const url = story.url ?? '';
```

### Pattern C: Loop-based Retry

```typescript
// Before (recursive)
async function retry(fn, attempts = 3) {
  try { return await fn(); }
  catch { return retry(fn, attempts - 1); }  // Stack risk
}

// After (loop)
async function retry(fn, maxAttempts = 3) {
  for (let i = 1; i <= maxAttempts; i++) {
    const result = await fromPromise(fn());
    if (result.ok) return result.value;
    if (i < maxAttempts) await delay(1000 * i);
  }
  throw new Error('Max retries exceeded');
}
```

### Pattern D: Error Accumulation

```typescript
// Before (silent skip)
for (const item of items) {
  try { results.push(await process(item)); }
  catch { /* skip */ }
}

// After (accumulate)
const processed = await collectResults(items.map(item => 
  fromPromise(process(item))
));
if (processed.failures.length > 0) {
  logWarn(`${processed.failures.length} items failed`);
}
return processed.successes;
```

---

## Backward Compatibility

- Public API signatures remain unchanged
- Internal implementation uses Result pattern
- Existing callers do not need modification
- Error logging behavior is preserved or improved

---

## Testing Checklist

- [x] `npm run build` passes
- [x] `npm run build:worker` passes (688.40 KB)
- [ ] CLI fetch works: `npm run fetch -- --no-cache`
- [ ] CLI export works: `npm run fetch -- --export-daily --no-cache`
- [ ] Worker local test: `npm run dev:worker`

---

## Files Affected

| File | Changes |
|------|---------|
| `src/shared/result.ts` | NEW - Result type and utilities (Ok, Err, fromPromise, collectResults) |
| `src/api/algolia.ts` | Refactored with Result pattern, error accumulation, nullish coalescing |
| `src/api/firebase.ts` | Applied optional chaining, updated return type handling |
| `src/services/translator.ts` | Loop-based retry, Result pattern for all batch methods, parseJsonArray helper |
| `src/services/cache.ts` | Fixed empty catch with `_` variable and documentation |
| `src/services/markdownExporter.ts` | Fixed empty catch with `_` variable and documentation |
| `src/worker/exportHandler.ts` | Applied nullish coalescing `??` |
