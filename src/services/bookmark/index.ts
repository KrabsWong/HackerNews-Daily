/**
 * Bookmark Service
 * 
 * Exports all bookmark-related functionality:
 * - BookmarkStorage: D1 database operations
 * - Validation: Request validation utilities
 */

export { BookmarkStorage, createBookmarkStorage } from './storage';
export { 
  validateCreateBookmarkRequest, 
  validateUrlQueryParam,
  type ValidationResult,
} from './validation';
