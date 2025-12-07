/**
 * Centralized configuration constants for HackerNews Daily
 * All magic numbers and configuration values are defined here for easy management
 */

// =============================================================================
// API Configuration
// =============================================================================

/**
 * HackerNews Firebase API configuration
 */
export const HN_API = {
  /** Base URL for HackerNews API */
  BASE_URL: 'https://hacker-news.firebaseio.com/v0',
  /** Request timeout in milliseconds (10 seconds) */
  REQUEST_TIMEOUT: 10000,
} as const;

/**
 * DeepSeek AI API configuration
 */
export const DEEPSEEK_API = {
  /** Base URL for DeepSeek API */
  BASE_URL: 'https://api.deepseek.com/v1',
  /** Request timeout in milliseconds (30 seconds for translation/summarization) */
  REQUEST_TIMEOUT: 30000,
  /** Delay before retry on rate limit (1 second) */
  RETRY_DELAY: 1000,
} as const;

/**
 * Algolia HackerNews Search API configuration
 */
export const ALGOLIA_HN_API = {
  /** Base URL for Algolia HN Search API */
  BASE_URL: 'https://hn.algolia.com/api/v1',
  /** Request timeout in milliseconds (10 seconds) */
  REQUEST_TIMEOUT: 10000,
  /** Default number of results per page */
  DEFAULT_HITS_PER_PAGE: 30,
  /** Maximum hits per page allowed by API */
  MAX_HITS_PER_PAGE: 100,
} as const;

/**
 * Article fetcher configuration
 */
export const ARTICLE_FETCHER = {
  /** Request timeout in milliseconds (5 seconds) */
  REQUEST_TIMEOUT: 5000,
  /** User agent string for HTTP requests */
  USER_AGENT: 'Mozilla/5.0 (compatible; HackerNewsDaily/1.0)',
} as const;

// =============================================================================
// Story Limits
// =============================================================================

/**
 * Story count limits and thresholds
 */
export const STORY_LIMITS = {
  /** Maximum number of stories to process (prevents performance issues) */
  MAX_STORY_LIMIT: 30,
  /** Threshold at which to warn users their limit will be capped */
  WARN_THRESHOLD: 50,
  /** Absolute maximum stories to fetch from API */
  MAX_FETCH_LIMIT: 100,
  /** Default number of comments to fetch per story */
  DEFAULT_COMMENT_LIMIT: 10,
} as const;

// =============================================================================
// Summary Configuration
// =============================================================================

/**
 * Summary length constraints
 */
export const SUMMARY_CONFIG = {
  /** Default summary length in characters */
  DEFAULT_LENGTH: 300,
  /** Minimum allowed summary length */
  MIN_LENGTH: 100,
  /** Maximum allowed summary length */
  MAX_LENGTH: 500,
} as const;

// =============================================================================
// Content Configuration
// =============================================================================

/**
 * Article content extraction settings
 */
export const CONTENT_CONFIG = {
  /** Maximum characters before truncation for AI summarization */
  MAX_CONTENT_LENGTH: 4000,
  /** Maximum length for meta descriptions */
  MAX_DESCRIPTION_LENGTH: 200,
  /** Maximum length for combined comments before truncation */
  MAX_COMMENTS_LENGTH: 5000,
  /** Minimum number of comments required for summarization */
  MIN_COMMENTS_FOR_SUMMARY: 3,
} as const;

// =============================================================================
// Cache Configuration
// =============================================================================

/**
 * Local cache settings
 */
export const CACHE_CONFIG = {
  /** Default cache TTL in minutes */
  DEFAULT_TTL_MINUTES: 30,
  /** Cache directory name (relative to project root) */
  CACHE_DIR: '.cache',
  /** Cache file name */
  CACHE_FILE: 'stories.json',
} as const;

// =============================================================================
// Server Configuration
// =============================================================================

/**
 * Web server settings
 */
export const SERVER_CONFIG = {
  /** Default port for web server */
  DEFAULT_PORT: 3000,
  /** Timeout for graceful shutdown in milliseconds */
  SHUTDOWN_TIMEOUT: 5000,
} as const;

// =============================================================================
// Content Filter Configuration
// =============================================================================

/**
 * Sensitivity level for content filtering
 */
export type SensitivityLevel = 'low' | 'medium' | 'high';

/**
 * Content filter settings for AI-based sensitive content filtering
 * Uses getters to read environment variables at runtime (after dotenv.config())
 */
export const CONTENT_FILTER = {
  /** Enable/disable content filtering (default: false for backward compatibility) */
  get ENABLED(): boolean {
    return process.env.ENABLE_CONTENT_FILTER === 'true';
  },
  
  /** Sensitivity level for content classification (low, medium, high) */
  get SENSITIVITY(): SensitivityLevel {
    return (process.env.CONTENT_FILTER_SENSITIVITY || 'medium') as SensitivityLevel;
  },
  
  /** Timeout for AI classification requests in milliseconds (15 seconds) */
  TIMEOUT: 15000,
  
  /** Fallback behavior on error - if true, allow stories through when filter fails (fail-open) */
  FALLBACK_ON_ERROR: true,
};

// =============================================================================
// Default Environment Values
// =============================================================================

/**
 * Default values for environment variables
 */
export const ENV_DEFAULTS = {
  /** Default story limit if not specified */
  HN_STORY_LIMIT: 30,
  /** Default time window in hours */
  HN_TIME_WINDOW_HOURS: 24,
  /** Default summary max length */
  SUMMARY_MAX_LENGTH: 300,
  /** Default cache TTL in minutes */
  CACHE_TTL_MINUTES: 30,
  /** Default cache enabled state */
  CACHE_ENABLED: true,
} as const;
