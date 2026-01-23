/**
 * Bookmark API Routes Tests
 * 
 * Unit tests for bookmark API endpoints:
 * - POST /api/bookmarks (create bookmark)
 * - GET /api/bookmarks?url=<url> (query bookmark)
 * - OPTIONS /api/bookmarks (CORS preflight)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter } from '../../../worker/routes/index';
import type { Env } from '../../../types/worker';
import type { 
  CreateBookmarkResponse, 
  BookmarkQueryResponse, 
  BookmarkErrorResponse 
} from '../../../types/bookmark';

/**
 * Create a mock D1 database with configurable behavior for bookmark tests
 */
function createMockD1ForBookmarks({
  existingBookmark = null,
  createdBookmark = null,
  tags = [] as string[],
  shouldThrow = false,
  throwError = new Error('Database error'),
}: {
  existingBookmark?: any;
  createdBookmark?: any;
  tags?: string[];
  shouldThrow?: boolean;
  throwError?: Error;
} = {}) {
  const mockMeta = {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: 0,
    last_row_id: 1,
    changed_db: true,
    changes: 1,
  };

  let queryCount = 0;

  const mockPreparedStatement: any = {
    bind: vi.fn((..._args: any[]) => {
      const boundStatement = {
        first: vi.fn(async () => {
          if (shouldThrow) throw throwError;
          queryCount++;
          // First query is usually for duplicate check or bookmark fetch
          if (queryCount === 1) {
            return existingBookmark;
          }
          // Second query is for creating (returns createdBookmark)
          if (queryCount === 2 && createdBookmark) {
            return createdBookmark;
          }
          // Subsequent queries for tags fetch
          return existingBookmark;
        }),
        all: vi.fn(async () => {
          if (shouldThrow) throw throwError;
          return { 
            results: tags.map(t => ({ tag: t })), 
            success: true, 
            meta: mockMeta 
          };
        }),
        run: vi.fn(async () => {
          if (shouldThrow) throw throwError;
          return { results: [], success: true, meta: mockMeta };
        }),
        raw: vi.fn(async () => []),
      };
      return boundStatement;
    }),
  };

  return {
    prepare: vi.fn(() => mockPreparedStatement),
    batch: vi.fn(async (_statements: any[]) => {
      if (shouldThrow) throw throwError;
      return [];
    }),
    dump: vi.fn(async () => new ArrayBuffer(0)),
    exec: vi.fn(async () => ({ count: 0, duration: 0 })),
    withSession: vi.fn(async (callback: any) => await callback({})),
  } as unknown as D1Database;
}

describe('Bookmark API Routes', () => {
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create base mock env without DB (will be set per test)
    mockEnv = {
      DB: undefined as unknown as D1Database,
      LLM_PROVIDER: 'deepseek',
      LLM_DEEPSEEK_API_KEY: 'test-key',
      HN_STORY_LIMIT: '30',
      HN_TIME_WINDOW_HOURS: '24',
      SUMMARY_MAX_LENGTH: '300',
      ENABLE_CONTENT_FILTER: 'false',
      CONTENT_FILTER_SENSITIVITY: 'medium',
      CACHE_ENABLED: 'true',
      TARGET_BRANCH: 'main',
      LLM_BATCH_SIZE: '10',
    } as unknown as Env;
  });

  describe('OPTIONS /api/bookmarks (CORS preflight)', () => {
    it('should return 204 with CORS headers', async () => {
      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'OPTIONS',
      });

      const response = await router.handle(request, mockEnv);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    });
  });

  describe('POST /api/bookmarks', () => {
    it('should create bookmark successfully', async () => {
      const now = Date.now();
      const mockBookmark = {
        id: 1,
        url: 'https://example.com/article',
        title: 'Test Article',
        description: null,
        summary: 'Test summary',
        summary_zh: '测试摘要',
        created_at: now,
        updated_at: now,
      };

      mockEnv.DB = createMockD1ForBookmarks({
        existingBookmark: null, // No duplicate
        createdBookmark: mockBookmark,
      });

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com/article',
          title: 'Test Article',
          summary: 'Test summary',
          summary_zh: '测试摘要',
          tags: ['tech', 'ai'],
        }),
      });

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as CreateBookmarkResponse;

      expect(response.status).toBe(201);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(1);
      expect(data.data.url).toBe('https://example.com/article');
      expect(data.data.tags).toEqual(['tech', 'ai']);
    });

    it('should return 400 for invalid JSON', async () => {
      mockEnv.DB = createMockD1ForBookmarks();

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('Invalid JSON');
    });

    it('should return 400 for missing required fields', async () => {
      mockEnv.DB = createMockD1ForBookmarks();

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com/article',
          // Missing: title, summary, summary_zh, tags
        }),
      });

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.details).toBeDefined();
      expect(data.error.details!.length).toBeGreaterThan(0);
    });

    it('should return 400 for invalid URL format', async () => {
      mockEnv.DB = createMockD1ForBookmarks();

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'not-a-valid-url',
          title: 'Test',
          summary: 'Summary',
          summary_zh: '摘要',
          tags: [],
        }),
      });

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate URL', async () => {
      mockEnv.DB = createMockD1ForBookmarks({
        existingBookmark: { id: 42 }, // Duplicate exists
      });

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com/existing-article',
          title: 'Test Article',
          summary: 'Test summary',
          summary_zh: '测试摘要',
          tags: [],
        }),
      });

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_URL');
      expect(data.error.existing_id).toBe(42);
    });

    it('should return 500 when database is not configured', async () => {
      // DB is undefined
      mockEnv.DB = undefined as unknown as D1Database;

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com/article',
          title: 'Test',
          summary: 'Summary',
          summary_zh: '摘要',
          tags: [],
        }),
      });

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 for database errors', async () => {
      mockEnv.DB = createMockD1ForBookmarks({
        shouldThrow: true,
        throwError: new Error('Connection failed'),
      });

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com/article',
          title: 'Test',
          summary: 'Summary',
          summary_zh: '摘要',
          tags: [],
        }),
      });

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('GET /api/bookmarks', () => {
    it('should return bookmark when found', async () => {
      const now = Date.now();
      const mockBookmark = {
        id: 1,
        url: 'https://example.com/article',
        title: 'Test Article',
        description: 'A description',
        summary: 'Test summary',
        summary_zh: '测试摘要',
        created_at: now,
        updated_at: now,
      };

      mockEnv.DB = createMockD1ForBookmarks({
        existingBookmark: mockBookmark,
        tags: ['tech', 'ai'],
      });

      const router = createRouter();
      const request = new Request(
        'https://example.com/api/bookmarks?url=' + encodeURIComponent('https://example.com/article'),
        { method: 'GET' }
      );

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkQueryResponse;

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(1);
      expect(data.data.url).toBe('https://example.com/article');
      expect(data.data.tags).toEqual(['tech', 'ai']);
    });

    it('should return 404 when bookmark not found', async () => {
      mockEnv.DB = createMockD1ForBookmarks({
        existingBookmark: null, // Not found
      });

      const router = createRouter();
      const request = new Request(
        'https://example.com/api/bookmarks?url=' + encodeURIComponent('https://example.com/not-found'),
        { method: 'GET' }
      );

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 when url parameter is missing', async () => {
      mockEnv.DB = createMockD1ForBookmarks();

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'GET',
      });

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('url query parameter is required');
    });

    it('should return 400 for invalid URL parameter', async () => {
      mockEnv.DB = createMockD1ForBookmarks();

      const router = createRouter();
      const request = new Request(
        'https://example.com/api/bookmarks?url=not-a-valid-url',
        { method: 'GET' }
      );

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 when database is not configured', async () => {
      mockEnv.DB = undefined as unknown as D1Database;

      const router = createRouter();
      const request = new Request(
        'https://example.com/api/bookmarks?url=' + encodeURIComponent('https://example.com/article'),
        { method: 'GET' }
      );

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });

    it('should return 500 for database errors', async () => {
      mockEnv.DB = createMockD1ForBookmarks({
        shouldThrow: true,
      });

      const router = createRouter();
      const request = new Request(
        'https://example.com/api/bookmarks?url=' + encodeURIComponent('https://example.com/article'),
        { method: 'GET' }
      );

      const response = await router.handle(request, mockEnv);
      const data = await response.json() as BookmarkErrorResponse;

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('DATABASE_ERROR');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in POST response', async () => {
      const now = Date.now();
      mockEnv.DB = createMockD1ForBookmarks({
        existingBookmark: null,
        createdBookmark: {
          id: 1,
          url: 'https://example.com/article',
          title: 'Test',
          description: null,
          summary: 'Summary',
          summary_zh: '摘要',
          created_at: now,
          updated_at: now,
        },
      });

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com/article',
          title: 'Test',
          summary: 'Summary',
          summary_zh: '摘要',
          tags: [],
        }),
      });

      const response = await router.handle(request, mockEnv);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should include CORS headers in GET response', async () => {
      mockEnv.DB = createMockD1ForBookmarks({
        existingBookmark: {
          id: 1,
          url: 'https://example.com/article',
          title: 'Test',
          description: null,
          summary: 'Summary',
          summary_zh: '摘要',
          created_at: Date.now(),
          updated_at: Date.now(),
        },
        tags: [],
      });

      const router = createRouter();
      const request = new Request(
        'https://example.com/api/bookmarks?url=' + encodeURIComponent('https://example.com/article'),
        { method: 'GET' }
      );

      const response = await router.handle(request, mockEnv);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should include CORS headers in error responses', async () => {
      mockEnv.DB = createMockD1ForBookmarks();

      const router = createRouter();
      const request = new Request('https://example.com/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Invalid request
      });

      const response = await router.handle(request, mockEnv);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
