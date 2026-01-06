/**
 * LLM Provider Implementations
 *
 * Concrete implementations of LLMProvider interface for different providers
 */

import { DEEPSEEK_API, OPENROUTER_API, ZHIPU_API } from '../../config/constants';
import { BaseLLMProvider } from './base';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '../../types/llm';

// =============================================================================
// DeepSeek Provider
// =============================================================================

/**
 * DeepSeek AI LLM Provider
 * High-performance Chinese LLM provider
 */
export class DeepSeekProvider extends BaseLLMProvider {
  constructor(apiKey: string, model: string = DEEPSEEK_API.DEFAULT_MODEL) {
    super(
      apiKey,
      model,
      DEEPSEEK_API.BASE_URL,
      DEEPSEEK_API.REQUEST_TIMEOUT,
      DEEPSEEK_API.RETRY_DELAY
    );
  }

  getName(): string {
    return 'deepseek';
  }
}

// =============================================================================
// OpenRouter Provider
// =============================================================================

/**
 * OpenRouter LLM Provider
 * Unified API for hundreds of AI models
 */
export class OpenRouterProvider extends BaseLLMProvider {
  private siteUrl?: string;
  private siteName?: string;

  constructor(
    apiKey: string,
    model: string = OPENROUTER_API.DEFAULT_MODEL,
    siteUrl?: string,
    siteName?: string
  ) {
    super(
      apiKey,
      model,
      OPENROUTER_API.BASE_URL,
      OPENROUTER_API.REQUEST_TIMEOUT,
      OPENROUTER_API.RETRY_DELAY
    );
    this.siteUrl = siteUrl;
    this.siteName = siteName;
  }

  getName(): string {
    return 'openrouter';
  }

  /**
   * Add OpenRouter-specific headers for attribution
   */
  protected buildHeaders(): Record<string, string> {
    const headers = super.buildHeaders();

    // Add optional attribution headers for OpenRouter leaderboard
    if (this.siteUrl) {
      headers['HTTP-Referer'] = this.siteUrl;
    }
    if (this.siteName) {
      headers['X-Title'] = this.siteName;
    }

    return headers;
  }
}

// =============================================================================
// Zhipu AI Provider
// =============================================================================

/**
 * Zhipu AI LLM Provider
 * GLM series models with OpenAI-compatible API
 * Note: glm-4.5-flash has a concurrency limit of 2
 */
export class ZhipuProvider extends BaseLLMProvider {
  constructor(apiKey: string, model: string = ZHIPU_API.DEFAULT_MODEL) {
    super(
      apiKey,
      model,
      ZHIPU_API.BASE_URL,
      ZHIPU_API.REQUEST_TIMEOUT,
      ZHIPU_API.RETRY_DELAY
    );
  }

  getName(): string {
    return 'zhipu';
  }
}
