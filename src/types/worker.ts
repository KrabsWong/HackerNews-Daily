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
  // REQUIRED: Secrets (set via wrangler secret put)
  GITHUB_TOKEN: string;
  LLM_PROVIDER: string;  // Will be validated as LLMProviderType
  TARGET_REPO: string;
  
  // Provider-specific API keys (one required based on LLM_PROVIDER)
  LLM_DEEPSEEK_API_KEY?: string;
  LLM_OPENROUTER_API_KEY?: string;
  
  // Optional LLM configuration
  LLM_DEEPSEEK_MODEL?: string;
  LLM_OPENROUTER_MODEL?: string;
  LLM_OPENROUTER_SITE_URL?: string;
  LLM_OPENROUTER_SITE_NAME?: string;
  
  // Optional configuration
  CRAWLER_API_URL?: string;
  
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
