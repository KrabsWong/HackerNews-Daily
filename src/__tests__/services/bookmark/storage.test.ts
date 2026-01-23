/**
 * Bookmark Storage Tests
 * 
 * Unit tests for BookmarkStorage service.
 * Uses mocked D1 database to test storage operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookmarkStorage } from '../../../services/bookmark/storage';
import type { Bookmark, CreateBookmarkRequest } from '../../../types/bookmark';

/**
 * Create a mock D1 database with configurable behavior
 */
function createMockD1({
  firstResult = null,
  allResults = [],
  batchResults = [],
  shouldThrow = false,
  throwError = new Error('Database error'),
}: {
  firstResult?: any;
  allResults?: any[];
  batchResults?: any[];
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

  const boundStatements: any[] = [];

  const mockPreparedStatement: any = {
    bind: vi.fn((..._args: any[]) => {
      const boundStatement = {
        first: vi.fn(async () => {
          if (shouldThrow) throw throwError;
          return firstResult;
        }),
        all: vi.fn(async () => {
          if (shouldThrow) throw throwError;
          return { results: allResults, success: true, meta: mockMeta };
        }),
        run: vi.fn(async () => {
          if (shouldThrow) throw throwError;
          return { results: [], success: true, meta: mockMeta };
        }),
        raw: vi.fn(async () => []),
      };
      boundStatements.push(boundStatement);
      return boundStatement;
    }),
    first: vi.fn(async () => {
      if (shouldThrow) throw throwError;
      return firstResult;
    }),
    all: vi.fn(async () => {
      if (shouldThrow) throw throwError;
      return { results: allResults, success: true, meta: mockMeta };
    }),
    run: vi.fn(async () => {
      if (shouldThrow) throw throwError;
      return { results: [], success: true, meta: mockMeta };
    }),
    raw: vi.fn(async () => []),
  };

  return {
    prepare: vi.fn(() => mockPreparedStatement),
    dump: vi.fn(async () => new ArrayBuffer(0)),
    batch: vi.fn(async (_statements: any[]) => {
      if (shouldThrow) throw throwError;
      return batchResults;
    }),
    exec: vi.fn(async (_query: string) => ({ count: 0, duration: 0 })),
    withSession: vi.fn(async (callback: any) => await callback({})),
    _mockPreparedStatement: mockPreparedStatement,
    _boundStatements: boundStatements,
  } as unknown as D1Database & {
    _mockPreparedStatement: any;
    _boundStatements: any[];
  };
}

describe('BookmarkStorage', () => {
  let storage: BookmarkStorage;
  let mockDb: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    mockDb = createMockD1();
    storage = new BookmarkStorage(mockDb as D1Database);
  });

  describe('createBookmark', () => {
    it('should create a bookmark without tags', async () => {
      const request: CreateBookmarkRequest = {
        url: 'https://example.com/article',
        title: 'Test Article',
        summary: 'Test summary',
        summary_zh: '测试摘要',
        tags: [],
      };

      const mockBookmark: Bookmark = {
        id: 1,
        url: request.url,
        title: request.title,
        description: null,
        summary: request.summary,
        summary_zh: request.summary_zh,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Update mock to return the bookmark on first()
      mockDb = createMockD1({ firstResult: mockBookmark });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.createBookmark(request);

      expect(result.id).toBe(1);
      expect(result.url).toBe(request.url);
      expect(result.title).toBe(request.title);
      expect(result.tags).toEqual([]);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('should create a bookmark with tags', async () => {
      const request: CreateBookmarkRequest = {
        url: 'https://example.com/article',
        title: 'Test Article',
        summary: 'Test summary',
        summary_zh: '测试摘要',
        tags: ['tech', 'ai', 'programming'],
      };

      const mockBookmark: Bookmark = {
        id: 1,
        url: request.url,
        title: request.title,
        description: null,
        summary: request.summary,
        summary_zh: request.summary_zh,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      mockDb = createMockD1({ firstResult: mockBookmark });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.createBookmark(request);

      expect(result.tags).toEqual(['tech', 'ai', 'programming']);
      // batch should be called once for tags
      expect(mockDb.batch).toHaveBeenCalledTimes(1);
    });

    it('should throw error if bookmark creation fails', async () => {
      const request: CreateBookmarkRequest = {
        url: 'https://example.com/article',
        title: 'Test Article',
        summary: 'Test summary',
        summary_zh: '测试摘要',
        tags: [],
      };

      // firstResult is null by default, which simulates failure
      mockDb = createMockD1({ firstResult: null });
      storage = new BookmarkStorage(mockDb as D1Database);

      await expect(storage.createBookmark(request)).rejects.toThrow('Failed to create bookmark');
    });

    it('should include description when provided', async () => {
      const request: CreateBookmarkRequest = {
        url: 'https://example.com/article',
        title: 'Test Article',
        description: 'A description',
        summary: 'Test summary',
        summary_zh: '测试摘要',
        tags: [],
      };

      const mockBookmark: Bookmark = {
        id: 1,
        url: request.url,
        title: request.title,
        description: request.description || null,
        summary: request.summary,
        summary_zh: request.summary_zh,
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      mockDb = createMockD1({ firstResult: mockBookmark });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.createBookmark(request);

      expect(result.description).toBe('A description');
    });
  });

  describe('getBookmarkByUrl', () => {
    it('should return bookmark when found', async () => {
      const mockBookmark: Bookmark = {
        id: 1,
        url: 'https://example.com/article',
        title: 'Test Article',
        description: null,
        summary: 'Test summary',
        summary_zh: '测试摘要',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      mockDb = createMockD1({ firstResult: mockBookmark });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.getBookmarkByUrl('https://example.com/article');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.url).toBe('https://example.com/article');
    });

    it('should return null when bookmark not found', async () => {
      mockDb = createMockD1({ firstResult: null });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.getBookmarkByUrl('https://example.com/not-found');

      expect(result).toBeNull();
    });
  });

  describe('getBookmarkWithTags', () => {
    it('should return bookmark with tags when found', async () => {
      const mockBookmark: Bookmark = {
        id: 1,
        url: 'https://example.com/article',
        title: 'Test Article',
        description: null,
        summary: 'Test summary',
        summary_zh: '测试摘要',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const mockTags = [{ tag: 'tech' }, { tag: 'ai' }];

      // Create mock that returns bookmark first, then tags
      const mockMeta = {
        duration: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: 0,
        last_row_id: 1,
        changed_db: true,
        changes: 1,
      };

      let callCount = 0;
      const mockPreparedStatement: any = {
        bind: vi.fn((..._args: any[]) => {
          const boundStatement = {
            first: vi.fn(async () => {
              callCount++;
              if (callCount === 1) return mockBookmark;
              return null;
            }),
            all: vi.fn(async () => {
              return { results: mockTags, success: true, meta: mockMeta };
            }),
            run: vi.fn(async () => ({ results: [], success: true, meta: mockMeta })),
            raw: vi.fn(async () => []),
          };
          return boundStatement;
        }),
      };

      const customMockDb = {
        prepare: vi.fn(() => mockPreparedStatement),
        batch: vi.fn(async () => []),
      } as unknown as D1Database;

      storage = new BookmarkStorage(customMockDb);

      const result = await storage.getBookmarkWithTags('https://example.com/article');

      expect(result).not.toBeNull();
      expect(result?.tags).toEqual(['tech', 'ai']);
    });

    it('should return null when bookmark not found', async () => {
      mockDb = createMockD1({ firstResult: null });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.getBookmarkWithTags('https://example.com/not-found');

      expect(result).toBeNull();
    });
  });

  describe('checkDuplicate', () => {
    it('should return existing id when duplicate found', async () => {
      mockDb = createMockD1({ firstResult: { id: 42 } });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.checkDuplicate('https://example.com/existing');

      expect(result).toBe(42);
    });

    it('should return null when no duplicate found', async () => {
      mockDb = createMockD1({ firstResult: null });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.checkDuplicate('https://example.com/new');

      expect(result).toBeNull();
    });
  });

  describe('getTagsByBookmarkId', () => {
    it('should return tags for a bookmark', async () => {
      const mockTags = [{ tag: 'tech' }, { tag: 'ai' }, { tag: 'news' }];

      mockDb = createMockD1({ allResults: mockTags });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.getTagsByBookmarkId(1);

      expect(result).toEqual(['tech', 'ai', 'news']);
    });

    it('should return empty array when no tags found', async () => {
      mockDb = createMockD1({ allResults: [] });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.getTagsByBookmarkId(1);

      expect(result).toEqual([]);
    });
  });

  describe('healthCheck', () => {
    it('should return true when database is accessible', async () => {
      mockDb = createMockD1({ firstResult: 1 });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when database throws error', async () => {
      mockDb = createMockD1({ shouldThrow: true });
      storage = new BookmarkStorage(mockDb as D1Database);

      const result = await storage.healthCheck();

      expect(result).toBe(false);
    });
  });
});
