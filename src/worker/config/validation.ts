/**
 * Worker Configuration Validation
 * Validates required environment variables on worker startup
 */

import { parseProvider, getApiKeyForProvider } from '../../services/llm';
import type { Env } from '../index';

/**
 * Check if local test mode is enabled
 */
export function isLocalTestModeEnabled(env: Env): boolean {
  return env.LOCAL_TEST_MODE?.toLowerCase() === 'true';
}

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
  
  // Validate LLM_PROVIDER and corresponding API key
  try {
    const provider = parseProvider(env.LLM_PROVIDER);
    // This will throw if the API key is missing
    getApiKeyForProvider(provider, env);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  
  // Check if local test mode is enabled
  const localTestMode = isLocalTestModeEnabled(env);
  
  // Validate publisher configuration
  const githubEnabled = isGitHubEnabled(env);
  const telegramEnabled = isTelegramEnabled(env);
  
  // Determine which publishers will be active
  let hasValidPublisher = false;
  
  if (localTestMode) {
    // In local test mode, terminal publisher is automatically available
    hasValidPublisher = true;
  } else {
    // In normal mode, check if at least one external publisher is configured
    if (isGitHubConfigValid(env)) {
      hasValidPublisher = true;
    }
    if (isTelegramConfigValid(env)) {
      hasValidPublisher = true;
    }
  }
  
  // Validate we have at least one valid publisher path
  if (!hasValidPublisher) {
    if (localTestMode) {
      errors.push(
        'LOCAL_TEST_MODE is enabled but other publishers are not properly configured. ' +
        'To run in local test mode, explicitly set: GITHUB_ENABLED="false" and TELEGRAM_ENABLED="false"'
      );
    } else if (!githubEnabled && !telegramEnabled) {
      errors.push('At least one publisher must be enabled (GITHUB_ENABLED or TELEGRAM_ENABLED or LOCAL_TEST_MODE)');
    } else {
      // GitHub or Telegram is enabled but not properly configured
      errors.push('At least one publisher must be properly configured or LOCAL_TEST_MODE must be enabled');
    }
  }
  
  // Validate GitHub config if enabled (in non-local mode)
  if (!localTestMode && githubEnabled) {
    if (!env.TARGET_REPO) {
      errors.push('TARGET_REPO is required when GitHub publishing is enabled (format: "owner/repo")');
    }
    if (!env.GITHUB_TOKEN) {
      errors.push('GITHUB_TOKEN is required when GitHub publishing is enabled');
    }
  }
  
  // Validate Telegram config if enabled (in non-local mode)
  if (!localTestMode && telegramEnabled) {
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
