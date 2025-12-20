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
 * Realistic translation dictionary for mock LLM responses
 * 
 * Maps common HackerNews titles to realistic Chinese translations
 * that match actual LLM output patterns
 */
const REALISTIC_TRANSLATIONS: Record<string, string> = {
  // Tech News & Features
  'New JavaScript Features in ES2024': 'ES2024 中的新 JavaScript 特性',
  'Python Performance Optimization Tips': 'Python 性能优化技巧',
  'Rust vs Go: A Comprehensive Comparison': 'Rust 与 Go：全面对比',
  'Understanding TypeScript Generics': '理解 TypeScript 泛型',
  'Building Scalable Microservices with Node.js': '使用 Node.js 构建可扩展的微服务',
  
  // AI & Machine Learning
  'GPT-4 Architecture Explained': 'GPT-4 架构详解',
  'Machine Learning Best Practices': '机器学习最佳实践',
  'Deep Learning for Computer Vision': '计算机视觉的深度学习',
  'Introduction to Neural Networks': '神经网络入门',
  
  // DevOps & Infrastructure
  'Docker Container Security': 'Docker 容器安全',
  'Kubernetes Deployment Strategies': 'Kubernetes 部署策略',
  'CI/CD Pipeline Automation': 'CI/CD 流水线自动化',
  'Cloud Architecture Patterns': '云架构模式',
  
  // Web Development
  'React Server Components Tutorial': 'React 服务器组件教程',
  'Modern CSS Layout Techniques': '现代 CSS 布局技术',
  'Web Performance Optimization': 'Web 性能优化',
  'Progressive Web Apps Guide': '渐进式 Web 应用指南',
  
  // Databases & Storage
  'PostgreSQL Query Optimization': 'PostgreSQL 查询优化',
  'Redis Caching Strategies': 'Redis 缓存策略',
  'Database Indexing Best Practices': '数据库索引最佳实践',
  
  // Security & Privacy
  'OAuth 2.0 Implementation Guide': 'OAuth 2.0 实现指南',
  'API Security Best Practices': 'API 安全最佳实践',
  'GDPR Compliance for Developers': '开发者的 GDPR 合规指南',
  
  // Generic test cases
  'Example HackerNews Story': '示例 HackerNews 故事',
  'This is a test': '这是一个测试',
  'Article summary': '文章摘要',
  'Comment summary': '评论摘要',
};

/**
 * Extract keywords from title to find best match in dictionary
 * 
 * @param text Original title
 * @returns Array of keywords for matching
 */
function extractKeywords(text: string): string[] {
  // Remove common words and split
  const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'and', 'or']);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Find best matching translation from dictionary
 * 
 * @param text Text to translate
 * @returns Best matching key from dictionary, or null if no good match
 */
function findBestTranslation(text: string): string | null {
  // Exact match first
  if (REALISTIC_TRANSLATIONS[text]) {
    return text;
  }
  
  // Keyword matching for partial matches
  const inputKeywords = extractKeywords(text);
  let bestMatch: { key: string; score: number } | null = null;
  
  for (const key of Object.keys(REALISTIC_TRANSLATIONS)) {
    const keyKeywords = extractKeywords(key);
    const matchCount = inputKeywords.filter(kw => keyKeywords.includes(kw)).length;
    
    if (matchCount > 0) {
      const score = matchCount / Math.max(inputKeywords.length, keyKeywords.length);
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { key, score };
      }
    }
  }
  
  // Return match if similarity > 30%
  return (bestMatch && bestMatch.score > 0.3) ? bestMatch.key : null;
}

/**
 * Create a mock translation response with realistic Chinese translations
 * 
 * Uses dictionary-based approach with keyword matching fallback
 * to generate realistic translations that match actual LLM output
 */
export function mockTranslationResponse(text: string): MockLLMResponse {
  let result: string;
  
  // Try exact match first
  if (REALISTIC_TRANSLATIONS[text]) {
    result = REALISTIC_TRANSLATIONS[text];
  } else {
    // Try keyword matching
    const matchKey = findBestTranslation(text);
    if (matchKey) {
      result = REALISTIC_TRANSLATIONS[matchKey];
    } else {
      // Fallback: preserve structure with realistic pattern
      // Instead of "翻译：Translated text", use contextual format
      if (text.includes('?')) {
        result = `如何${text.slice(0, 20)}...`;
      } else if (text.length > 50) {
        result = `关于${text.slice(0, 15)}的深入分析`;
      } else {
        result = `${text.slice(0, 20)}相关技术讨论`;
      }
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
 * Classify content based on keywords for realistic filtering
 * 
 * Simulates actual content classification logic that checks for
 * sensitive topics
 */
function classifyContent(title: string, url?: string): 'SAFE' | 'SENSITIVE' {
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url?.toLowerCase() || '';
  
  // Political keywords
  const politicalKeywords = [
    'election', 'politics', 'government', 'congress', 'senate',
    'president', 'minister', 'parliament', 'legislation', 'policy',
    'democrat', 'republican', 'liberal', 'conservative',
  ];
  
  // Violence/conflict keywords
  const violenceKeywords = [
    'war', 'attack', 'killed', 'shooting', 'bomb', 'violence',
    'terror', 'conflict', 'military', 'weapon',
  ];
  
  // Adult content keywords
  const adultKeywords = [
    'porn', 'nsfw', 'adult', 'explicit', 'xxx',
  ];
  
  // Check for sensitive keywords
  const allSensitiveKeywords = [
    ...politicalKeywords,
    ...violenceKeywords,
    ...adultKeywords,
  ];
  
  const hasSensitiveKeyword = allSensitiveKeywords.some(keyword => 
    lowerTitle.includes(keyword) || lowerUrl.includes(keyword)
  );
  
  return hasSensitiveKeyword ? 'SENSITIVE' : 'SAFE';
}

/**
 * Create a mock content filter response with realistic classification
 * 
 * @param classification Explicit classification override, or 'AUTO' to detect from context
 * @param context Optional context (title, url) for automatic classification
 */
export function mockContentFilterResponse(
  classification: 'SAFE' | 'SENSITIVE' | 'AUTO' = 'SAFE',
  context?: { title?: string; url?: string }
): MockLLMResponse {
  let result: 'SAFE' | 'SENSITIVE';
  
  if (classification === 'AUTO' && context?.title) {
    // Automatic classification based on content
    result = classifyContent(context.title, context.url);
  } else if (classification === 'AUTO') {
    // No context, default to SAFE
    result = 'SAFE';
  } else {
    result = classification;
  }
  
  return {
    content: result,
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

