# Proposal: Refactor Story Rank Display in Markdown Output

## Status
- **Status**: Implemented
- **Created**: 2026-01-08
- **Implemented**: 2026-01-08
- **Change ID**: `2026-01-08-refactor-story-rank-display`

## Context

Currently, the markdown output displays story rank (1, 2, 3...) prominently in the article title:

```markdown
## 1. 标题（中文翻译）
```

However, this "rank" is not a true HackerNews ranking - it's simply the array index of stories after they've been:
1. Fetched from HackerNews (best stories list or by score)
2. Filtered by date range
3. Sorted by score
4. Limited to top N stories

The HackerNews API does not provide an actual "rank" field. Displaying this index as "rank" in the title is misleading, as it:
- Does not represent HackerNews's official ranking
- Is merely an iteration index in the processed array
- Creates visual clutter in the article title
- Suggests more authority than it actually has (just our sorting order)

## Problem Statement

Users may misinterpret the "rank" number as HackerNews's official ranking, when it's actually just our processing order. The rank appears prominently in titles but provides minimal value compared to other metadata like score, time, and the actual HackerNews discussion link.

## Proposed Solution

**Completely remove rank from markdown output** since it's just an array index with no intrinsic meaning from HackerNews.

### Before
```markdown
## 1. Python 性能优化技巧

Python Performance Tips

**发布时间**: 2026-01-07 10:30:00 UTC

**链接**: [https://example.com/article](https://example.com/article)

**描述**:
...

**评论要点**:
...

*[HackerNews](https://news.ycombinator.com/item?id=46313991)*

---
```

### After
```markdown
## Python 性能优化技巧

Python Performance Tips

**发布时间**: 2026-01-07 10:30:00 UTC

**链接**: [https://example.com/article](https://example.com/article)

**描述**:
...

**评论要点**:
...

*[HackerNews](https://news.ycombinator.com/item?id=46313991)*

---
```

The rank is completely removed from the markdown output, making titles cleaner and avoiding any misleading impression of "official ranking".

## Benefits

1. **More accurate representation**: Removes misleading "official rank" impression
2. **Cleaner titles**: Article titles focus on content, not arbitrary ordering
3. **Reduced visual clutter**: Titles are more readable without leading numbers
4. **Honest data presentation**: Don't display synthetic metadata that suggests false authority

## Scope

### In Scope
- Remove rank from markdown article titles (H2 headings)
- Add rank as tag in HackerNews link line
- Update markdown output specification
- Update tests for markdown exporter
- Update Telegram formatter (currently uses emoji numbers 1️⃣-🔟 based on rank)

### Out of Scope
- Changes to `ProcessedStory.rank` field (keep for internal tracking)
- Changes to data processing logic
- Changes to API fetching strategy

## Dependencies

- Requires updates to `markdown-output` spec
- Affects Telegram formatter which currently relies heavily on rank for visual presentation

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users expect numbered lists | Low | Jekyll/GitHub renders sequential articles clearly; users can still see order visually |
| Telegram visual hierarchy relies on rank | Medium | Keep emoji numbers in Telegram (different medium, better visual scanning with numbers) |
| Breaking change for downstream consumers | Low | Only affects markdown format, not data structure |

## Alternatives Considered

1. **Keep rank in title** - Rejected: Misleading and clutters titles
2. **Move rank to bottom as tag** - Rejected: Still displays meaningless index number
3. **Completely remove rank from markdown** - Selected: Cleanest and most honest approach

## Open Questions

None - investigation confirms HackerNews API provides no rank field, making our current display misleading.

## Next Steps

1. Draft spec deltas for `markdown-output` and `telegram-batch-sending`
2. Create tasks.md with implementation steps
3. Validate proposal with `openspec validate --strict`
4. Seek approval before implementation
