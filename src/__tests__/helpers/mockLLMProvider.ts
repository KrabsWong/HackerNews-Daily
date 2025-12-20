/**
 * Mock factory for LLM provider responses
 */

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

  return {
    content: translations[text] || `翻译：${text}`,
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
    content: `This is a generated summary of approximately ${contentLength} characters. The content discusses technical implementations, architectural decisions, and provides insightful analysis of the topic. It covers key points and highlights important takeaways for readers.`,
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
