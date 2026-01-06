/**
 * Configuration Schema
 * Centralized configuration interface and type definitions
 */

import type { Env } from '../types/worker';
import { LLMProviderType } from './constants';

/**
 * LLM Provider Configuration
 */
export interface LLMConfig {
  /** Provider type (deepseek, openrouter, zhipu) */
  provider: LLMProviderType;
  /** DeepSeek API key */
  deepSeekApiKey?: string;
  /** OpenRouter API key */
  openRouterApiKey?: string;
  /** Zhipu API key */
  zhipuApiKey?: string;
  /** DeepSeek model name */
  deepSeekModel?: string;
  /** OpenRouter model name */
  openRouterModel?: string;
  /** Zhipu model name */
  zhipuModel?: string;
  /** OpenRouter site URL for leaderboard attribution */
  openRouterSiteUrl?: string;
  /** OpenRouter site name for leaderboard attribution */
  openRouterSiteName?: string;
}

/**
 * HackerNews Configuration
 */
export interface HNConfig {
  /** Maximum number of stories to process */
  storyLimit: number;
  /** Time window in hours */
  timeWindowHours: number;
}

/**
 * Summary Configuration
 */
export interface SummaryConfig {
  /** Maximum summary length */
  maxLength: number;
}

/**
 * Task Configuration
 */
export interface TaskConfig {
  /** Batch size for article processing */
  batchSize: number;
  /** Maximum retry count */
  maxRetries: number;
}

/**
 * Cache Configuration
 */
export interface CacheConfig {
  /** Whether cache is enabled */
  enabled: boolean;
  /** Cache TTL in minutes */
  ttlMinutes: number;
}

/**
 * Content Filter Configuration
 */
export interface ContentFilterConfig {
  /** Whether content filter is enabled */
  enabled: boolean;
  /** Sensitivity level (low, medium, high) */
  sensitivity: 'low' | 'medium' | 'high';
  /** Timeout in milliseconds */
  timeout: number;
  /** Fallback behavior on error */
  fallbackOnError: boolean;
}

/**
 * LLM Batch Configuration
 */
export interface LLMBatchConfig {
  /** Default batch size */
  batchSize: number;
  /** Minimum batch size */
  minBatchSize: number;
  /** Maximum batch size */
  maxBatchSize: number;
  /** Maximum content per article */
  maxContentPerArticle: number;
  /** Default concurrency */
  defaultConcurrency: number;
}

/**
 * GitHub Publisher Configuration
 */
export interface GitHubConfig {
  /** Whether GitHub publishing is enabled */
  enabled: boolean;
  /** GitHub token */
  token?: string;
  /** Target repository (owner/repo) */
  targetRepo?: string;
  /** Target branch */
  targetBranch: string;
}

/**
 * Telegram Publisher Configuration
 */
export interface TelegramConfig {
  /** Whether Telegram publishing is enabled */
  enabled: boolean;
  /** Bot token */
  botToken?: string;
  /** Channel ID */
  channelId?: string;
  /** Batch size for message merging */
  batchSize: number;
  /** Delay between messages in milliseconds */
  messageDelay: number;
}

/**
 * Crawler API Configuration
 */
export interface CrawlerConfig {
  /** Crawler API endpoint URL */
  apiUrl?: string;
  /** Crawler API authentication token */
  apiToken?: string;
  /** Whether crawler is enabled */
  enabled: boolean;
}

/**
 * Test Mode Configuration
 */
export interface TestModeConfig {
  /** Whether local test mode is enabled */
  enabled: boolean;
}

/**
 * Complete Application Configuration
 * This is the main configuration interface used throughout the application
 */
export interface AppConfig {
  /** LLM provider configuration */
  llm: LLMConfig;
  /** HackerNews configuration */
  hn: HNConfig;
  /** Summary configuration */
  summary: SummaryConfig;
  /** Task configuration */
  task: TaskConfig;
  /** Cache configuration */
  cache: CacheConfig;
  /** Content filter configuration */
  contentFilter: ContentFilterConfig;
  /** LLM batch configuration */
  llmBatch: LLMBatchConfig;
  /** GitHub publisher configuration */
  github: GitHubConfig;
  /** Telegram publisher configuration */
  telegram: TelegramConfig;
  /** Crawler API configuration */
  crawler: CrawlerConfig;
  /** Test mode configuration */
  testMode: TestModeConfig;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error messages */
  errors: string[];
  /** Warning messages */
  warnings: string[];
}
