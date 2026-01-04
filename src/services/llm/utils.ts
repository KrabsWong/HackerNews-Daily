/**
 * LLM Provider Utilities
 * 
 * Centralized utilities for handling LLM provider selection and API key retrieval.
 * Eliminates duplicate switch statements across the codebase.
 * 
 * All LLM-related environment variables use the LLM_ prefix:
 * - LLM_PROVIDER: Provider type (deepseek | openrouter | zhipu)
 * - LLM_DEEPSEEK_API_KEY: DeepSeek API key
 * - LLM_DEEPSEEK_MODEL: DeepSeek model override
 * - LLM_OPENROUTER_API_KEY: OpenRouter API key
 * - LLM_OPENROUTER_MODEL: OpenRouter model override
 * - LLM_OPENROUTER_SITE_URL: OpenRouter site URL for attribution
 * - LLM_OPENROUTER_SITE_NAME: OpenRouter site name for attribution
 * - LLM_ZHIPU_API_KEY: Zhipu AI API key
 * - LLM_ZHIPU_MODEL: Zhipu model override (default: glm-4.5-flash)
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
    throw new Error('LLM_PROVIDER is required (set to "deepseek", "openrouter", or "zhipu")');
  }
  
  const normalized = providerString.toLowerCase();
  
  switch (normalized) {
    case LLMProviderType.DEEPSEEK:
      return LLMProviderType.DEEPSEEK;
    case LLMProviderType.OPENROUTER:
      return LLMProviderType.OPENROUTER;
    case LLMProviderType.ZHIPU:
      return LLMProviderType.ZHIPU;
    default:
      throw new Error(`Invalid LLM_PROVIDER "${providerString}". Must be "deepseek", "openrouter", or "zhipu"`);
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
      const key = env.LLM_DEEPSEEK_API_KEY;
      if (!key) {
        throw new Error('LLM_DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek');
      }
      return key;
    }
    case LLMProviderType.OPENROUTER: {
      const key = env.LLM_OPENROUTER_API_KEY;
      if (!key) {
        throw new Error('LLM_OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter');
      }
      return key;
    }
    case LLMProviderType.ZHIPU: {
      const key = env.LLM_ZHIPU_API_KEY;
      if (!key) {
        throw new Error('LLM_ZHIPU_API_KEY is required when LLM_PROVIDER=zhipu');
      }
      return key;
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Get model for the specified provider
 * 
 * @param provider - The LLM provider type
 * @param env - Environment containing model configuration
 * @returns The model name or undefined if using default
 */
export function getModelForProvider(provider: LLMProviderType, env: ProviderEnv): string | undefined {
  switch (provider) {
    case LLMProviderType.DEEPSEEK:
      return env.LLM_DEEPSEEK_MODEL;
    case LLMProviderType.OPENROUTER:
      return env.LLM_OPENROUTER_MODEL;
    case LLMProviderType.ZHIPU:
      return env.LLM_ZHIPU_MODEL;
    default:
      return undefined;
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
  const model = getModelForProvider(provider, env);
  
  return {
    provider,
    apiKey,
    model,
    siteUrl: env.LLM_OPENROUTER_SITE_URL,
    siteName: env.LLM_OPENROUTER_SITE_NAME,
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
 * @deprecated This function uses process.env which is not available in Cloudflare Workers.
 * Use buildProviderOptions(env) instead where env is passed as a parameter.
 *
 * Build CreateProviderOptions from process.env for CLI usage.
 *
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
  console.warn('buildCliProviderOptions is deprecated and will not work in Cloudflare Workers');
  return buildProviderOptions({
    LLM_PROVIDER: process.env.LLM_PROVIDER || LLMProviderType.DEEPSEEK,
    LLM_DEEPSEEK_API_KEY: process.env.LLM_DEEPSEEK_API_KEY,
    LLM_DEEPSEEK_MODEL: process.env.LLM_DEEPSEEK_MODEL,
    LLM_OPENROUTER_API_KEY: process.env.LLM_OPENROUTER_API_KEY,
    LLM_OPENROUTER_MODEL: process.env.LLM_OPENROUTER_MODEL,
    LLM_OPENROUTER_SITE_URL: process.env.LLM_OPENROUTER_SITE_URL,
    LLM_OPENROUTER_SITE_NAME: process.env.LLM_OPENROUTER_SITE_NAME,
    LLM_ZHIPU_API_KEY: process.env.LLM_ZHIPU_API_KEY,
    LLM_ZHIPU_MODEL: process.env.LLM_ZHIPU_MODEL,
  });
}
