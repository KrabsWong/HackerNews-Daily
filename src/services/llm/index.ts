/**
 * LLM Provider Module
 * 
 * Provides a unified interface for different LLM providers (DeepSeek, OpenRouter).
 * This is the main entry point for all LLM-related functionality.
 */

import { DEEPSEEK_API, OPENROUTER_API, LLM_CONFIG, LLMProviderType } from '../../config/constants';
import { FetchError } from '../../utils/fetch';
import { DeepSeekProvider, OpenRouterProvider } from './providers';
import { resolveProviderConfig } from './utils';
import type {
  LLMProvider,
  CreateProviderOptions,
  ProviderEnv,
} from '../../types/llm';

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create an LLM provider based on configuration
 * 
 * @param options - Provider options
 * @returns Configured LLM provider instance
 * @throws Error if required configuration is missing
 * 
 * @example
 * const provider = createLLMProvider({
 *   provider: LLMProviderType.DEEPSEEK,
 *   config: { apiKey: 'sk-xxx' }
 * });
 */
export function createLLMProvider(options: CreateProviderOptions): LLMProvider {
  const providerType = options.provider ?? LLM_CONFIG.PROVIDER;
  const { config } = options;

  if (!config?.apiKey) {
    throw new Error(
      `API key is required for ${providerType} provider.\n` +
      'Please provide it via options.config.apiKey'
    );
  }
  
  switch (providerType) {
    case LLMProviderType.OPENROUTER:
      return new OpenRouterProvider(
        config.apiKey,
        config.model ?? OPENROUTER_API.MODEL,
        config.siteUrl,
        config.siteName
      );
      
    case LLMProviderType.DEEPSEEK:
      return new DeepSeekProvider(
        config.apiKey,
        config.model ?? DEEPSEEK_API.DEFAULT_MODEL
      );
      
    default:
      // This should never happen with proper typing, but provides safety
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

/**
 * Create an LLM provider directly from environment configuration
 * 
 * This is a convenience function that combines provider resolution and creation.
 * 
 * @param env - Environment containing provider configuration
 * @returns Configured LLM provider instance
 * @throws Error if required configuration is missing
 * 
 * @example
 * const provider = createLLMProviderFromEnv({
 *   LLM_PROVIDER: 'deepseek',
 *   LLM_DEEPSEEK_API_KEY: 'sk-xxx'
 * });
 */
export function createLLMProviderFromEnv(env: ProviderEnv): LLMProvider {
  const resolved = resolveProviderConfig(env);
  
  return createLLMProvider({
    provider: resolved.provider,
    config: {
      apiKey: resolved.apiKey,
      model: resolved.model,
      siteUrl: resolved.siteUrl,
      siteName: resolved.siteName,
    },
  });
}

// =============================================================================
// Re-exports
// =============================================================================

// Re-export utility functions
export {
  parseProvider,
  getApiKeyForProvider,
  resolveProviderConfig,
  buildProviderOptions,
  buildCliProviderOptions,
} from './utils';

// Re-export provider classes for advanced usage
export { DeepSeekProvider, OpenRouterProvider } from './providers';

// Re-export types from centralized location
export type {
  LLMProvider,
  ChatMessage,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderEnv,
  ResolvedProviderConfig,
  ProviderConfig,
  CreateProviderOptions,
} from '../../types/llm';

// Re-export FetchError for error handling
export { FetchError };
