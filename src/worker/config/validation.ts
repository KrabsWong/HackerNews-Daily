/**
 * Worker Configuration Validation
 * Validates required environment variables on worker startup
 */

import { parseProvider, getApiKeyForProvider } from '../../services/llm';
import type { Env } from '../index';

/**
 * Check if GitHub publishing is enabled (default: true)
 */
export function isGitHubEnabled(env: Env): boolean {
  // GitHub is enabled by default, only disabled if explicitly set to "false"
  return env.GITHUB_ENABLED?.toLowerCase() !== 'false';
}

/**
 * Validate GitHub configuration
 * Returns warning messages for missing config (doesn't throw)
 */
export function validateGitHubConfig(env: Env): string[] {
  const warnings: string[] = [];
  
  if (!isGitHubEnabled(env)) {
    return warnings;
  }
  
  if (!env.GITHUB_TOKEN) {
    warnings.push('GITHUB_ENABLED is true but GITHUB_TOKEN is missing - GitHub publishing will be skipped');
  }
  
  if (!env.TARGET_REPO) {
    warnings.push('GITHUB_ENABLED is true but TARGET_REPO is missing - GitHub publishing will be skipped');
  }
  
  return warnings;
}

/**
 * Check if GitHub configuration is valid for publishing
 */
export function isGitHubConfigValid(env: Env): boolean {
  return isGitHubEnabled(env) && 
         Boolean(env.GITHUB_TOKEN) && 
         Boolean(env.TARGET_REPO);
}

/**
 * Check if Telegram publishing is enabled
 */
export function isTelegramEnabled(env: Env): boolean {
  return env.TELEGRAM_ENABLED?.toLowerCase() === 'true';
}

/**
 * Validate Telegram configuration
 * Returns warning messages for missing config (doesn't throw)
 */
export function validateTelegramConfig(env: Env): string[] {
  const warnings: string[] = [];
  
  if (!isTelegramEnabled(env)) {
    return warnings;
  }
  
  if (!env.TELEGRAM_BOT_TOKEN) {
    warnings.push('TELEGRAM_ENABLED is true but TELEGRAM_BOT_TOKEN is missing - Telegram publishing will be skipped');
  }
  
  if (!env.TELEGRAM_CHANNEL_ID) {
    warnings.push('TELEGRAM_ENABLED is true but TELEGRAM_CHANNEL_ID is missing - Telegram publishing will be skipped');
  }
  
  return warnings;
}

/**
 * Check if Telegram configuration is valid for publishing
 */
export function isTelegramConfigValid(env: Env): boolean {
  return isTelegramEnabled(env) && 
         Boolean(env.TELEGRAM_BOT_TOKEN) && 
         Boolean(env.TELEGRAM_CHANNEL_ID);
}

/**
 * Validate worker configuration
 * Throws an error with clear messages if any required configuration is missing
 * 
 * @param env - Worker environment variables
 * @throws Error if validation fails
 */
export function validateWorkerConfig(env: Env): void {
  const errors: string[] = [];
  
  // Validate D1 database binding (required for distributed processing)
  if (!env.DB) {
    errors.push('D1 database binding (DB) is required for distributed task processing');
  }
  
  // Validate task processing configuration
  if (env.TASK_BATCH_SIZE) {
    const batchSize = parseInt(env.TASK_BATCH_SIZE, 10);
    if (isNaN(batchSize) || batchSize < 1 || batchSize > 10) {
      errors.push('TASK_BATCH_SIZE must be a number between 1 and 10');
    }
  }
  
  if (env.MAX_RETRY_COUNT) {
    const retryCount = parseInt(env.MAX_RETRY_COUNT, 10);
    if (isNaN(retryCount) || retryCount < 0) {
      errors.push('MAX_RETRY_COUNT must be a non-negative integer');
    }
  }
  
  // Validate LLM_PROVIDER and corresponding API key
  try {
    const provider = parseProvider(env.LLM_PROVIDER);
    // This will throw if the API key is missing
    getApiKeyForProvider(provider, env);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  
  // Validate publisher configuration
  const githubEnabled = isGitHubEnabled(env);
  const telegramEnabled = isTelegramEnabled(env);
  
  // Determine which publishers will be active
  let hasValidPublisher = false;
  
  // Check if at least one external publisher is configured
  if (isGitHubConfigValid(env)) {
    hasValidPublisher = true;
  }
  if (isTelegramConfigValid(env)) {
    hasValidPublisher = true;
  }
  
  // Validate we have at least one valid publisher
  if (!hasValidPublisher) {
    if (!githubEnabled && !telegramEnabled) {
      errors.push('At least one publisher must be enabled (GITHUB_ENABLED or TELEGRAM_ENABLED)');
    } else {
      // GitHub or Telegram is enabled but not properly configured
      errors.push('At least one publisher must be properly configured');
    }
  }
  
  // Validate GitHub config if enabled
  if (githubEnabled) {
    if (!env.TARGET_REPO) {
      errors.push('TARGET_REPO is required when GitHub publishing is enabled (format: "owner/repo")');
    }
    if (!env.GITHUB_TOKEN) {
      errors.push('GITHUB_TOKEN is required when GitHub publishing is enabled');
    }
  }
  
  // Validate Telegram config if enabled
  if (telegramEnabled) {
    if (!env.TELEGRAM_BOT_TOKEN) {
      errors.push('TELEGRAM_BOT_TOKEN is required when Telegram publishing is enabled');
    }
    if (!env.TELEGRAM_CHANNEL_ID) {
      errors.push('TELEGRAM_CHANNEL_ID is required when Telegram publishing is enabled');
    }
  }
  
  // If there are errors, throw with all messages
  if (errors.length > 0) {
    throw new Error(
      `Worker configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}
