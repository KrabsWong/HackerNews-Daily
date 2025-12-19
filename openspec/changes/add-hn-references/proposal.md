# Proposal: Add Story ID and Remove Title Brackets

## Overview

Enhance the final markdown export with HackerNews story IDs to enable users to quickly navigate to original discussions, while simplifying title formatting by removing unnecessary Chinese brackets.

**User Requirements**:
1. Add story ID to the final output as a clickable link to the HackerNews discussion
2. Remove Chinese brackets `【】` from the title display (keep original titleChinese format)

## Problem Statement

Currently:
- Final export contains translated content but lacks identifiable story IDs, making it difficult for users to reference the original discussion
- Titles display as `## 1. 【标题】` with visual brackets that provide little value

This creates friction when users want to verify information or engage with the original HackerNews community.

## Proposed Solution

### Capability 1: Add Story ID to Data Model
Extend `ProcessedStory` interface to include `storyId: number` field, capturing the HackerNews story identifier.

### Capability 2: Enhanced Markdown Output
Modify markdown generation to:
1. Display title as `## 1. 标题` (without Chinese brackets)
2. Add story ID metadata linking to `https://news.ycombinator.com/item?id={storyId}`

**Example output format**:
```markdown
## 1. 开源大型语言模型简述

Beginning January 2026, all ACM publications will be made open access

**发布时间**: 2026-01-19 08:32:29 UTC

**链接**: [https://dl.acm.org/openaccess](https://dl.acm.org/openaccess)

**描述**:

内容摘要...

*[HackerNews](https://news.ycombinator.com/item?id=46313991)*
```

## Scope

### In Scope
- Add `storyId: number` to `ProcessedStory` interface in `src/types/shared.ts`
- Update all story processing logic to preserve and pass story ID
- Modify markdown exporter to:
  - Remove Chinese brackets from title formatting
  - Add HackerNews link with story ID
- Update tests if applicable
- Update documentation

### Out of Scope
- Changing content translation or summarization
- Modifying story selection or ranking logic
- Changing comment processing

## Dependencies & Sequencing

1. **Phase 1**: Data model changes (add storyId field)
2. **Phase 2**: Update story processing pipeline to preserve storyId
3. **Phase 3**: Update markdown exporter formatting
4. **Phase 4**: Update documentation

## Success Criteria

- [x] Story ID field present in ProcessedStory
- [x] Story ID displayed as clickable HackerNews link in markdown
- [x] Title no longer has Chinese brackets
- [x] All existing tests pass
- [x] Documentation updated

---

## Next Steps

Ready to proceed with implementation once approved. Will create detailed spec deltas and tasks.md.
