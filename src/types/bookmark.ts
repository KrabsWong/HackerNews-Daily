/**
 * Bookmark Types
 * 
 * Type definitions for bookmark storage API.
 * Used by Chrome extension to save and query bookmarks.
 */

/**
 * Bookmark database row type
 */
export interface Bookmark {
  id: number;
  url: string;
  title: string;
  description: string | null;
  summary: string;
  summary_zh: string;
  created_at: number;  // Unix timestamp (milliseconds)
  updated_at: number;  // Unix timestamp (milliseconds)
}

/**
 * Bookmark tag database row type
 */
export interface BookmarkTag {
  id: number;
  bookmark_id: number;
  tag: string;
}

/**
 * Bookmark with tags (joined result)
 */
export interface BookmarkWithTags extends Bookmark {
  tags: string[];
}

/**
 * Request body for creating a bookmark
 */
export interface CreateBookmarkRequest {
  url: string;           // Required: article URL
  title: string;         // Required: article title
  description?: string;  // Optional: article description
  summary: string;       // Required: AI summary
  summary_zh: string;    // Required: Chinese translation summary
  tags: string[];        // Required: tags array (can be empty)
}

/**
 * Response for successful bookmark creation
 */
export interface CreateBookmarkResponse {
  success: true;
  data: {
    id: number;
    url: string;
    title: string;
    description: string | null;
    summary: string;
    summary_zh: string;
    tags: string[];
    created_at: number;
  };
}

/**
 * Response for bookmark query
 */
export interface BookmarkQueryResponse {
  success: true;
  data: BookmarkWithTags;
}

/**
 * Error codes for bookmark API
 */
export type BookmarkErrorCode = 
  | 'VALIDATION_ERROR'
  | 'DUPLICATE_URL'
  | 'NOT_FOUND'
  | 'DATABASE_ERROR';

/**
 * Error response for bookmark API
 */
export interface BookmarkErrorResponse {
  success: false;
  error: {
    code: BookmarkErrorCode;
    message: string;
    details?: string[];
    existing_id?: number;  // Only for DUPLICATE_URL
  };
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
}
