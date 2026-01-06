/**
 * Base LLM Provider
 * Abstract base class with common functionality for all LLM providers
 */

import { post } from '../../utils/fetch';
import { LLMError } from '../../types/errors';
import type {
  LLMProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
  OpenAIStyleResponse,
} from '../../types/llm';

/**
 * Configuration for API requests
 */
interface RequestConfig {
  /** API endpoint URL */
  url: string;
  /** Request body */
  body: any;
  /** Request headers */
  headers: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout: number;
}

/**
 * Abstract base class for LLM providers
 * Provides common functionality for error handling, retry logic, and request logging
 */
export abstract class BaseLLMProvider implements LLMProvider {
  protected apiKey: string;
  protected model: string;
  protected baseUrl: string;
  protected requestTimeout: number;
  protected retryDelay: number;

  constructor(
    apiKey: string,
    model: string,
    baseUrl: string,
    requestTimeout: number,
    retryDelay: number
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
    this.requestTimeout = requestTimeout;
    this.retryDelay = retryDelay;
  }

  /**
   * Get provider name - must be implemented by subclasses
   */
  abstract getName(): string;

  /**
   * Get model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get retry delay for rate limiting
   */
  getRetryDelay(): number {
    return this.retryDelay;
  }

  /**
   * Send a chat completion request
   * Provides common error handling and validation
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const requestConfig = this.buildRequestConfig(request);

    try {
      const response = await this.makeRequest(requestConfig);
      return this.parseResponse(response);
    } catch (error) {
      throw this.handleError(error, request);
    }
  }

  /**
   * Build request configuration - can be overridden by subclasses
   */
  protected buildRequestConfig(request: ChatCompletionRequest): RequestConfig {
    return {
      url: `${this.baseUrl}/chat/completions`,
      body: {
        model: this.model,
        messages: request.messages,
        temperature: request.temperature,
      },
      headers: this.buildHeaders(),
      timeout: this.requestTimeout,
    };
  }

  /**
   * Build request headers - can be overridden by subclasses
   */
  protected buildHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Make HTTP request to LLM API
   */
  protected async makeRequest(config: RequestConfig): Promise<OpenAIStyleResponse> {
    this.logRequest(config);

    const response = await post<OpenAIStyleResponse>(
      config.url,
      config.body,
      {
        headers: config.headers,
        timeout: config.timeout,
      }
    );

    this.logResponse(response);

    return response.data;
  }

  /**
   * Parse API response and extract content
   */
  protected parseResponse(response: OpenAIStyleResponse): ChatCompletionResponse {
    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new LLMError(
        `Empty response from ${this.getName()} API`,
        'chatCompletion',
        this.getName(),
        this.model,
        { response }
      );
    }

    return {
      content,
      usage: response.usage,
    };
  }

  /**
   * Handle errors from LLM API
   * Converts various error types to LLMError with context
   */
  protected handleError(error: unknown, request: ChatCompletionRequest): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    // Handle network errors
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return new LLMError(
          `Request timeout after ${this.requestTimeout}ms`,
          'chatCompletion',
          this.getName(),
          this.model,
          { originalError: error.message }
        );
      }

      if (error.message.includes('fetch failed')) {
        return new LLMError(
          'Network error - failed to reach LLM API',
          'chatCompletion',
          this.getName(),
          this.model,
          { originalError: error.message }
        );
      }
    }

    // Unknown error
    return new LLMError(
      `Unexpected error from ${this.getName()} API`,
      'chatCompletion',
      this.getName(),
      this.model,
      {
        originalError: error instanceof Error ? error.message : String(error),
        request,
      }
    );
  }

  /**
   * Log request details (for debugging)
   */
  protected logRequest(config: RequestConfig): void {
    // In production, this could be structured logging
    console.debug(`[LLM] Request to ${this.getName()}:`, {
      url: config.url,
      model: this.model,
      messageCount: config.body.messages?.length,
    });
  }

  /**
   * Log response details (for debugging)
   */
  protected logResponse(response: { data: OpenAIStyleResponse }): void {
    console.debug(`[LLM] Response from ${this.getName()}:`, {
      model: this.model,
      contentLength: response.data.choices[0]?.message?.content?.length,
      usage: response.data.usage,
    });
  }

  /**
   * Implement retry logic with exponential backoff
   * This is a utility method that subclasses can use if needed
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.warn(
            `[LLM] Retry ${attempt + 1}/${maxRetries} for ${this.getName()} after ${delay}ms`,
            { error: lastError.message }
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable (429, 5xx, network errors)
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof LLMError) {
      // Retry on rate limiting (429)
      if (error.message.includes('429')) {
        return true;
      }
      // Retry on server errors (5xx)
      if (error.message.match(/5\d\d/)) {
        return true;
      }
    }

    if (error instanceof Error) {
      // Retry on network errors
      if (error.message.includes('fetch failed') || error.message.includes('timeout')) {
        return true;
      }
    }

    return false;
  }
}
