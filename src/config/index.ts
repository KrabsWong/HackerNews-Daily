/**
 * Configuration Module
 * Centralized configuration management with validation and caching
 */

import type { Env } from '../types/worker';
import type { AppConfig } from './schema';
import { validateConfig } from './validation';
import { buildConfig } from './builder';

/**
 * Configuration cache
 * Caches the validated configuration to avoid repeated validation
 */
let configCache: AppConfig | null = null;
let configEnv: Env | null = null;

/**
 * Get configuration from environment with validation and caching
 * This is the main entry point for accessing configuration
 *
 * @param env - Worker environment variables
 * @param forceRefresh - Force rebuild of configuration cache (default: false)
 * @returns Validated application configuration
 * @throws Error if configuration validation fails
 *
 * @example
 * ```ts
 * const config = getConfig(env);
 * const provider = config.llm.provider;
 * const batchSize = config.task.batchSize;
 * ```
 */
export function getConfig(env: Env, forceRefresh = false): AppConfig {
  // Check if we have a cached config for this environment
  if (configCache !== null && configEnv !== null && !forceRefresh) {
    // Compare environment objects to ensure we're using the right config
    if (env === configEnv) {
      return configCache;
    }
  }

  // Build configuration from environment
  const config = buildConfig(env);

  // Validate configuration
  const validation = validateConfig(config);

  // Throw if validation fails
  if (!validation.valid) {
    throw new Error(
      `Configuration validation failed:\n${validation.errors.map(e => `  - ${e}`).join('\n')}`
    );
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn('Configuration warnings:');
    validation.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  // Cache the configuration
  configCache = config;
  configEnv = env;

  return config;
}

/**
 * Clear the configuration cache
 * Useful for testing or when environment changes
 */
export function clearConfigCache(): void {
  configCache = null;
  configEnv = null;
}

/**
 * Check if configuration is cached
 */
export function isConfigCached(): boolean {
  return configCache !== null;
}

/**
 * Get configuration without validation
 * WARNING: This should only be used in tests
 * Always use getConfig() in production code
 */
export function getConfigUnsafe(env: Env): AppConfig {
  return buildConfig(env);
}
