/**
 * Mock factory for LLM provider responses and rate limiting simulation
 * 
 * Provides both basic mock responses and advanced rate limiting/error injection
 * for comprehensive testing of LLM provider behavior
 */

import type { LLMProvider, ChatCompletionRequest, ChatCompletionResponse } from '../../types/llm';

/**
 * Mock LLM completion response
 */
export interface MockLLMResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Create a mock translation response
 */
export function mockTranslationResponse(text: string): MockLLMResponse {
  // Simple mock: just add Chinese characters to simulate translation
  const translations: Record<string, string> = {
    'Example HackerNews Story': '示例 HackerNews 故事',
    'This is a test': '这是一个测试',
    'Article summary': '文章摘要',
    'Comment summary': '评论摘要',
  };

  // For generic translations, preserve numbers and structure
  let result = translations[text] || `翻译：Translated text`;
  
  // If the input contains numbers, try to preserve them in the mock response
  if (text && /\d+/.test(text)) {
    // Extract numbers from input and include them in output
    const numbers = text.match(/\d+/g) || [];
    if (numbers.length > 0) {
      result = `这是一篇关于的文章 ${numbers.join(' 和 ')}`;
    }
  }
  
  return {
    content: result,
    model: 'deepseek-chat',
    usage: {
      prompt_tokens: 50,
      completion_tokens: 30,
      total_tokens: 80,
    },
  };
}

/**
 * Create a mock summary response
 */
export function mockSummaryResponse(contentLength: number = 300): MockLLMResponse {
  return {
    content: `这是一个大约 ${contentLength} 字符的生成摘要。内容讨论了技术实现、架构决策，并提供了对该主题的深入分析。它涵盖了关键要点，并为读者强调了重要的收获。`,
    model: 'deepseek-chat',
    usage: {
      prompt_tokens: 1000,
      completion_tokens: 200,
      total_tokens: 1200,
    },
  };
}

/**
 * Create a mock content filter response
 */
export function mockContentFilterResponse(classification: 'SAFE' | 'SENSITIVE'): MockLLMResponse {
  return {
    content: classification,
    model: 'deepseek-chat',
    usage: {
      prompt_tokens: 100,
      completion_tokens: 5,
      total_tokens: 105,
    },
  };
}

/**
 * Mock fetch function for LLM API requests
 */
export function createMockLLMFetch(
  responseOverride?: Partial<MockLLMResponse>
) {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    const body = options?.body ? JSON.parse(options.body as string) : {};
    const messages = body.messages || [];
    const lastMessage = messages[messages.length - 1]?.content || '';

    // Detect request type from prompt
    let response: MockLLMResponse;

    if (lastMessage.includes('翻译') || lastMessage.includes('translate')) {
      response = mockTranslationResponse('Translated text');
    } else if (lastMessage.includes('summarize') || lastMessage.includes('摘要')) {
      response = mockSummaryResponse();
    } else if (lastMessage.includes('SAFE') || lastMessage.includes('SENSITIVE')) {
      response = mockContentFilterResponse('SAFE');
    } else {
      response = {
        content: 'Mock LLM response',
        model: 'deepseek-chat',
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      };
    }

    // Apply overrides
    response = { ...response, ...responseOverride };

    // Format as OpenAI-style response
    const apiResponse = {
      id: 'chatcmpl-mock-123',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.content,
          },
          finish_reason: 'stop',
        },
      ],
      usage: response.usage,
    };

    return new Response(JSON.stringify(apiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

/**
 * Mock LLM API error response
 */
export function mockLLMError(
  status: number = 500,
  errorType: string = 'api_error',
  message: string = 'Internal server error'
): Response {
  return new Response(
    JSON.stringify({
      error: {
        type: errorType,
        message,
      },
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Mock rate limit error
 */
export function mockRateLimitError(): Response {
  return mockLLMError(429, 'rate_limit_exceeded', 'Rate limit exceeded');
}

/**
 * Mock timeout for testing timeout scenarios
 */
export function mockLLMTimeout(): Promise<never> {
  return new Promise(() => {
    // Never resolves, simulating a timeout
  });
}

// =============================================================================
// Advanced Mock LLM Provider with Rate Limiting (Phase 1 Infrastructure)
// =============================================================================

/**
 * Configuration for error injection
 */
export interface ErrorInjectionConfig {
  afterCalls?: number;
  errorType?: 'rate_limit' | 'timeout' | 'network' | 'auth';
}

/**
 * Advanced mock LLM provider that supports rate limiting and error injection
 * 
 * This implementation is useful for testing error handling and resilience
 * in services that call LLM providers
 */
export class MockLLMProviderWithRateLimit implements LLMProvider {
  private callCount = 0;
  private rateLimitConfig?: ErrorInjectionConfig;
  private errorConfig?: ErrorInjectionConfig;
  private timeoutConfig?: ErrorInjectionConfig;
  private resetCallCount = false;

  /**
   * Configure rate limiting behavior
   * 
   * @param afterCalls Number of successful calls before rate limiting kicks in
   */
  configureRateLimit(afterCalls: number): void {
    this.rateLimitConfig = { afterCalls, errorType: 'rate_limit' };
  }

  /**
   * Configure error injection behavior
   * 
   * @param afterCalls Number of successful calls before error injection
   * @param errorType Type of error to inject
   */
  configureError(
    afterCalls: number,
    errorType: 'timeout' | 'network' | 'auth' = 'network'
  ): void {
    this.errorConfig = { afterCalls, errorType };
  }

  /**
   * Configure timeout behavior
   */
  configureTimeout(afterCalls: number): void {
    this.timeoutConfig = { afterCalls, errorType: 'timeout' };
  }

  /**
   * Reset all counters and configurations
   */
  reset(): void {
    this.callCount = 0;
    this.rateLimitConfig = undefined;
    this.errorConfig = undefined;
    this.timeoutConfig = undefined;
  }

  /**
   * Get current call count
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Execute a chat completion request with rate limiting simulation
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.callCount++;

    // Check timeout first
    if (this.timeoutConfig && this.callCount > this.timeoutConfig.afterCalls!) {
      await mockLLMTimeout();
    }

    // Check rate limit
    if (this.rateLimitConfig && this.callCount > this.rateLimitConfig.afterCalls!) {
      throw new Error('HTTP 429: Too Many Requests');
    }

    // Check other errors
    if (this.errorConfig && this.callCount > this.errorConfig.afterCalls!) {
      switch (this.errorConfig.errorType) {
        case 'network':
          throw new Error('Network error: ECONNREFUSED');
        case 'auth':
          throw new Error('HTTP 401: Unauthorized');
        case 'timeout':
          await mockLLMTimeout();
          break;
      }
    }

    // Return successful mock response
    const messages = request.messages;
    const lastMessage = messages[messages.length - 1]?.content || '';

    let response: MockLLMResponse;

    if (lastMessage.includes('翻译') || lastMessage.includes('translate')) {
      response = mockTranslationResponse('Translated text');
    } else if (lastMessage.includes('summarize') || lastMessage.includes('摘要')) {
      response = mockSummaryResponse();
    } else if (lastMessage.includes('SAFE') || lastMessage.includes('SENSITIVE')) {
      response = mockContentFilterResponse('SAFE');
    } else {
      response = {
        content: 'Mock LLM response',
        model: 'deepseek-chat',
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      };
    }

    return {
      content: response.content,
      usage: response.usage,
    };
  }

  getName(): string {
    return 'MockLLMProviderWithRateLimit';
  }

  getModel(): string {
    return 'mock-model';
  }

  getRetryDelay(): number {
    return 100; // 100ms for testing
  }
}

