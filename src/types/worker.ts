/**
 * Worker-specific type definitions
 * 
 * Centralized types for Cloudflare Worker environment and configuration
 */

/**
 * Worker environment variables
 * Defines the interface for Cloudflare Worker environment
 */
export interface WorkerEnv {
  // Required secrets
  GITHUB_TOKEN: string;
  LLM_PROVIDER: string;  // Validated as LLMProviderType at runtime
  TARGET_REPO: string;
  
  // Provider-specific API keys (one required based on LLM_PROVIDER)
  DEEPSEEK_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  
  // Optional configuration
  CRAWLER_API_URL?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_SITE_URL?: string;
  OPENROUTER_SITE_NAME?: string;
  
  // Configuration variables (with defaults in wrangler.toml)
  HN_STORY_LIMIT: string;
  HN_TIME_WINDOW_HOURS: string;
  SUMMARY_MAX_LENGTH: string;
  ENABLE_CONTENT_FILTER: string;
  CONTENT_FILTER_SENSITIVITY: string;
  CACHE_ENABLED: string;
  TARGET_BRANCH: string;
  LLM_BATCH_SIZE: string;
}
