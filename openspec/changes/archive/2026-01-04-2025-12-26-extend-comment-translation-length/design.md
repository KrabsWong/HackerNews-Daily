# Design: Extend Comment Translation Length

## Overview

This change adds a dedicated `COMMENT_SUMMARY_LENGTH` configuration constant (300 characters) to provide independent control over comment summary length, separate from article summaries, while providing richer information from HackerNews discussions.

## Current Architecture

### Configuration State

**Existing Configuration:**
```typescript
// src/config/constants.ts
export const SUMMARY_CONFIG = {
  DEFAULT_LENGTH: 300,  // ✅ Used by article summaries
  MIN_LENGTH: 100,
  MAX_LENGTH: 500,
} as const;

export const CONTENT_CONFIG = {
  MAX_CONTENT_LENGTH: 0,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_COMMENTS_LENGTH: 5000,
  MIN_COMMENTS_FOR_SUMMARY: 3,
  // ❌ No COMMENT_SUMMARY_LENGTH yet
} as const;
```

**Current Usage:**
- ✅ Article summaries: Use `SUMMARY_CONFIG.DEFAULT_LENGTH` (300 chars)
- ❌ Comment summaries: Hardcoded 100 chars (inconsistent!)

### Affected Components

1. **Constants** (`src/config/constants.ts`)
   - Need to add: `COMMENT_SUMMARY_LENGTH: 300` to `CONTENT_CONFIG`

2. **Summarization Functions** (`src/services/translator/summary.ts`)
   - `summarizeComments()` - Line 131: `"总结长度约为 100 个字符"`
   - `summarizeCommentsBatch()` - Line 554: `"总结长度约为 100 个字符"`
   - Already imports `CONTENT_CONFIG` at line 11

## Proposed Changes

### 1. Add COMMENT_SUMMARY_LENGTH Configuration

**Location**: `src/config/constants.ts` in `CONTENT_CONFIG` section (around line 236-250)

**Add:**
```typescript
export const CONTENT_CONFIG = {
  /** 
   * Maximum characters before truncation for AI summarization
   * Set to 0 or undefined to disable truncation (no limit)
   * Default: 0 (no limit)
   */
  MAX_CONTENT_LENGTH: 0,
  /** Maximum length for meta descriptions */
  MAX_DESCRIPTION_LENGTH: 200,
  /** Maximum length for combined comments before truncation */
  MAX_COMMENTS_LENGTH: 5000,
  /** Minimum number of comments required for summarization */
  MIN_COMMENTS_FOR_SUMMARY: 3,
  /** Target length for comment summaries in characters */
  COMMENT_SUMMARY_LENGTH: 300,
} as const;
```

**Rationale:**
- Places comment-related config with other comment settings
- Maintains logical grouping in `CONTENT_CONFIG`
- Separate from `SUMMARY_CONFIG` (article-focused)
- Follows existing documentation pattern with JSDoc comment

### 2. Update Single Comment Summarization

**Location**: `src/services/translator/summary.ts:130-145`

**Before:**
```typescript
const response = await provider.chatCompletion({
  messages: [
    {
      role: 'user',
      content: `总结以下 HackerNews 评论中的关键讨论要点。要求：
- 总结长度约为 100 个字符
- 保留重要的技术术语、库名称、工具名称（如 React、TypeScript、AWS 等）
- 捕捉评论中的主要观点和共识
- 如果有争议观点，简要提及
- 使用清晰、简洁的中文表达
```

**After:**
```typescript
const response = await provider.chatCompletion({
  messages: [
    {
      role: 'user',
      content: `总结以下 HackerNews 评论中的关键讨论要点。要求：
- 总结长度约为 ${CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH} 个字符
- 保留重要的技术术语、库名称、工具名称（如 React、TypeScript、AWS 等）
- 捕捉评论中的主要观点和共识
- 如果有争议观点,提及不同立场和论据
- 如果讨论了具体实现、性能数据、或替代方案,尽量包含关键信息
- 使用清晰、准确的中文表达
```

**Changes:**
1. Replace `100` with `${CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH}`
2. Enhance guidance: "简要提及" → "提及不同立场和论据"
3. Add: "如果讨论了具体实现、性能数据、或替代方案,尽量包含关键信息"
4. Improve wording: "简洁" → "准确" (accuracy over brevity)

### 3. Update Batch Comment Summarization

**Location**: `src/services/translator/summary.ts:548-566`

**Before:**
```typescript
const result = await fromPromise(
  provider.chatCompletion({
    messages: [
      {
        role: 'user',
        content: `总结以下 HackerNews 评论中的关键讨论要点。返回 JSON 数组，每个元素是对应评论的摘要。

输入 JSON 数组：
${JSON.stringify(batchInput, null, 2)}

要求：
- 总结长度约为 100 个字符
- 保留重要的技术术语、库名称、工具名称
- 捕捉评论中的主要观点和共识
- 直接输出摘要内容，不要添加"摘要1:"等任何序号或标记前缀
- 输出格式示例：["评论讨论了某技术的优缺点...", "用户普遍认为..."]
- 只输出 JSON 数组
```

**After:**
```typescript
const result = await fromPromise(
  provider.chatCompletion({
    messages: [
      {
        role: 'user',
        content: `总结以下 HackerNews 评论中的关键讨论要点。返回 JSON 数组，每个元素是对应评论的摘要。

输入 JSON 数组：
${JSON.stringify(batchInput, null, 2)}

要求：
- 总结长度约为 ${CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH} 个字符
- 保留重要的技术术语、库名称、工具名称
- 捕捉评论中的主要观点和共识
- 如果有争议观点,提及不同立场和论据
- 如果讨论了具体实现、性能数据、或替代方案,尽量包含关键信息
- 直接输出摘要内容，不要添加"摘要1:"等任何序号或标记前缀
- 输出格式示例：["评论讨论了某技术的优缺点...", "用户普遍认为..."]
- 只输出 JSON 数组
```

**Changes:**
1. Replace `100` with `${CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH}`
2. Add same enhanced guidance as single function
3. Maintain JSON output format requirements

## Implementation Benefits

### Code Quality
1. **Separation of Concerns**: Comment config separate from article config
2. **Flexibility**: Adjust comment and article summaries independently
3. **Clarity**: Explicit naming makes purpose obvious
4. **Maintainability**: Single source of truth for comment summary length

### User Experience
1. **Richer Information**: 300 chars vs 100 chars = 3x more context
2. **Better Decisions**: More complete information for evaluating stories
3. **Reduced Ambiguity**: Capture nuanced discussions and trade-offs

### Future Flexibility
1. **Independent tuning**: Can adjust comment length without affecting articles
2. **User preferences**: Could expose as environment variable later
3. **A/B testing**: Easy to experiment with different lengths

### Example Improvement

**Before (100 chars):**
> "用户讨论了React性能优化方案,提到了memo和useMemo的使用。"

**After (300 chars):**
> "用户讨论了React性能优化方案,重点关注memo和useMemo的正确使用场景。多位开发者指出过度使用会导致代码复杂度上升。有人建议优先使用React DevTools Profiler定位瓶颈再优化。社区共识是:先测量性能问题,再有针对性地使用优化技术。部分开发者推荐了react-window库处理长列表场景。"

## Implementation Notes

### Why Separate Configuration?

1. **Different purposes**:
   - Article summaries: Capture content depth and nuance
   - Comment summaries: Highlight discussion and community insights

2. **Independent evolution**:
   - Article summary length might need adjustment based on content quality
   - Comment summary length might need adjustment based on discussion depth
   - Changes to one shouldn't force changes to the other

3. **Future extensibility**:
   - Could add `MIN_COMMENT_SUMMARY_LENGTH` later
   - Could add `MAX_COMMENT_SUMMARY_LENGTH` later
   - Could expose as environment variable: `COMMENT_SUMMARY_LENGTH`

### Why 300 Characters?

1. **Proven value**: 300 chars works well for article summaries
2. **Balance**: Provides richer information without becoming too long
3. **Readability**: Still concise enough to scan quickly
4. **API efficiency**: Same number of API calls, marginal token increase

### No Changes Required

1. **Comment fetching**: Still 10 comments per story (sufficient)
2. **Comment length limit**: Still 5000 chars combined (sufficient)
3. **Batch size**: Still 10 stories per batch (optimal)
4. **API calls**: Same number of requests (no cost increase)
5. **Import statement**: `CONTENT_CONFIG` already imported in summary.ts

### Testing Strategy

1. **Unit tests**: Verify prompts use `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH`
2. **Type checking**: Ensure configuration is properly typed
3. **Integration tests**: Validate actual summary lengths
4. **Manual review**: Check real summaries for quality and informativeness

## Risk Assessment

**Very Low Risk:**
- Simple configuration addition
- No architectural changes
- Easy to revert if needed
- No breaking changes

**Potential Issues:**
- LLM might not always hit 300 chars (acceptable - it's a target)
- Slightly longer Markdown files (negligible impact)

## Rollback Plan

If needed, can:
1. Revert to hardcoded `100` value
2. Or adjust `COMMENT_SUMMARY_LENGTH` to lower value (e.g., 200)
3. Or set to same as `SUMMARY_CONFIG.DEFAULT_LENGTH` if separation not needed

No breaking changes or migrations required.
