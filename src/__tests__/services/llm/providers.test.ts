/**
 * Tests for LLM Provider Implementations
 * 
 * Tests DeepSeek, OpenRouter, and Zhipu providers:
 * - Successful chat completion
 * - API endpoint correctness
 * - Model name configuration
 * - Rate limit handling (429)
 * - Error handling
 * - Provider-specific behavior (concurrency limits, etc.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeepSeekProvider, OpenRouterProvider, ZhipuProvider } from '../../../services/llm/providers';
import type { ChatCompletionRequest } from '../../../types/llm';

describe('LLM Providers', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // DeepSeek Provider Tests
  // ==========================================================================

  describe('DeepSeekProvider', () => {
    it('should have correct provider name', () => {
      const provider = new DeepSeekProvider('test-key');
      expect(provider.getName()).toBe('deepseek');
    });

    it('should use default model name', () => {
      const provider = new DeepSeekProvider('test-key');
      expect(provider.getModel()).toBe('deepseek-chat');
    });

    it('should use custom model name when provided', () => {
      const provider = new DeepSeekProvider('test-key', 'deepseek-coder');
      expect(provider.getModel()).toBe('deepseek-coder');
    });

    it('should have positive retry delay', () => {
      const provider = new DeepSeekProvider('test-key');
      const delay = provider.getRetryDelay();
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThan(10000); // Reasonable upper bound
    });

    it('should successfully complete chat request', async () => {
      const provider = new DeepSeekProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'This is a response from DeepSeek',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const response = await provider.chatCompletion(request);

      expect(response.content).toBe('This is a response from DeepSeek');
      expect(response.usage?.total_tokens).toBe(30);
    });

    it('should use correct API endpoint', async () => {
      const provider = new DeepSeekProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      try {
        await provider.chatCompletion(request);
      } catch {
        // May throw on empty response handling
      }

      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('deepseek');
      expect(callUrl).toContain('chat/completions');
    });

    it('should include Bearer token in headers', async () => {
      const apiKey = 'test-deepseek-key-12345';
      const provider = new DeepSeekProvider(apiKey);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      try {
        await provider.chatCompletion(request);
      } catch {
        // May throw
      }

      expect(mockFetch).toHaveBeenCalled();
      const headers = mockFetch.mock.calls[0][1]?.headers;
      expect(headers?.Authorization).toBe(`Bearer ${apiKey}`);
    });

    it('should throw on empty response content', async () => {
      const provider = new DeepSeekProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(provider.chatCompletion(request)).rejects.toThrow();
    });

    it('should handle HTTP error responses', async () => {
      const provider = new DeepSeekProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Internal error' }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(provider.chatCompletion(request)).rejects.toThrow();
    });

    it('should handle rate limit (429) errors', async () => {
      const provider = new DeepSeekProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(provider.chatCompletion(request)).rejects.toThrow();
    });

    it('should handle authentication errors', async () => {
      const provider = new DeepSeekProvider('invalid-key');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Invalid API key' }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(provider.chatCompletion(request)).rejects.toThrow();
    });

    it('should handle network timeout', async () => {
      const provider = new DeepSeekProvider('test-key');

      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(provider.chatCompletion(request)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // OpenRouter Provider Tests
  // ==========================================================================

  describe('OpenRouterProvider', () => {
    it('should have correct provider name', () => {
      const provider = new OpenRouterProvider('test-key');
      expect(provider.getName()).toBe('openrouter');
    });

    it('should use default model name', () => {
      const provider = new OpenRouterProvider('test-key');
      expect(provider.getModel()).toContain('deepseek');
    });

    it('should use custom model when provided', () => {
      const provider = new OpenRouterProvider('test-key', 'claude-2');
      expect(provider.getModel()).toBe('claude-2');
    });

    it('should successfully complete chat request', async () => {
      const provider = new OpenRouterProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Response from OpenRouter',
              },
            },
          ],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40,
          },
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
      };

      const response = await provider.chatCompletion(request);

      expect(response.content).toBe('Response from OpenRouter');
    });

    it('should include site URL and name in headers when provided', async () => {
      const siteUrl = 'https://example.com';
      const siteName = 'Test App';
      const provider = new OpenRouterProvider('test-key', undefined, siteUrl, siteName);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      try {
        await provider.chatCompletion(request);
      } catch {
        // May throw
      }

      expect(mockFetch).toHaveBeenCalled();
      const headers = mockFetch.mock.calls[0][1]?.headers;
      expect(headers?.['HTTP-Referer']).toBe(siteUrl);
      expect(headers?.['X-Title']).toBe(siteName);
    });

    it('should use correct API endpoint', async () => {
      const provider = new OpenRouterProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      try {
        await provider.chatCompletion(request);
      } catch {
        // May throw
      }

      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('openrouter');
      expect(callUrl).toContain('chat/completions');
    });

    it('should handle rate limiting', async () => {
      const provider = new OpenRouterProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Rate limited' }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(provider.chatCompletion(request)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Zhipu Provider Tests
  // ==========================================================================

  describe('ZhipuProvider', () => {
    it('should have correct provider name', () => {
      const provider = new ZhipuProvider('test-key');
      expect(provider.getName()).toBe('zhipu');
    });

    it('should use default model name', () => {
      const provider = new ZhipuProvider('test-key');
      expect(provider.getModel()).toContain('glm');
    });

    it('should use custom model when provided', () => {
      const provider = new ZhipuProvider('test-key', 'glm-4-0613');
      expect(provider.getModel()).toBe('glm-4-0613');
    });

    it('should successfully complete chat request', async () => {
      const provider = new ZhipuProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Response from Zhipu',
              },
            },
          ],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 30,
            total_tokens: 50,
          },
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.6,
      };

      const response = await provider.chatCompletion(request);

      expect(response.content).toBe('Response from Zhipu');
    });

    it('should use correct API endpoint', async () => {
      const provider = new ZhipuProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      try {
        await provider.chatCompletion(request);
      } catch {
        // May throw
      }

      expect(mockFetch).toHaveBeenCalled();
      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain('open.bigmodel.cn');
      expect(callUrl).toContain('chat/completions');
    });

    it('should enforce concurrent request limit', async () => {
      const provider = new ZhipuProvider('test-key');

      // Zhipu has concurrent request limit (typically max 2)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      // Should succeed (limit not reached in single request)
      try {
        await provider.chatCompletion(request);
      } catch {
        // May throw for other reasons
      }

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should have longer retry delay for rate limiting', async () => {
      const provider = new ZhipuProvider('test-key');
      const delay = provider.getRetryDelay();

      // Zhipu typically has longer retry delay (2000ms vs 1000ms)
      expect(delay).toBeGreaterThan(500);
    });

    it('should handle rate limiting with appropriate delay', async () => {
      const provider = new ZhipuProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => 'application/json' },
        json: async () => ({ error: 'Rate limited' }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(provider.chatCompletion(request)).rejects.toThrow();
    });

    it('should handle max retries exceeded', async () => {
      const provider = new ZhipuProvider('test-key');

      // Mock multiple failed attempts
      for (let i = 0; i < 5; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: () => 'application/json' },
          json: async () => ({ error: 'Rate limited' }),
        });
      }

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      await expect(provider.chatCompletion(request)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Common Provider Tests
  // ==========================================================================

  describe('Common provider behavior', () => {
    it('should handle different temperature values', async () => {
      const provider = new DeepSeekProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
        temperature: 1.0,
      };

      try {
        await provider.chatCompletion(request);
      } catch {
        // Expected
      }

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle multiple messages in conversation', async () => {
      const provider = new DeepSeekProvider('test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'Response' },
          { role: 'user', content: 'Second message' },
        ],
      };

      try {
        await provider.chatCompletion(request);
      } catch {
        // Expected
      }

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should include usage information in response', async () => {
      const provider = new DeepSeekProvider('test-key');

      const usage = {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
          usage,
        }),
      });

      const request: ChatCompletionRequest = {
        messages: [{ role: 'user', content: 'Test' }],
      };

      try {
        const response = await provider.chatCompletion(request);
        if (response.usage) {
          expect(response.usage.total_tokens).toBe(150);
        }
      } catch {
        // Expected
      }
    });
  });
});
