/**
 * Centralized Type Exports (DEPRECATED)
 * 
 * NOTE: This barrel file is deprecated. Import types directly from their source files:
 * 
 * Instead of: import { HNStory } from '@/types';
 * Use: import { HNStory } from '@/types/api';
 * 
 * This file is kept for backward compatibility but new code should not use it.
 */

// Error types (simplified)
export {
  AppError,
  APIError,
  ServiceError,
  LLMError,
  NetworkError,
  isAppError,
  isAPIError,
  isServiceError,
  isNetworkError,
  isRetryableError,
  toAppError,
} from './errors';
