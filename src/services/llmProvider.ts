/**
 * LLM Provider Abstraction Layer
 * Provides a unified interface for different LLM providers (DeepSeek, OpenRouter)
 */

import { DEEPSEEK_API, OPENROUTER_API, LLM_CONFIG, LLMProviderType } from '../config/constants';
import { post, FetchError } from '../utils/fetch';

// =============================================================================
// Types
// =============================================================================

export interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
}

export interface ChatCompletionResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * LLM Provider interface
 * All providers must implement this interface
 */
export interface LLMProvider {
  /** Send a chat completion request */
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  
  /** Get the provider name for logging */
  getName(): string;
  
  /** Get the model being used */
  getModel(): string;
  
  /** Get retry delay for rate limiting */
  getRetryDelay(): number;
}

// =============================================================================
// API Response Types (internal)
// =============================================================================

interface OpenAIStyleResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

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

// =============================================================================
// Factory Function
// =============================================================================

export interface CreateProviderOptions {
  /** Override the provider type (defaults to LLM_CONFIG.PROVIDER) */
  provider?: LLMProviderType;
  /** DeepSeek API key (required for deepseek provider) */
  deepseekApiKey?: string;
  /** OpenRouter API key (required for openrouter provider) */
  openrouterApiKey?: string;
  /** Override the model to use */
  model?: string;
  /** Site URL for OpenRouter attribution */
  siteUrl?: string;
  /** Site name for OpenRouter attribution */
  siteName?: string;
}

/**
 * Create an LLM provider based on configuration
 * 
 * @param options - Provider options (keys, model overrides)
 * @returns Configured LLM provider instance
 * @throws Error if required API key is missing
 */
export function createLLMProvider(options: CreateProviderOptions = {}): LLMProvider {
  const providerType = options.provider ?? LLM_CONFIG.PROVIDER;

  if (providerType === 'openrouter') {
    // Get API key from options or environment
    const apiKey = options.openrouterApiKey ?? 
      (typeof process !== 'undefined' ? process.env?.OPENROUTER_API_KEY : undefined);
    
    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY is required when using OpenRouter provider.\n' +
        'Please set the OPENROUTER_API_KEY environment variable or provide it via options.'
      );
    }

    const model = options.model ?? OPENROUTER_API.MODEL;
    const siteUrl = options.siteUrl ?? OPENROUTER_API.SITE_URL;
    const siteName = options.siteName ?? OPENROUTER_API.SITE_NAME;

    return new OpenRouterProvider(apiKey, model, siteUrl, siteName);
  }

  // Default: DeepSeek provider
  const apiKey = options.deepseekApiKey ?? 
    (typeof process !== 'undefined' ? process.env?.DEEPSEEK_API_KEY : undefined);
  
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY is required.\n' +
      'Please set the DEEPSEEK_API_KEY environment variable or provide it via options.'
    );
  }

  const model = options.model ?? DEEPSEEK_API.DEFAULT_MODEL;

  return new DeepSeekProvider(apiKey, model);
}

// Re-export FetchError for error handling
export { FetchError };
