/**
 * Cache-related type definitions
 * 
 * Types for the local file caching system
 */

/**
 * Configuration used to generate cache
 * Used to invalidate cache when config changes
 */
export interface CacheConfig {
  storyLimit: number;
  timeWindowHours: number;
  summaryMaxLength: number;
  contentFilterEnabled: boolean;
  contentFilterSensitivity: string;
}

/**
 * Structure of processed story data (matches ProcessedStory)
 */
export interface CachedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
  timestamp: number; // Unix timestamp for filtering and sorting
  description: string;
  commentSummary: string | null;
}

/**
 * Cache file structure
 */
export interface CacheData {
  /** Unix timestamp when cache was created */
  timestamp: number;
  /** Configuration used to generate this cache */
  config: CacheConfig;
  /** The cached processed stories */
  stories: CachedStory[];
}

/**
 * Result of cache check
 */
export interface CacheResult {
  /** Whether cache was hit */
  hit: boolean;
  /** Cached stories if hit, null otherwise */
  stories: CachedStory[] | null;
  /** Reason for cache miss (if any) */
  reason?: string;
}
