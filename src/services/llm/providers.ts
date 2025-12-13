/**
 * LLM Provider Implementations
 * 
 * Concrete implementations of the LLMProvider interface for different providers
 */

import { DEEPSEEK_API, OPENROUTER_API } from '../../config/constants';
import { post } from '../../utils/fetch';
import type {
  LLMProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  OpenAIStyleResponse,
} from '../../types/llm';

// =============================================================================
// DeepSeek Provider
// =============================================================================

export class DeepSeekProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = DEEPSEEK_API.DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  getName(): string {
    return 'deepseek';
  }

  getModel(): string {
    return this.model;
  }

  getRetryDelay(): number {
    return DEEPSEEK_API.RETRY_DELAY;
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await post<OpenAIStyleResponse>(
      `${DEEPSEEK_API.BASE_URL}/chat/completions`,
      {
        model: this.model,
        messages: request.messages,
        temperature: request.temperature,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: DEEPSEEK_API.REQUEST_TIMEOUT,
      }
    );

    const content = response.data.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from DeepSeek API');
    }

    return {
      content,
      usage: response.data.usage,
    };
  }
}

// =============================================================================
// OpenRouter Provider
// =============================================================================

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private siteUrl?: string;
  private siteName?: string;

  constructor(
    apiKey: string,
    model: string = OPENROUTER_API.MODEL,
    siteUrl?: string,
    siteName?: string
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.siteUrl = siteUrl;
    this.siteName = siteName;
  }

  getName(): string {
    return 'openrouter';
  }

  getModel(): string {
    return this.model;
  }

  getRetryDelay(): number {
    return OPENROUTER_API.RETRY_DELAY;
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
    };

    // Add optional attribution headers
    if (this.siteUrl) {
      headers['HTTP-Referer'] = this.siteUrl;
    }
    if (this.siteName) {
      headers['X-Title'] = this.siteName;
    }

    const response = await post<OpenAIStyleResponse>(
      `${OPENROUTER_API.BASE_URL}/chat/completions`,
      {
        model: this.model,
        messages: request.messages,
        temperature: request.temperature,
      },
      {
        headers,
        timeout: OPENROUTER_API.REQUEST_TIMEOUT,
      }
    );

    const content = response.data.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from OpenRouter API');
    }

    return {
      content,
      usage: response.data.usage,
    };
  }
}
