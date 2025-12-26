# Design: Fix Translation Data Alignment

## Overview

This change fixes a critical data alignment bug in the daily export pipeline where titles, content descriptions, and comment summaries can become randomly shuffled across stories after batch translation. The root cause is a mismatch between how batch functions preserve array indices (using empty strings) and how the assembly logic handles those empty strings (using `||` operators and `push()`-based loops).

## Architecture

### Current Data Flow

```
Phase 1: Data Collection
  ├─ titles[] (30 items)
  ├─ contents[] (30 items, some null)
  └─ metaDescriptions[] (30 items, some null)

Phase 2: Batch AI Processing
  ├─ translatedTitles[] ← translateTitlesBatch(titles)
  ├─ contentSummaries[] ← summarizeContentBatch(contents)
  │    └─ Returns: ["Summary", "", "Summary", ...] (preserves indices)
  │
  └─ descriptions[] ← Sequential loop (🐛 BUG HERE)
       for i in 0..29:
         if contentSummaries[i]:
           descriptions.push(contentSummaries[i])  ← push() breaks alignment!
         else:
           descriptions.push(await translateDescription(...))

Phase 3: Assembly
  └─ processedStories[i] = {
       titleChinese: translatedTitles[i] ?? fallback,
       description: descriptions[i] || '暂无描述',         ← treats '' as falsy
       commentSummary: commentSummaries[i] || '暂无评论'  ← treats '' as falsy
     }
```

### Root Cause

The bug occurs because:

1. **Batch functions return empty strings** to preserve indices:
   ```typescript
   // summarizeContentBatch returns:
   ["Summary A", "", "Summary C"]  // index 1 has empty string
   ```

2. **Description loop uses `push()`** which doesn't preserve indices:
   ```typescript
   // When contentSummaries[i] is empty string, if (contentSummaries[i]) is falsy
   // This triggers translateDescription, but push() order can drift
   ```

3. **Assembly uses `||` operators** which treat empty strings as falsy:
   ```typescript
   commentSummary: commentSummaries[i] || '暂无评论'  // '' becomes '暂无评论'
   ```

## Proposed Solution

### Solution A: Index-Preserving Logic (Primary Fix)

**Change 1: Replace `push()` with Index Assignment**

```typescript
// BEFORE (src/worker/sources/hackernews.ts:173-182)
const descriptions: string[] = [];
for (let i = 0; i < filteredStories.length; i++) {
  if (contentSummaries[i]) {
    descriptions.push(contentSummaries[i]);
  } else {
    const translated = await translator.translateDescription(metaDescriptions[i]);
    descriptions.push(translated);
  }
}

// AFTER (Index-preserving)
const descriptions: string[] = new Array(filteredStories.length);
for (let i = 0; i < filteredStories.length; i++) {
  if (contentSummaries[i]) {
    descriptions[i] = contentSummaries[i];  // Direct assignment preserves index
  } else {
    descriptions[i] = await translator.translateDescription(metaDescriptions[i]);
  }
}
```

**Rationale:**
- `push()` adds to the end of the array, making it order-dependent
- Index assignment (`descriptions[i] = value`) guarantees alignment by construction
- No risk of array drift even if async calls have variable timing

**Change 2: Explicit Empty String Handling**

```typescript
// BEFORE (src/worker/sources/hackernews.ts:204-205)
description: descriptions[i] || '暂无描述',
commentSummary: commentSummaries[i] || '暂无评论',

// AFTER (Explicit empty string check)
description: descriptions[i] !== '' ? descriptions[i] : '暂无描述',
commentSummary: commentSummaries[i] !== '' ? commentSummaries[i] : '暂无评论',
```

**Rationale:**
- Makes it explicit that we're checking for empty strings, not just falsy values
- Prevents future bugs if we change the batch functions to return `null` instead of `''`
- Self-documenting: "if not empty string, use it, otherwise use fallback"

### Solution C: Defensive Validation (Secondary Fix)

**Add Array Length Validation**

```typescript
// After Phase 2 (before Phase 3)
logInfo('Phase 2.5: Validating array alignment');

const expectedLength = filteredStories.length;
const arrayLengths = {
  translatedTitles: translatedTitles.length,
  contentSummaries: contentSummaries.length,
  descriptions: descriptions.length,
  commentSummaries: commentSummaries.length,
};

// Check all arrays have the same length
const allLengthsMatch = Object.values(arrayLengths).every(len => len === expectedLength);

if (!allLengthsMatch) {
  logError('Array length mismatch detected', new Error('Alignment validation failed'), {
    expected: expectedLength,
    actual: arrayLengths,
  });
  throw new Error(
    `Array alignment validation failed: expected ${expectedLength} items, got ${JSON.stringify(arrayLengths)}`
  );
}

logInfo('Array alignment validated', arrayLengths);
```

**Rationale:**
- Fail-fast behavior: catch misalignment before it corrupts the output
- Provides clear error messages for debugging
- Helps identify if the bug recurs or if there are other alignment issues

## Data Invariants

### Invariant 1: Index Preservation

**Guarantee:** For all `i` in `0..filteredStories.length-1`:
```typescript
processedStories[i].titleChinese === translatedTitles[i]
processedStories[i].description === descriptions[i] (or fallback)
processedStories[i].commentSummary === commentSummaries[i] (or fallback)
```

**Enforcement:**
- Use index assignment instead of `push()`
- Initialize arrays with fixed length: `new Array(length)`
- Validate array lengths before assembly

### Invariant 2: Empty String Semantics

**Guarantee:** Empty strings (`''`) represent "no valid result, but index preserved"

**Enforcement:**
- Batch functions return `''` for missing/invalid items
- Assembly logic explicitly checks `!== ''` before using fallback
- Never use `||` for empty string checks

### Invariant 3: Array Length Equality

**Guarantee:** All result arrays have the same length as `filteredStories`

**Enforcement:**
- Runtime validation after batch processing
- Throw error if any array length mismatches
- Log all array lengths for debugging

## Testing Strategy

### Unit Tests

1. **Description Assembly Logic**
   ```typescript
   describe('Description assembly with mixed content', () => {
     it('should preserve indices when some content summaries are empty', () => {
       const contentSummaries = ['Summary A', '', 'Summary C'];
       const metaDescriptions = ['Desc A', 'Desc B', 'Desc C'];
       // ... test that descriptions[1] gets translated from metaDescriptions[1]
     });
   });
   ```

2. **Empty String Handling**
   ```typescript
   describe('Assembly with empty strings', () => {
     it('should use fallback text for empty strings', () => {
       const commentSummaries = ['Comment A', '', 'Comment C'];
       // ... test that processedStories[1].commentSummary === '暂无评论'
     });
   });
   ```

### Integration Tests

1. **Mixed Availability Scenario**
   ```typescript
   describe('Full pipeline with mixed availability', () => {
     it('should maintain alignment when stories have mixed content/comments', () => {
       // Story 1: content ✓, comments ✓
       // Story 2: content ✗, comments ✗
       // Story 3: content ✓, comments ✓
       // Verify each story gets the correct title/description/comments
     });
   });
   ```

2. **Array Length Validation**
   ```typescript
   describe('Array alignment validation', () => {
     it('should throw error if array lengths mismatch', () => {
       // Mock batch function to return wrong length
       // Verify error is thrown with clear message
     });
   });
   ```

### Regression Test

Replicate the exact scenario from `test-alignment.js`:
- 20 articles, articles 5, 13, 20 have no content
- Verify final `processedStories` array matches expected alignment

## Rollout Plan

### Phase 1: Implementation
1. Apply index-preserving changes to `hackernews.ts`
2. Add array length validation
3. Update assembly logic for explicit empty string checks

### Phase 2: Testing
1. Run unit tests
2. Run integration tests
3. Manual testing with production-like data

### Phase 3: Validation
1. Deploy to staging environment
2. Monitor validation errors (should be zero)
3. Verify output markdown has correct alignment

### Phase 4: Production Deployment
1. Deploy to production
2. Monitor error logs for validation failures
3. Compare before/after markdown outputs for consistency

## Monitoring & Observability

### Metrics to Track

1. **Array Length Validation Failures**
   - Count: How many times validation throws an error
   - Expected: 0 after fix

2. **Empty String Frequency**
   - Count: How often empty strings appear in batch results
   - Helps understand data patterns

3. **Fallback Text Usage**
   - Count: How often "暂无描述" and "暂无评论" are used
   - Baseline: Current usage frequency

### Logging Enhancements

Add structured logs:
```typescript
logInfo('Array alignment summary', {
  translatedTitles: { length: translatedTitles.length, empty: countEmpty(translatedTitles) },
  contentSummaries: { length: contentSummaries.length, empty: countEmpty(contentSummaries) },
  descriptions: { length: descriptions.length, empty: countEmpty(descriptions) },
  commentSummaries: { length: commentSummaries.length, empty: countEmpty(commentSummaries) },
});
```

## Alternative Approaches Considered

### Approach 1: Modify Batch Functions to Return Null

**Idea:** Change batch functions to return `null` instead of `''` for missing items.

**Rejected Because:**
- Empty strings are more natural in JavaScript (avoid null checks everywhere)
- Would require changes to multiple batch functions (wider impact)
- Doesn't solve the fundamental `push()` problem

### Approach 2: Comprehensive Batch Processing

**Idea:** Move all fallback logic into batch functions, eliminating sequential loops.

**Rejected Because:**
- More invasive changes to translator service API
- Couples batch functions to specific fallback strategies
- Violates separation of concerns

### Approach 3: Post-Processing Alignment

**Idea:** After assembly, re-align stories based on story IDs.

**Rejected Because:**
- Fixes symptoms, not root cause
- Adds complexity and performance overhead
- Makes debugging harder (alignment happens after the fact)

## Success Criteria

1. ✅ All arrays have the same length as `filteredStories` (validated at runtime)
2. ✅ `processedStories[i]` always corresponds to `filteredStories[i]`
3. ✅ Empty strings are consistently handled across all fields
4. ✅ Fallback text appears only when appropriate
5. ✅ No new test failures introduced
6. ✅ Manual validation with 20+ story dataset passes
7. ✅ Zero array length validation errors in production

## Risk Assessment

**Risk Level:** Low

**Mitigations:**
- Changes are localized to one file (`hackernews.ts`)
- No API contract changes
- Batch functions already work correctly (no changes needed)
- Comprehensive testing before deployment
- Validation logic provides fail-fast behavior

**Rollback Plan:**
- If issues arise, revert the single file change
- No database migrations or schema changes involved
- Existing functionality preserved (just fixing alignment bug)
