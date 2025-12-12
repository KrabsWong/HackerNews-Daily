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
 * LLM Provider type
 */
export type LLMProviderType = 'deepseek' | 'openrouter';

/**
 * DeepSeek AI API configuration
 */
export const DEEPSEEK_API = {
  /** Base URL for DeepSeek API */
  BASE_URL: 'https://api.deepseek.com/v1',
  /** Default model for DeepSeek */
  DEFAULT_MODEL: 'deepseek-chat',
  /** Request timeout in milliseconds (30 seconds for translation/summarization) */
  REQUEST_TIMEOUT: 30000,
  /** Delay before retry on rate limit (1 second) */
  RETRY_DELAY: 1000,
} as const;

/**
 * OpenRouter API configuration
 * OpenRouter provides access to hundreds of AI models through a single API
 */
export const OPENROUTER_API = {
  /** Base URL for OpenRouter API */
  BASE_URL: 'https://openrouter.ai/api/v1',
  /** Default model for OpenRouter (DeepSeek V3 via OpenRouter) */
  DEFAULT_MODEL: 'deepseek/deepseek-chat-v3-0324',
  /** Request timeout in milliseconds (30 seconds for translation/summarization) */
  REQUEST_TIMEOUT: 30000,
  /** Delay before retry on rate limit (1 second) */
  RETRY_DELAY: 1000,
  /** 
   * Get the configured model from environment or use default
   * Format: provider/model-name (e.g., 'deepseek/deepseek-chat-v3-0324')
   */
  get MODEL(): string {
    return process.env.OPENROUTER_MODEL || this.DEFAULT_MODEL;
  },
  /**
   * Optional site URL for OpenRouter leaderboard attribution
   */
  get SITE_URL(): string | undefined {
    return process.env.OPENROUTER_SITE_URL || undefined;
  },
  /**
   * Optional site name for OpenRouter leaderboard attribution
   */
  get SITE_NAME(): string | undefined {
    return process.env.OPENROUTER_SITE_NAME || undefined;
  },
};

/**
 * LLM Provider configuration
 * Determines which LLM provider to use for translation and summarization
 */
export const LLM_CONFIG = {
  /**
   * Get the configured LLM provider
   * Defaults to 'deepseek' for backward compatibility
   */
  get PROVIDER(): LLMProviderType {
    const provider = process.env.LLM_PROVIDER?.toLowerCase();
    if (provider === 'openrouter') {
      return 'openrouter';
    }
    if (provider && provider !== 'deepseek') {
      console.warn(`Invalid LLM_PROVIDER "${provider}", falling back to "deepseek"`);
    }
    return 'deepseek';
  },
};

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
  /** Maximum hits per page allowed by API (increased from 100 to 1000 for optimization) */
  MAX_HITS_PER_PAGE: 1000,
  /** Number of retry attempts for transient errors (5xx, network errors) */
  RETRIES: 3,
  /** Initial delay between retries in milliseconds (exponential backoff applied) */
  RETRY_DELAY: 1000,
} as const;

/**
 * Article fetcher configuration
 */
export const ARTICLE_FETCHER = {
  /** Request timeout in milliseconds (10 seconds - balanced for both speed and reliability) */
  REQUEST_TIMEOUT: 10000,
  /** User agent string for HTTP requests */
  USER_AGENT: 'Mozilla/5.0 (compatible; HackerNewsDaily/1.0)',
  /** 
   * Batch size for concurrent article fetching
   * Limits the number of articles fetched in parallel to avoid:
   * - Server rate limiting or connection issues
   * - Excessive memory usage from parallel JSDOM parsing
   * - Sudden traffic spikes to target servers
   * Recommended: 3-5 for balanced performance and politeness
   */
  BATCH_SIZE: 5,
} as const;

/**
 * Crawler API configuration for article content extraction
 * All article content is fetched via Crawler API for richer, more complete data
 */
export const CRAWLER_API = {
  /** 
   * Base URL for crawler API service (from CRAWLER_API_URL environment variable)
   * Returns undefined if not configured - content fetching will be disabled
   */
  get BASE_URL(): string | undefined {
    return process.env.CRAWLER_API_URL || undefined;
  },
  
  /**
   * Check if crawler API is enabled (i.e., BASE_URL is configured)
   */
  get ENABLED(): boolean {
    return !!this.BASE_URL;
  },
  
  /** 
   * Request timeout in milliseconds (10 seconds)
   * If the crawler can't complete within 10s, it's not worth waiting longer.
   * This applies to both the headless browser rendering and content extraction.
   */
  REQUEST_TIMEOUT: 10000,
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
  /** 
   * Maximum characters before truncation for AI summarization
   * Set to 0 or undefined to disable truncation (no limit)
   * Default: 0 (no limit)
   */
  MAX_CONTENT_LENGTH: 0,
  /** Maximum length for meta descriptions */
  MAX_DESCRIPTION_LENGTH: 200,
  /** Maximum length for combined comments before truncation */
  MAX_COMMENTS_LENGTH: 5000,
  /** Minimum number of comments required for summarization */
  MIN_COMMENTS_FOR_SUMMARY: 3,
} as const;

// =============================================================================
// LLM Batch Configuration
// =============================================================================

/**
 * LLM batch processing settings for translation and summarization
 * Since subrequest limits are no longer a concern, batch sizes can be more relaxed
 */
export const LLM_BATCH_CONFIG = {
  /** 
   * Default batch size for LLM operations
   * Set to 1 for single-request mode (one API call per item, best quality)
   * Set to 0 to process all items in a single batch (no splitting)
   * Set to N>1 for batch mode (N items per API call)
   */
  DEFAULT_BATCH_SIZE: 1,
  /** Minimum batch size (only applies when batch size > 0) */
  MIN_BATCH_SIZE: 5,
  /** 
   * Maximum batch size limit
   * Set to 0 for no limit (process all at once)
   */
  MAX_BATCH_SIZE: 0,
  /**
   * Maximum characters per article content in batch summarization
   * Set to 0 for no limit (use full content)
   * Higher values = richer content but larger API payloads
   */
  MAX_CONTENT_PER_ARTICLE: 0,
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
