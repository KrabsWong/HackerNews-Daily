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

// =============================================================================
// External API Mock Factories (Phase 1 Infrastructure)
// =============================================================================

/**
 * Mock Crawler API Response
 * Simulates response from article extraction service
 */
export interface CrawlerResponse {
  success: boolean;
  data?: {
    title: string;
    description: string;
    content: string;
    html?: string;
  };
  error?: {
    message: string;
    code: string;
  };
}

/**
 * Create a mock Crawler API response for successful extraction
 */
export function createMockCrawlerResponse(overrides?: Partial<CrawlerResponse>): CrawlerResponse {
  return {
    success: true,
    data: {
      title: 'Example Article Title',
      description: 'This is the first paragraph of the article with meaningful content.',
      content: `This is the first paragraph of the article with meaningful content.
This is the second paragraph with more detailed information about the topic.
The article continues with additional insights and analysis.`,
      html: MOCK_ARTICLE_HTML,
      ...overrides?.data,
    },
    ...overrides,
  };
}

/**
 * Create a mock Crawler API error response
 */
export function createMockCrawlerError(message: string = 'Failed to fetch URL'): CrawlerResponse {
  return {
    success: false,
    error: {
      message,
      code: 'FETCH_ERROR',
    },
  };
}

/**
 * Mock GitHub API Response for file creation
 */
export interface GitHubCreateResponse {
  content: {
    name: string;
    path: string;
    sha: string;
    size: number;
    url: string;
    html_url: string;
    git_url: string;
    download_url: string;
    type: string;
    _links: {
      self: string;
      git: string;
      html: string;
    };
  };
  commit: {
    sha: string;
    url: string;
    html_url: string;
    author: {
      date: string;
      name: string;
      email: string;
    };
    committer: {
      date: string;
      name: string;
      email: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    parents: Array<{
      sha: string;
      url: string;
      html_url: string;
    }>;
  };
}

/**
 * Create a mock GitHub API create file response
 */
export function createMockGitHubCreateResponse(overrides?: Partial<GitHubCreateResponse>): GitHubCreateResponse {
  const defaultSha = 'abc123def456';
  return {
    content: {
      name: '2025-12-20-daily.md',
      path: '_posts/2025-12-20-daily.md',
      sha: defaultSha,
      size: 5432,
      url: 'https://api.github.com/repos/test/repo/contents/_posts/2025-12-20-daily.md',
      html_url: 'https://github.com/test/repo/blob/main/_posts/2025-12-20-daily.md',
      git_url: 'https://api.github.com/repos/test/repo/git/blobs/abc123def456',
      download_url: 'https://raw.githubusercontent.com/test/repo/main/_posts/2025-12-20-daily.md',
      type: 'file',
      _links: {
        self: 'https://api.github.com/repos/test/repo/contents/_posts/2025-12-20-daily.md',
        git: 'https://api.github.com/repos/test/repo/git/blobs/abc123def456',
        html: 'https://github.com/test/repo/blob/main/_posts/2025-12-20-daily.md',
      },
      ...overrides?.content,
    },
    commit: {
      sha: defaultSha,
      url: 'https://api.github.com/repos/test/repo/git/commits/abc123def456',
      html_url: 'https://github.com/test/repo/commit/abc123def456',
      author: {
        date: '2025-12-20T10:00:00Z',
        name: 'HackerNews Daily Bot',
        email: 'bot@example.com',
      },
      committer: {
        date: '2025-12-20T10:00:00Z',
        name: 'GitHub',
        email: 'noreply@github.com',
      },
      message: 'chore: add daily export for 2025-12-20',
      tree: {
        sha: 'tree123abc',
        url: 'https://api.github.com/repos/test/repo/git/trees/tree123abc',
      },
      parents: [
        {
          sha: 'parent123abc',
          url: 'https://api.github.com/repos/test/repo/git/commits/parent123abc',
          html_url: 'https://github.com/test/repo/commit/parent123abc',
        },
      ],
      ...overrides?.commit,
    },
  };
}

/**
 * Create a mock GitHub API update file response
 */
export function createMockGitHubUpdateResponse(overrides?: Partial<GitHubCreateResponse>): GitHubCreateResponse {
  return createMockGitHubCreateResponse({
    ...overrides,
    commit: {
      ...createMockGitHubCreateResponse().commit,
      message: 'chore: update daily export for 2025-12-20',
      ...overrides?.commit,
    },
  });
}

/**
 * Create a mock GitHub API error response
 */
export function createMockGitHubError(status: number = 401, message: string = 'Bad credentials'): Response {
  return new Response(
    JSON.stringify({
      message,
      documentation_url: 'https://docs.github.com/rest',
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Mock Telegram Bot API Response
 */
export interface TelegramResponse {
  ok: boolean;
  result?: {
    message_id: number;
    sender_chat?: {
      id: number;
      title: string;
      type: string;
    };
    chat: {
      id: number;
      title?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
  description?: string;
  error_code?: number;
}

/**
 * Create a mock Telegram Bot API response for successful message send
 */
export function createMockTelegramResponse(overrides?: Partial<TelegramResponse>): TelegramResponse {
  return {
    ok: true,
    result: {
      message_id: 12345,
      sender_chat: {
        id: -100123456789,
        title: 'HackerNews Daily',
        type: 'channel',
      },
      chat: {
        id: -100123456789,
        title: 'HackerNews Daily',
        type: 'channel',
      },
      date: Math.floor(Date.now() / 1000),
      text: 'HackerNews Daily Export',
      ...overrides?.result,
    },
    ...overrides,
  };
}

/**
 * Create a mock Telegram Bot API error response
 */
export function createMockTelegramError(code: number = 400, message: string = 'Bad Request'): TelegramResponse {
  return {
    ok: false,
    error_code: code,
    description: message,
  };
}

// =============================================================================
// Malformed Data Test Helpers (Phase 1 Task 7)
// =============================================================================

/**
 * Generate malformed HNStory with missing required fields
 * 
 * @param options Control which fields to corrupt
 * @returns Partially invalid HNStory for testing error handling
 */
export function createMalformedHNStory(options: {
  missingTitle?: boolean;
  missingId?: boolean;
  invalidType?: boolean;
  invalidTimestamp?: boolean;
  invalidScore?: boolean;
  invalidUrl?: boolean;
} = {}): Partial<HNStory> {
  const base: any = {
    id: options.missingId ? undefined : 12345,
    title: options.missingTitle ? undefined : 'Example Story',
    url: options.invalidUrl ? 'not-a-valid-url' : 'https://example.com',
    score: options.invalidScore ? -999 : 150,
    time: options.invalidTimestamp ? 'invalid-timestamp' as any : Math.floor(Date.now() / 1000),
    type: options.invalidType ? 'unknown-type' as any : 'story',
    by: 'testuser',
  };

  // Remove undefined fields to simulate missing data
  Object.keys(base).forEach(key => {
    if (base[key] === undefined) {
      delete base[key];
    }
  });

  return base;
}

/**
 * Generate malformed AlgoliaStory with missing or invalid fields
 * 
 * @param options Control which fields to corrupt
 * @returns Partially invalid AlgoliaStory for testing error handling
 */
export function createMalformedAlgoliaStory(options: {
  missingObjectID?: boolean;
  missingStoryId?: boolean;
  missingTitle?: boolean;
  invalidPoints?: boolean;
  invalidTimestamp?: boolean;
  invalidUrl?: boolean;
  missingAuthor?: boolean;
} = {}): Partial<AlgoliaStory> {
  const base: any = {
    objectID: options.missingObjectID ? undefined : '12345',
    story_id: options.missingStoryId ? undefined : 12345,
    title: options.missingTitle ? undefined : 'Example Story',
    url: options.invalidUrl ? 'not-a-url' : 'https://example.com',
    points: options.invalidPoints ? 'invalid' as any : 150,
    created_at_i: options.invalidTimestamp ? 'not-a-number' as any : Math.floor(Date.now() / 1000),
    author: options.missingAuthor ? undefined : 'testuser',
    _tags: ['story'],
  };

  // Remove undefined fields
  Object.keys(base).forEach(key => {
    if (base[key] === undefined) {
      delete base[key];
    }
  });

  return base;
}

/**
 * Generate malformed AlgoliaComment with missing or invalid fields
 * 
 * @param options Control which fields to corrupt
 * @returns Partially invalid AlgoliaComment for testing error handling
 */
export function createMalformedAlgoliaComment(options: {
  missingObjectID?: boolean;
  missingText?: boolean;
  emptyText?: boolean;
  missingAuthor?: boolean;
  invalidStoryId?: boolean;
  invalidTimestamp?: boolean;
} = {}): Partial<AlgoliaComment> {
  const base: any = {
    objectID: options.missingObjectID ? undefined : '12346',
    author: options.missingAuthor ? undefined : 'commenter1',
    comment_text: options.missingText ? undefined : (options.emptyText ? '' : 'Test comment'),
    created_at_i: options.invalidTimestamp ? null as any : Math.floor(Date.now() / 1000),
    story_id: options.invalidStoryId ? 'not-a-number' as any : 12345,
    _tags: ['comment'],
  };

  // Remove undefined fields
  Object.keys(base).forEach(key => {
    if (base[key] === undefined) {
      delete base[key];
    }
  });

  return base;
}

/**
 * Generate malformed ProcessedStory with missing or invalid fields
 * 
 * @param options Control which fields to corrupt
 * @returns Partially invalid ProcessedStory for testing error handling
 */
export function createMalformedProcessedStory(options: {
  missingRank?: boolean;
  missingStoryId?: boolean;
  missingTitles?: boolean;
  invalidUrl?: boolean;
  invalidScore?: boolean;
  invalidTimestamp?: boolean;
} = {}): Partial<ProcessedStory> {
  const base: any = {
    rank: options.missingRank ? undefined : 1,
    storyId: options.missingStoryId ? undefined : 12345,
    titleChinese: options.missingTitles ? undefined : '示例故事',
    titleEnglish: options.missingTitles ? undefined : 'Example Story',
    score: options.invalidScore ? 'invalid' as any : 150,
    url: options.invalidUrl ? 'not-a-url' : 'https://example.com',
    time: '2025-12-20 10:00:00 UTC',
    timestamp: options.invalidTimestamp ? 'not-a-number' as any : Math.floor(Date.now() / 1000),
  };

  // Remove undefined fields
  Object.keys(base).forEach(key => {
    if (base[key] === undefined) {
      delete base[key];
    }
  });

  return base;
}

/**
 * Create malformed API responses for testing error handling
 */
export const MalformedAPIResponses = {
  /**
   * Empty JSON object response
   */
  empty: {},

  /**
   * Null response
   */
  null: null,

  /**
   * Array instead of expected object
   */
  unexpectedArray: [1, 2, 3],

  /**
   * String instead of expected object
   */
  unexpectedString: 'not an object',

  /**
   * Response with wrong structure
   */
  wrongStructure: {
    unexpected_field: 'value',
    another_field: 123,
  },

  /**
   * Nested data with missing critical fields
   */
  missingCriticalFields: {
    data: {
      // Missing required fields
    },
  },

  /**
   * Response with all null values
   */
  allNulls: {
    id: null,
    title: null,
    url: null,
    score: null,
  },

  /**
   * HackerNews API response with hits but malformed items
   */
  algoliaHitsMalformed: {
    hits: [
      { objectID: '123' }, // Missing title and other required fields
      { title: 'Story without ID' }, // Missing objectID
      {}, // Completely empty
    ],
    nbHits: 3,
    page: 0,
    nbPages: 1,
  },

  /**
   * GitHub API 404 Not Found error
   */
  githubNotFound: {
    message: 'Not Found',
    documentation_url: 'https://docs.github.com/rest',
  },

  /**
   * GitHub API 422 Validation Failed error
   */
  githubValidationFailed: {
    message: 'Validation Failed',
    errors: [
      {
        resource: 'Repository',
        code: 'invalid',
        field: 'name',
      },
    ],
    documentation_url: 'https://docs.github.com/rest',
  },

  /**
   * Telegram API error response
   */
  telegramError: {
    ok: false,
    error_code: 400,
    description: 'Bad Request: chat not found',
  },

  /**
   * Crawler API timeout error
   */
  crawlerTimeout: {
    success: false,
    error: {
      message: 'Request timeout',
      code: 'TIMEOUT',
    },
  },

  /**
   * Malformed JSON-like string that will fail parsing
   */
  invalidJSON: '{"invalid": json, missing: "quotes"}',

  /**
   * HTML response when JSON expected
   */
  htmlInsteadOfJSON: '<!DOCTYPE html><html><body>Error 500</body></html>',

  /**
   * Response with circular reference (for JSON.stringify edge cases)
   */
  circularReference: (() => {
    const obj: any = { a: 1 };
    obj.self = obj; // Circular reference
    return obj;
  })(),
};

/**
 * Helper to create batch of malformed stories for testing resilience
 * 
 * @param count Number of stories to generate
 * @param corruptionRate Percentage (0-1) of stories that should be malformed
 * @returns Mixed array of valid and malformed stories
 */
export function createMalformedStoryBatch(count: number, corruptionRate: number = 0.3): Array<HNStory | Partial<HNStory>> {
  return Array.from({ length: count }, (_, i) => {
    const shouldCorrupt = Math.random() < corruptionRate;
    
    if (shouldCorrupt) {
      // Randomly choose what to corrupt
      const corruptionType = Math.floor(Math.random() * 4);
      switch (corruptionType) {
        case 0:
          return createMalformedHNStory({ missingTitle: true });
        case 1:
          return createMalformedHNStory({ invalidUrl: true });
        case 2:
          return createMalformedHNStory({ invalidTimestamp: true });
        default:
          return createMalformedHNStory({ missingId: true });
      }
    }
    
    return createMockHNStory({
      id: 10000 + i,
      title: `Test Story ${i + 1}`,
      score: 200 - (i * 10),
    });
  });
}

