/**
 * Configuration Validation
 * Validates configuration values and returns structured validation results
 */

import type { AppConfig, ValidationResult } from './schema';
import { LLMProviderType } from './constants';

/**
 * Validate LLM configuration
 */
function validateLLMConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  // Validate provider
  if (!Object.values(LLMProviderType).includes(config.llm.provider)) {
    errors.push(`Invalid LLM_PROVIDER: ${config.llm.provider}`);
  }

  // Validate that the corresponding API key is present
  switch (config.llm.provider) {
    case LLMProviderType.DEEPSEEK:
      if (!config.llm.deepSeekApiKey) {
        errors.push('LLM_DEEPSEEK_API_KEY is required when using DeepSeek provider');
      }
      break;
    case LLMProviderType.OPENROUTER:
      if (!config.llm.openRouterApiKey) {
        errors.push('LLM_OPENROUTER_API_KEY is required when using OpenRouter provider');
      }
      break;
    case LLMProviderType.ZHIPU:
      if (!config.llm.zhipuApiKey) {
        errors.push('LLM_ZHIPU_API_KEY is required when using Zhipu provider');
      }
      break;
  }

  return errors;
}

/**
 * Validate HackerNews configuration
 */
function validateHNConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (config.hn.storyLimit < 1 || config.hn.storyLimit > 100) {
    errors.push('HN_STORY_LIMIT must be between 1 and 100');
  }

  if (config.hn.timeWindowHours < 1 || config.hn.timeWindowHours > 168) {
    errors.push('HN_TIME_WINDOW_HOURS must be between 1 and 168 (7 days)');
  }

  return errors;
}

/**
 * Validate summary configuration
 */
function validateSummaryConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (config.summary.maxLength < 50 || config.summary.maxLength > 1000) {
    errors.push('SUMMARY_MAX_LENGTH must be between 50 and 1000');
  }

  return errors;
}

/**
 * Validate task configuration
 */
function validateTaskConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (config.task.batchSize < 1 || config.task.batchSize > 10) {
    errors.push('TASK_BATCH_SIZE must be between 1 and 10');
  }

  if (config.task.maxRetries < 0 || config.task.maxRetries > 10) {
    errors.push('MAX_RETRY_COUNT must be between 0 and 10');
  }

  return errors;
}

/**
 * Validate cache configuration
 */
function validateCacheConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (config.cache.enabled && (config.cache.ttlMinutes < 1 || config.cache.ttlMinutes > 1440)) {
    errors.push('CACHE_TTL_MINUTES must be between 1 and 1440 (24 hours)');
  }

  return errors;
}

/**
 * Validate content filter configuration
 */
function validateContentFilterConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (config.contentFilter.enabled) {
    if (config.contentFilter.timeout < 1000 || config.contentFilter.timeout > 60000) {
      errors.push('Content filter timeout must be between 1000 and 60000 ms');
    }
  }

  return errors;
}

/**
 * Validate GitHub publisher configuration
 */
function validateGitHubConfig(config: AppConfig): string[] {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.github.enabled) {
    if (!config.github.token) {
      errors.push('GITHUB_TOKEN is required when GitHub publishing is enabled');
    }
    if (!config.github.targetRepo) {
      errors.push('TARGET_REPO is required when GitHub publishing is enabled');
    }
  }

  return errors;
}

/**
 * Validate Telegram publisher configuration
 */
function validateTelegramConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (config.telegram.enabled) {
    if (!config.telegram.botToken) {
      errors.push('TELEGRAM_BOT_TOKEN is required when Telegram publishing is enabled');
    }
    if (!config.telegram.channelId) {
      errors.push('TELEGRAM_CHANNEL_ID is required when Telegram publishing is enabled');
    }
    if (config.telegram.batchSize < 1 || config.telegram.batchSize > 10) {
      errors.push('TELEGRAM_BATCH_SIZE must be between 1 and 10');
    }
  }

  return errors;
}

/**
 * Validate crawler API configuration
 */
function validateCrawlerConfig(config: AppConfig): string[] {
  const errors: string[] = [];

  if (config.crawler.enabled && !config.crawler.apiUrl) {
    errors.push('CRAWLER_API_URL is required when crawler is enabled');
  }

  return errors;
}

/**
 * Validate that at least one publisher is properly configured
 * In LOCAL_TEST_MODE, TerminalPublisher is automatically enabled
 */
function validatePublishers(config: AppConfig): string[] {
  const errors: string[] = [];

  // In test mode, TerminalPublisher is automatically enabled
  if (config.testMode.enabled) {
    return errors; // No validation needed, TerminalPublisher will be used
  }

  const hasValidGitHub = config.github.enabled && config.github.token && config.github.targetRepo;
  const hasValidTelegram = config.telegram.enabled && config.telegram.botToken && config.telegram.channelId;

  if (!hasValidGitHub && !hasValidTelegram) {
    errors.push('At least one publisher (GitHub or Telegram) must be properly configured, or set LOCAL_TEST_MODE=true to use TerminalPublisher');
  }

  return errors;
}

/**
 * Validate the complete configuration
 * Returns validation result with errors and warnings
 */
export function validateConfig(config: AppConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate each section
  errors.push(...validateLLMConfig(config));
  errors.push(...validateHNConfig(config));
  errors.push(...validateSummaryConfig(config));
  errors.push(...validateTaskConfig(config));
  errors.push(...validateCacheConfig(config));
  errors.push(...validateContentFilterConfig(config));
  errors.push(...validateGitHubConfig(config));
  errors.push(...validateTelegramConfig(config));
  errors.push(...validateCrawlerConfig(config));
  errors.push(...validatePublishers(config));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
