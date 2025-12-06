# Design Document: Add Comment Summaries for HackerNews Stories

## Overview
This change adds AI-powered comment summaries to each HackerNews story, providing users with community insights without leaving the CLI tool. The implementation focuses on fetching top comments efficiently and generating concise summaries that preserve technical context.

## Architecture Changes

### Current Flow
```
Story → Article Content → AI Summary → Translation → Display
```

### New Flow
```
Story → Article Content → AI Summary → Translation → Display
     → Comments (top 10) → AI Comment Summary → Display
```

## Component Design

### 1. Comment Fetching (`hackerNews.ts`)

**HackerNews API Comment Structure**:
```typescript
interface HNComment {
  id: number;
  by: string;      // author
  text: string;    // HTML-formatted comment text
  time: number;    // Unix timestamp
  parent: number;  // parent item ID
  kids?: number[]; // child comment IDs (not fetched)
}
```

**Story Structure Enhancement**:
HN stories already include a `kids` field containing top-level comment IDs:
```typescript
interface HNStory {
  id: number;
  title: string;
  kids?: number[];  // Top-level comment IDs (already exists in API)
  // ... other fields
}
```

**New Function: `fetchComments(storyId: number, limit: number): Promise<HNComment[]>`**

**Implementation Strategy**:
1. Fetch story details to get `kids` array (comment IDs)
2. If no `kids`, return empty array
3. Fetch all comment details in parallel (Promise.all)
4. Filter out null/deleted/empty comments
5. Sort by score/time (HN API doesn't include score, so sort by time - newer first)
6. Take top N comments (default 10)
7. Return comment array

**Note**: HackerNews API doesn't expose comment scores directly, so we'll use comment order from the `kids` array which reflects HN's ranking algorithm (a combination of score, time, and penalties).

**Alternative Considered**: Fetch ALL comments and sort client-side
- ❌ Too slow (hundreds of comments per story)
- ❌ Wastes API calls
- ✅ Use HN's pre-sorted order from `kids` array (already optimized)

**Comment Text Processing**:
- Comments are HTML-formatted (e.g., `<p>`, `<a>`, `<code>`)
- Need to strip HTML tags to get plain text
- Preserve code blocks and technical terms

**Helper Function: `stripHTML(html: string): string`**
```typescript
// Use cheerio (already installed) to parse HTML and extract text
// Preserve structure: paragraphs, code blocks, but remove links/formatting
```

### 2. Comment Summarization (`translator.ts`)

**New Method: `summarizeComments(comments: HNComment[]): Promise<string | null>`**

**Prompt Engineering**:
```
总结以下 HackerNews 评论中的关键讨论要点。要求：
- 总结长度约为 100 个字符
- 保留重要的技术术语、库名称、工具名称（如 React、TypeScript、AWS 等）
- 捕捉评论中的主要观点和共识
- 如果有争议观点，简要提及
- 使用清晰、简洁的中文表达

评论内容：
{comments_text}
```

**Comment Processing**:
1. Extract text from each comment (strip HTML)
2. Concatenate top 10 comments with separator
3. Truncate if total exceeds 5000 chars (prevent token limits)
4. Send to DeepSeek API
5. Return summary or null on failure

**Fallback Strategy**:
- If AI summarization fails → return null
- If story has <3 valid comments → return null
- Caller (index.ts) will skip comment line if null returned

### 3. Integration Updates (`index.ts`)

**Updated ProcessedStory Interface**:
```typescript
interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
  description: string;
  commentSummary: string | null;  // NEW: AI summary of top comments
}
```

**Pipeline Modifications**:
```typescript
// After fetching stories...
console.log('\nFetching top comments for each story...');
const commentArrays = await fetchCommentsBatch(stories, 10);

console.log('\nSummarizing comments...');
const commentSummaries = await summarizeCommentsBatch(commentArrays);

// In displayCards(), show comment summary if present:
if (story.commentSummary) {
  console.log(`评论要点：${story.commentSummary}`);
}
```

**Batch Processing**:
- Fetch comments for all stories in parallel (Promise.all)
- Summarize comments sequentially (DeepSeek API rate limits)
- Show progress indicators

### 4. Display Format

**Current Format**:
```
#1 【中文标题】
English Title
发布时间：2025-12-06 14:30
链接：https://...
描述：文章摘要...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**New Format (with comments)**:
```
#1 【中文标题】
English Title
发布时间：2025-12-06 14:30
链接：https://...
描述：文章摘要...
评论要点：社区讨论了 React 18 的性能优化，多数认为新的并发渲染很实用
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**New Format (no comments)**:
```
#1 【中文标题】
English Title
发布时间：2025-12-06 14:30
链接：https://...
描述：文章摘要...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
(Comment line is omitted)

## Performance Considerations

### Latency Analysis (per story):
- Fetch top 10 comment IDs: ~0ms (already in story data)
- Fetch 10 comment details: ~500-1000ms (parallel)
- AI summarization: ~1-2s (DeepSeek API)

**Total added latency**: ~1.5-3s per story

For 30 stories:
- Comment fetching: ~30s (parallel for all stories)
- Comment summarization: ~45-60s (sequential to respect rate limits)
- **Total added time**: ~75-90s (1.5-2 minutes)

**Current total time**: ~2 minutes for 30 stories
**New total time**: ~3.5-4 minutes for 30 stories

**Mitigation**:
- This is acceptable for a CLI tool that generates daily digests
- Users already wait for article summaries (~2 min)
- Progress indicators keep users informed
- Quality of insights justifies the additional time

### Cost Analysis:
**Per story**:
- Comment fetching: Free (HN API)
- AI summarization: ~0.0002 USD (estimate: 1000 tokens @ deepseek-chat pricing)

**For 30 stories**:
- Comment summarization: ~0.006 USD
- Total including article summaries: ~0.015 USD (still negligible)

## Error Handling Strategy

### Graceful Degradation:
1. **No comments**: Skip comment line in display
2. **Fetch fails**: Log warning, skip comment line
3. **Summarization fails**: Log warning, skip comment line
4. **<3 valid comments**: Skip (not enough for meaningful summary)

### Specific Error Cases:

**Story has no `kids` field**:
- Return empty array from fetchComments()
- Skip summarization
- Don't show comment line

**Comment fetch fails (deleted/null)**:
- Filter out failed comments
- Continue with remaining comments
- If <3 remain, skip summarization

**All comment fetches fail**:
- Log warning with story ID
- Skip comment line
- Continue processing other stories

**AI summarization fails**:
- Log warning with error details
- Return null
- Skip comment line

## Testing Strategy

### Unit Tests
- `fetchComments()` with various story structures (with/without kids)
- `stripHTML()` with various HTML formats
- `summarizeComments()` with different comment counts

### Integration Tests
- End-to-end with stories that have comments
- End-to-end with stories that have no comments
- Performance benchmarking (time per story)

### Manual Testing
- Test with diverse HN stories:
  - Popular stories (hundreds of comments)
  - New stories (few comments)
  - Stories with no comments
  - Stories with technical discussions
  - Stories with controversial discussions

## Implementation Phases

**Phase 1: Comment Fetching**
- Add HNComment interface
- Implement fetchComments()
- Implement stripHTML() helper
- Test with real HN story IDs

**Phase 2: Comment Summarization**
- Add summarizeComments() to TranslationService
- Implement prompt engineering
- Add batch processing method
- Test with sample comments

**Phase 3: Pipeline Integration**
- Update ProcessedStory interface
- Integrate comment fetching into main()
- Integrate comment summarization
- Update display logic

**Phase 4: Polish & Documentation**
- Add progress indicators
- Update README
- Performance testing
- Error handling verification

## Alternative Approaches Considered

### 1. Fetch All Comments
**Pros**: More comprehensive summary
**Cons**: Much slower (100+ comments), wastes API calls, diminishing returns
**Decision**: ❌ Rejected - top 10 provides best quality-to-performance ratio

### 2. Cache Comments
**Pros**: Faster on repeated runs
**Cons**: Adds complexity, comments change over time, not useful for daily digest
**Decision**: ❌ Deferred - not needed for v1

### 3. Configurable Comment Count
**Pros**: User flexibility
**Cons**: More complexity, need validation, default is good enough
**Decision**: ❌ Deferred - keep simple, hardcode 10

### 4. Sentiment Analysis
**Pros**: Interesting insights (positive/negative)
**Cons**: Adds complexity, may not be accurate, not requested
**Decision**: ❌ Out of scope

## Success Metrics

**Quantitative**:
- >80% of stories with comments get summaries
- Comment summaries are 80-120 characters (close to 100 target)
- Added latency is <3s per story on average
- <5% summarization failures

**Qualitative**:
- Summaries capture key discussion points
- Technical terms are preserved
- Summaries are readable and informative
- Users gain value from comment insights
