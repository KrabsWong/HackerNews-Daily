/**
 * Test fixtures providing common test data structures
 * 
 * CRITICAL: All mock factories MUST match their corresponding TypeScript interfaces exactly.
 * Any mismatch in field names, types, or required/optional properties is strictly prohibited.
 */

import type { HNStory, AlgoliaStory, AlgoliaComment, HNComment } from '../../types/api';
import type { ProcessedStory } from '../../types/shared';

/**
 * Create a mock HNStory with customizable fields
 * CRITICAL: Must match HNStory interface exactly
 */
export function createMockHNStory(overrides: Partial<HNStory> = {}): HNStory {
  return {
    id: 12345,
    title: 'Example HackerNews Story',
    url: 'https://example.com/article',
    score: 150,
    time: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    type: 'story',
    by: 'testuser',
    kids: [12346, 12347, 12348],
    ...overrides,
  };
}

/**
 * Create a mock AlgoliaStory with customizable fields
 * IMPORTANT: Must match AlgoliaStory interface exactly
 */
export function createMockAlgoliaStory(overrides: Partial<AlgoliaStory> = {}): AlgoliaStory {
  return {
    story_id: 12345,
    objectID: '12345',
    title: 'Example HackerNews Story',
    url: 'https://example.com/article',
    points: 150,
    created_at_i: Math.floor(Date.now() / 1000) - 3600,
    author: 'testuser',
    num_comments: 50, // Can be number | null
    _tags: ['story', 'author_testuser'],
    ...overrides,
  };
}

/**
 * Create a mock AlgoliaComment with customizable fields
 * CRITICAL: Must match AlgoliaComment interface exactly
 */
export function createMockAlgoliaComment(overrides: Partial<AlgoliaComment> = {}): AlgoliaComment {
  return {
    objectID: '12346',
    author: 'commenter1',
    comment_text: 'This is a test comment with some insightful thoughts.',
    created_at_i: Math.floor(Date.now() / 1000) - 1800,
    story_id: 12345,
    parent_id: 12345,
    _tags: ['comment', 'author_commenter1'],
    ...overrides,
  };
}

/**
 * Create a mock HNComment with customizable fields
 * CRITICAL: Must match HNComment interface exactly
 */
export function createMockHNComment(overrides: Partial<HNComment> = {}): HNComment {
  return {
    id: 12346,
    by: 'commenter1',
    text: '<p>This is a test comment with some insightful thoughts.</p>',
    time: Math.floor(Date.now() / 1000) - 1800,
    parent: 12345,
    kids: [],
    ...overrides,
  };
}

/**
 * Create a mock ProcessedStory with customizable fields
 * CRITICAL: Must match ProcessedStory interface exactly
 */
export function createMockProcessedStory(overrides: Partial<ProcessedStory> = {}): ProcessedStory {
  return {
    rank: 1,
    storyId: 12345,
    titleChinese: '示例 HackerNews 故事',
    titleEnglish: 'Example HackerNews Story',
    score: 150,
    url: 'https://example.com/article',
    time: '2025-12-20 10:00:00 UTC',
    timestamp: Math.floor(Date.now() / 1000) - 3600,
    description: 'This is a generated summary of the article content...',
    commentSummary: 'Users discussed the technical implementation...',
    ...overrides,
  };
}

/**
 * Create multiple mock stories for batch testing
 */
export function createMockStories(count: number): HNStory[] {
  return Array.from({ length: count }, (_, i) => createMockHNStory({
    id: 10000 + i,
    title: `Test Story ${i + 1}`,
    score: 200 - (i * 10),
    time: Math.floor(Date.now() / 1000) - (i * 3600),
  }));
}

/**
 * Create multiple mock comments for batch testing
 */
export function createMockComments(count: number, storyId: number = 12345): AlgoliaComment[] {
  return Array.from({ length: count }, (_, i) => createMockAlgoliaComment({
    objectID: `${20000 + i}`,
    story_id: storyId,
    author: `commenter${i + 1}`,
    comment_text: `Comment ${i + 1} text with meaningful content.`,
    created_at_i: Math.floor(Date.now() / 1000) - (i * 600),
  }));
}

/**
 * Mock article HTML content
 */
export const MOCK_ARTICLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Example Article</title>
  <meta name="description" content="A test article for extraction">
</head>
<body>
  <article>
    <h1>Example Article Title</h1>
    <p>This is the first paragraph of the article with meaningful content.</p>
    <p>This is the second paragraph with more detailed information about the topic.</p>
    <p>The article continues with additional insights and analysis.</p>
  </article>
</body>
</html>
`;

/**
 * Mock markdown export content
 */
export const MOCK_MARKDOWN_EXPORT = `---
layout: post
title: HackerNews Daily - 2025-12-20
date: 2025-12-20
---

## 1. 示例 HackerNews 故事

Example HackerNews Story

**发布时间**: 2025-12-20 10:00:00 UTC

**链接**: [https://example.com/article](https://example.com/article)

**描述**:

这是文章内容的生成摘要...

**评论要点**:

用户讨论了技术实现...

*[HackerNews](https://news.ycombinator.com/item?id=12345)*

---
`;
