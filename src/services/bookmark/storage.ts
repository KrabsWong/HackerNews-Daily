/**
 * Bookmark Storage Service
 * 
 * Provides CRUD operations for bookmark storage:
 * - Create bookmark with tags (atomic batch operation)
 * - Query bookmark by URL
 * - Check for duplicate URLs
 */

import type {
  Bookmark,
  BookmarkTag,
  BookmarkWithTags,
  CreateBookmarkRequest,
} from '../../types/bookmark';

export class BookmarkStorage {
  constructor(private db: D1Database) {}

  /**
   * Create a new bookmark with tags (atomic operation)
   * @throws Error if URL already exists (check with getBookmarkByUrl first)
   */
  async createBookmark(request: CreateBookmarkRequest): Promise<BookmarkWithTags> {
    const now = Date.now();
    
    // First, insert the bookmark
    const bookmarkStmt = this.db.prepare(
      `INSERT INTO bookmarks (url, title, description, summary, summary_zh, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    );
    
    const bookmarkResult = await bookmarkStmt.bind(
      request.url,
      request.title,
      request.description ?? null,
      request.summary,
      request.summary_zh,
      now,
      now
    ).first<Bookmark>();
    
    if (!bookmarkResult) {
      throw new Error('Failed to create bookmark');
    }
    
    // Insert tags if any
    if (request.tags.length > 0) {
      const tagStatements = request.tags.map(tag =>
        this.db.prepare(
          `INSERT INTO bookmark_tags (bookmark_id, tag) VALUES (?, ?)`
        ).bind(bookmarkResult.id, tag)
      );
      
      await this.db.batch(tagStatements);
    }
    
    return {
      ...bookmarkResult,
      tags: request.tags,
    };
  }

  /**
   * Get a bookmark by URL (without tags)
   * Used for duplicate checking
   */
  async getBookmarkByUrl(url: string): Promise<Bookmark | null> {
    const result = await this.db
      .prepare('SELECT * FROM bookmarks WHERE url = ?')
      .bind(url)
      .first<Bookmark>();
    
    return result ?? null;
  }

  /**
   * Get a bookmark by URL with all tags
   * Used for the GET /api/bookmarks endpoint
   */
  async getBookmarkWithTags(url: string): Promise<BookmarkWithTags | null> {
    // Get the bookmark
    const bookmark = await this.getBookmarkByUrl(url);
    if (!bookmark) {
      return null;
    }
    
    // Get associated tags
    const tagsResult = await this.db
      .prepare('SELECT tag FROM bookmark_tags WHERE bookmark_id = ?')
      .bind(bookmark.id)
      .all<{ tag: string }>();
    
    const tags = tagsResult.results?.map(row => row.tag) ?? [];
    
    return {
      ...bookmark,
      tags,
    };
  }

  /**
   * Check if a bookmark with the given URL already exists
   * Returns the existing bookmark id if found, null otherwise
   */
  async checkDuplicate(url: string): Promise<number | null> {
    const result = await this.db
      .prepare('SELECT id FROM bookmarks WHERE url = ?')
      .bind(url)
      .first<{ id: number }>();
    
    return result?.id ?? null;
  }

  /**
   * Get all tags for a bookmark by bookmark ID
   */
  async getTagsByBookmarkId(bookmarkId: number): Promise<string[]> {
    const result = await this.db
      .prepare('SELECT tag FROM bookmark_tags WHERE bookmark_id = ?')
      .bind(bookmarkId)
      .all<{ tag: string }>();
    
    return result.results?.map(row => row.tag) ?? [];
  }

  /**
   * Health check for database connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.prepare('SELECT 1').first();
      return true;
    } catch (error) {
      console.error('Bookmark storage health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create BookmarkStorage instance
 */
export function createBookmarkStorage(db: D1Database): BookmarkStorage {
  return new BookmarkStorage(db);
}
