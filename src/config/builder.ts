/**
 * Configuration Builder
 * Builds configuration from environment variables
 */

import type { Env } from '../types/worker';
import type { AppConfig } from './schema';
import {
  getDeepSeekModel,
  getOpenRouterModel,
  getOpenRouterSiteUrl,
  getOpenRouterSiteName,
  getZhipuModel,
  getLLMProvider,
  ENV_DEFAULTS,
  TASK_CONFIG,
  CONTENT_FILTER_CONSTANTS,
  TELEGRAM_BATCH_CONFIG,
  LLM_BATCH_CONFIG,
} from './constants';

/**
 * Build LLM configuration from environment
 */
function buildLLMConfig(env: Env): AppConfig['llm'] {
  const provider = getLLMProvider(env);

  return {
    provider,
    deepSeekApiKey: env.LLM_DEEPSEEK_API_KEY,
    openRouterApiKey: env.LLM_OPENROUTER_API_KEY,
    zhipuApiKey: env.LLM_ZHIPU_API_KEY,
    deepSeekModel: getDeepSeekModel(env),
    openRouterModel: getOpenRouterModel(env),
    zhipuModel: getZhipuModel(env),
    openRouterSiteUrl: getOpenRouterSiteUrl(env),
    openRouterSiteName: getOpenRouterSiteName(env),
  };
}

/**
 * Build HackerNews configuration from environment
 */
function buildHNConfig(env: Env): AppConfig['hn'] {
  return {
    storyLimit: parseInt(env.HN_STORY_LIMIT || String(ENV_DEFAULTS.HN_STORY_LIMIT), 10),
    timeWindowHours: parseInt(env.HN_TIME_WINDOW_HOURS || String(ENV_DEFAULTS.HN_TIME_WINDOW_HOURS), 10),
  };
}

/**
 * Build summary configuration from environment
 */
function buildSummaryConfig(env: Env): AppConfig['summary'] {
  return {
    maxLength: parseInt(env.SUMMARY_MAX_LENGTH || String(ENV_DEFAULTS.SUMMARY_MAX_LENGTH), 10),
  };
}

/**
 * Build task configuration from environment
 */
function buildTaskConfig(env: Env): AppConfig['task'] {
  return {
    batchSize: env.TASK_BATCH_SIZE ? parseInt(env.TASK_BATCH_SIZE, 10) : TASK_CONFIG.DEFAULT_BATCH_SIZE,
    maxRetries: env.MAX_RETRY_COUNT ? parseInt(env.MAX_RETRY_COUNT, 10) : TASK_CONFIG.DEFAULT_MAX_RETRIES,
  };
}

/**
 * Build cache configuration from environment
 */
function buildCacheConfig(env: Env): AppConfig['cache'] {
  const enabled = env.CACHE_ENABLED !== 'false';
  return {
    enabled,
    ttlMinutes: parseInt(env.CACHE_TTL_MINUTES || String(ENV_DEFAULTS.CACHE_TTL_MINUTES), 10),
  };
}

/**
 * Build content filter configuration from environment
 */
function buildContentFilterConfig(env: Env): AppConfig['contentFilter'] {
  const enabled = env.ENABLE_CONTENT_FILTER === 'true';
  return {
    enabled,
    sensitivity: (env.CONTENT_FILTER_SENSITIVITY || 'medium') as 'low' | 'medium' | 'high',
    timeout: CONTENT_FILTER_CONSTANTS.TIMEOUT,
    fallbackOnError: CONTENT_FILTER_CONSTANTS.FALLBACK_ON_ERROR,
  };
}

/**
 * Build LLM batch configuration from environment
 */
function buildLLMBatchConfig(env: Env): AppConfig['llmBatch'] {
  const batchSize = env.LLM_BATCH_SIZE ? parseInt(env.LLM_BATCH_SIZE, 10) : LLM_BATCH_CONFIG.DEFAULT_BATCH_SIZE;
  return {
    batchSize,
    minBatchSize: LLM_BATCH_CONFIG.MIN_BATCH_SIZE,
    maxBatchSize: LLM_BATCH_CONFIG.MAX_BATCH_SIZE,
    maxContentPerArticle: LLM_BATCH_CONFIG.MAX_CONTENT_PER_ARTICLE,
    defaultConcurrency: LLM_BATCH_CONFIG.DEFAULT_CONCURRENCY,
  };
}

/**
 * Build GitHub publisher configuration from environment
 */
function buildGitHubConfig(env: Env): AppConfig['github'] {
  return {
    enabled: env.GITHUB_ENABLED?.toLowerCase() !== 'false',
    token: env.GITHUB_TOKEN,
    targetRepo: env.TARGET_REPO,
    targetBranch: env.TARGET_BRANCH || 'main',
  };
}

/**
 * Build Telegram publisher configuration from environment
 */
function buildTelegramConfig(env: Env): AppConfig['telegram'] {
  return {
    enabled: env.TELEGRAM_ENABLED?.toLowerCase() === 'true',
    botToken: env.TELEGRAM_BOT_TOKEN,
    channelId: env.TELEGRAM_CHANNEL_ID,
    batchSize: TELEGRAM_BATCH_CONFIG.DEFAULT_BATCH_SIZE,
    messageDelay: TELEGRAM_BATCH_CONFIG.MESSAGE_DELAY,
  };
}

/**
 * Build crawler API configuration from environment
 */
function buildCrawlerConfig(env: Env): AppConfig['crawler'] {
  return {
    apiUrl: env.CRAWLER_API_URL,
    apiToken: env.CRAWLER_API_TOKEN,
    enabled: !!env.CRAWLER_API_URL,
  };
}

/**
 * Build test mode configuration from environment
 */
function buildTestModeConfig(env: Env): AppConfig['testMode'] {
  return {
    enabled: env.LOCAL_TEST_MODE === 'true',
  };
}

/**
 * Build complete configuration from environment
 * This is the main entry point for configuration building
 */
export function buildConfig(env: Env): AppConfig {
  return {
    llm: buildLLMConfig(env),
    hn: buildHNConfig(env),
    summary: buildSummaryConfig(env),
    task: buildTaskConfig(env),
    cache: buildCacheConfig(env),
    contentFilter: buildContentFilterConfig(env),
    llmBatch: buildLLMBatchConfig(env),
    github: buildGitHubConfig(env),
    telegram: buildTelegramConfig(env),
    crawler: buildCrawlerConfig(env),
    testMode: buildTestModeConfig(env),
  };
}
