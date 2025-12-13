/**
 * LLM Provider Utilities
 * 
 * Centralized utilities for handling LLM provider selection and API key retrieval.
 * Eliminates duplicate switch statements across the codebase.
 */

import { LLMProviderType } from '../../config/constants';
import type { ProviderEnv, ResolvedProviderConfig, CreateProviderOptions } from '../../types/llm';

// Re-export types for convenience
export type { ProviderEnv, ResolvedProviderConfig, CreateProviderOptions };

/**
 * Parse and validate LLM provider from string
 * 
 * @param providerString - Provider string from environment
 * @returns Validated LLMProviderType
 * @throws Error if provider is invalid
 */
export function parseProvider(providerString: string | undefined): LLMProviderType {
  if (!providerString) {
    throw new Error('LLM_PROVIDER is required (set to "deepseek" or "openrouter")');
  }
  
  const normalized = providerString.toLowerCase();
  
  switch (normalized) {
    case LLMProviderType.DEEPSEEK:
      return LLMProviderType.DEEPSEEK;
    case LLMProviderType.OPENROUTER:
      return LLMProviderType.OPENROUTER;
    default:
      throw new Error(`Invalid LLM_PROVIDER "${providerString}". Must be "deepseek" or "openrouter"`);
  }
}

/**
 * Get API key for the specified provider
 * 
 * @param provider - The LLM provider type
 * @param env - Environment containing API keys
 * @returns The API key for the provider
 * @throws Error if API key is not found
 */
export function getApiKeyForProvider(provider: LLMProviderType, env: ProviderEnv): string {
  switch (provider) {
    case LLMProviderType.DEEPSEEK: {
      const key = env.DEEPSEEK_API_KEY;
      if (!key) {
        throw new Error('DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek');
      }
      return key;
    }
    case LLMProviderType.OPENROUTER: {
      const key = env.OPENROUTER_API_KEY;
      if (!key) {
        throw new Error('OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter');
      }
      return key;
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Resolve complete provider configuration from environment
 * 
 * @param env - Environment containing provider configuration
 * @returns Complete resolved provider configuration
 * @throws Error if required configuration is missing
 */
export function resolveProviderConfig(env: ProviderEnv): ResolvedProviderConfig {
  const provider = parseProvider(env.LLM_PROVIDER);
  const apiKey = getApiKeyForProvider(provider, env);
  
  return {
    provider,
    apiKey,
    model: env.OPENROUTER_MODEL,
    siteUrl: env.OPENROUTER_SITE_URL,
    siteName: env.OPENROUTER_SITE_NAME,
  };
}

/**
 * Build CreateProviderOptions from environment
 * 
 * This is the canonical way to create provider options from environment variables.
 * Used by both CLI and Worker environments.
 * 
 * @param env - Environment containing provider configuration
 * @returns CreateProviderOptions ready for use with createLLMProvider
 * @throws Error if required configuration is missing
 * 
 * @example
 * // Worker usage
 * const options = buildProviderOptions(env);
 * translator.init(options);
 * 
 * @example
 * // CLI usage
 * const options = buildProviderOptions({
 *   LLM_PROVIDER: process.env.LLM_PROVIDER,
 *   DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
 *   ...
 * });
 */
export function buildProviderOptions(env: ProviderEnv): CreateProviderOptions {
  const resolved = resolveProviderConfig(env);
  
  return {
    provider: resolved.provider,
    config: {
      apiKey: resolved.apiKey,
      model: resolved.model,
      siteUrl: resolved.siteUrl,
      siteName: resolved.siteName,
    },
  };
}

/**
 * Build CreateProviderOptions from process.env for CLI usage
 * 
 * Uses DEEPSEEK as the default provider when LLM_PROVIDER is not set.
 * This function is specifically designed for Node.js CLI environments
 * where configuration comes from process.env.
 * 
 * @returns CreateProviderOptions ready for use with createLLMProvider
 * @throws Error if required configuration is missing
 * 
 * @example
 * const options = buildCliProviderOptions();
 * translator.init(options);
 */
export function buildCliProviderOptions(): CreateProviderOptions {
  return buildProviderOptions({
    LLM_PROVIDER: process.env.LLM_PROVIDER || LLMProviderType.DEEPSEEK,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
    OPENROUTER_SITE_NAME: process.env.OPENROUTER_SITE_NAME,
  });
}
