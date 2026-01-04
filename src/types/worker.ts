/**
 * Worker-specific type definitions
 * 
 * Centralized types for Cloudflare Worker environment and configuration
 */

/**
 * Environment variables and secrets available to the Worker
 * Configured via wrangler.toml and Cloudflare secrets
 * 
 * This is the canonical type definition - worker/index.ts should import from here
 * All LLM-related environment variables use the LLM_ prefix
 */
export interface Env {
  // D1 Database binding (required for distributed task processing)
  DB: D1Database;                 // D1 database binding
  
  // Distributed task processing configuration
  TASK_BATCH_SIZE?: string;       // Number of articles per batch (default: 6)
  MAX_RETRY_COUNT?: string;       // Maximum retry attempts for failed articles (default: 3)
  
  // GitHub publisher configuration (optional, enabled by default)
  GITHUB_ENABLED?: string;        // "false" to disable GitHub publishing (default: "true")
  GITHUB_TOKEN?: string;          // Required if GITHUB_ENABLED is not "false"
  TARGET_REPO?: string;           // Required if GITHUB_ENABLED is not "false"
  
  // LLM configuration (required)
  LLM_PROVIDER: string;  // Will be validated as LLMProviderType
  
  // Provider-specific API keys (one required based on LLM_PROVIDER)
  LLM_DEEPSEEK_API_KEY?: string;
  LLM_OPENROUTER_API_KEY?: string;
  LLM_ZHIPU_API_KEY?: string;
  
  // Optional LLM configuration
  LLM_DEEPSEEK_MODEL?: string;
  LLM_OPENROUTER_MODEL?: string;
  LLM_ZHIPU_MODEL?: string;
  LLM_OPENROUTER_SITE_URL?: string;
  LLM_OPENROUTER_SITE_NAME?: string;
  
  // Optional configuration
  CRAWLER_API_URL?: string;
  LOCAL_TEST_MODE?: string;       // "true" to output to terminal instead of publishing

  // Telegram publisher configuration (optional)
  TELEGRAM_ENABLED?: string;      // "true" to enable Telegram publishing
  TELEGRAM_BOT_TOKEN?: string;    // Bot token from @BotFather
  TELEGRAM_CHANNEL_ID?: string;   // Channel ID (@channel_name or -100xxx)
  
  // Configuration variables (set in wrangler.toml)
  HN_STORY_LIMIT: string;
  HN_TIME_WINDOW_HOURS: string;
  SUMMARY_MAX_LENGTH: string;
  ENABLE_CONTENT_FILTER: string;
  CONTENT_FILTER_SENSITIVITY: string;
  CACHE_ENABLED: string;
  TARGET_BRANCH: string;
  LLM_BATCH_SIZE: string;
}

/**
 * @deprecated Use Env instead. WorkerEnv is kept for backward compatibility.
 */
export type WorkerEnv = Env;
