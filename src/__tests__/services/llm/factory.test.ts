/**
 * Tests for LLM Provider Factory
 * 
 * Tests provider creation logic:
 * - Creating providers from different sources
 * - Provider selection and configuration
 * - Error handling for invalid providers
 * - API key validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLLMProvider, parseProvider, getApiKeyForProvider, createLLMProviderFromEnv } from '../../../services/llm';
import { createMockEnv } from '../../helpers/workerEnvironment';
import { LLMProviderType } from '../../../config/constants';

describe('LLM Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLLMProvider', () => {
    it('should create DeepSeek provider', () => {
      const provider = createLLMProvider({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      expect(provider.getName()).toBe('deepseek');
      expect(provider.getModel()).toBe('deepseek-chat');
    });

    it('should create OpenRouter provider', () => {
      const provider = createLLMProvider({
        provider: LLMProviderType.OPENROUTER,
        config: { apiKey: 'test-key' },
      });

      expect(provider.getName()).toBe('openrouter');
    });

    it('should create Zhipu provider', () => {
      const provider = createLLMProvider({
        provider: LLMProviderType.ZHIPU,
        config: { apiKey: 'test-key' },
      });

      expect(provider.getName()).toBe('zhipu');
      expect(provider.getModel()).toContain('glm');
    });

    it('should throw when API key is missing', () => {
      expect(() => {
        createLLMProvider({
          provider: LLMProviderType.DEEPSEEK,
          config: { apiKey: '' },
        });
      }).toThrow();
    });

    it('should throw on invalid provider name', () => {
      expect(() => {
        parseProvider('invalid-provider');
      }).toThrow();
    });

    it('should use custom model name when provided', () => {
      const provider = createLLMProvider({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key', model: 'deepseek-reasoner' },
      });

      expect(provider.getModel()).toBe('deepseek-reasoner');
    });

    it('should pass site URL and name to OpenRouter', () => {
      const provider = createLLMProvider({
        provider: LLMProviderType.OPENROUTER,
        config: {
          apiKey: 'test-key',
          siteUrl: 'https://example.com',
          siteName: 'My App',
        },
      });

      expect(provider.getName()).toBe('openrouter');
    });
  });

  describe('parseProvider', () => {
    it('should parse deepseek provider', () => {
      const result = parseProvider('deepseek');
      expect(result).toBe(LLMProviderType.DEEPSEEK);
    });

    it('should parse openrouter provider', () => {
      const result = parseProvider('openrouter');
      expect(result).toBe(LLMProviderType.OPENROUTER);
    });

    it('should parse zhipu provider', () => {
      const result = parseProvider('zhipu');
      expect(result).toBe(LLMProviderType.ZHIPU);
    });

    it('should be case insensitive', () => {
      expect(parseProvider('DEEPSEEK')).toBe(LLMProviderType.DEEPSEEK);
      expect(parseProvider('OpenRouter')).toBe(LLMProviderType.OPENROUTER);
      expect(parseProvider('ZHIPU')).toBe(LLMProviderType.ZHIPU);
    });

    it('should throw on invalid provider', () => {
      expect(() => {
        parseProvider('invalid-provider');
      }).toThrow();
    });

    it('should throw on empty string', () => {
      expect(() => {
        parseProvider('');
      }).toThrow();
    });
  });

  describe('getApiKeyForProvider', () => {
    it('should get DeepSeek API key', () => {
      const env = createMockEnv({ llmProvider: 'deepseek' });
      const key = getApiKeyForProvider(LLMProviderType.DEEPSEEK, env);

      expect(key).toBe(env.LLM_DEEPSEEK_API_KEY);
    });

    it('should get OpenRouter API key', () => {
      const env = createMockEnv({ llmProvider: 'openrouter' });
      const key = getApiKeyForProvider(LLMProviderType.OPENROUTER, env);

      expect(key).toBe(env.LLM_OPENROUTER_API_KEY);
    });

    it('should get Zhipu API key', () => {
      const env = createMockEnv({ llmProvider: 'zhipu' });
      const key = getApiKeyForProvider(LLMProviderType.ZHIPU, env);

      expect(key).toBe(env.LLM_ZHIPU_API_KEY);
    });

    it('should throw when API key is missing for deepseek', () => {
      const env = createMockEnv();
      delete (env as any).LLM_DEEPSEEK_API_KEY;

      expect(() => {
        getApiKeyForProvider(LLMProviderType.DEEPSEEK, env);
      }).toThrow();
    });

    it('should throw when API key is missing for openrouter', () => {
      const env = createMockEnv();
      delete (env as any).LLM_OPENROUTER_API_KEY;

      expect(() => {
        getApiKeyForProvider(LLMProviderType.OPENROUTER, env);
      }).toThrow();
    });

    it('should throw when API key is missing for zhipu', () => {
      const env = createMockEnv();
      delete (env as any).LLM_ZHIPU_API_KEY;

      expect(() => {
        getApiKeyForProvider(LLMProviderType.ZHIPU, env);
      }).toThrow();
    });

    it('should throw on invalid provider', () => {
      const env = createMockEnv();

      expect(() => {
        getApiKeyForProvider('invalid-provider' as any, env);
      }).toThrow();
    });
  });

  describe('Provider configuration from environment', () => {
    it('should read all DeepSeek configuration from env', () => {
      const env = {
        LLM_PROVIDER: 'deepseek',
        LLM_DEEPSEEK_API_KEY: 'sk-deepseek-123',
        LLM_DEEPSEEK_MODEL: 'deepseek-reasoner',
      };

      const provider = createLLMProviderFromEnv(env as any);

      expect(provider.getName()).toBe('deepseek');
      expect(provider.getModel()).toBe('deepseek-reasoner');
    });

    it('should read all OpenRouter configuration from env', () => {
      const env = {
        LLM_PROVIDER: 'openrouter',
        LLM_OPENROUTER_API_KEY: 'sk-or-123',
        LLM_OPENROUTER_MODEL: 'claude-2',
        LLM_OPENROUTER_SITE_URL: 'https://myapp.com',
        LLM_OPENROUTER_SITE_NAME: 'My App',
      };

      const provider = createLLMProviderFromEnv(env as any);

      expect(provider.getName()).toBe('openrouter');
      expect(provider.getModel()).toBe('claude-2');
    });

    it('should read all Zhipu configuration from env', () => {
      const env = {
        LLM_PROVIDER: 'zhipu',
        LLM_ZHIPU_API_KEY: 'sk-zhipu-123',
        LLM_ZHIPU_MODEL: 'glm-4-0613',
      };

      const provider = createLLMProviderFromEnv(env as any);

      expect(provider.getName()).toBe('zhipu');
      expect(provider.getModel()).toBe('glm-4-0613');
    });

    it('should use defaults when custom models not specified', () => {
      const provider = createLLMProviderFromEnv({ LLM_PROVIDER: 'deepseek', LLM_DEEPSEEK_API_KEY: 'test-key' } as any);

      expect(provider.getModel()).toBe('deepseek-chat');
    });
  });

  describe('Error messages', () => {
    it('should provide clear error for missing API key', () => {
      expect(() => {
        createLLMProvider({
          provider: 'deepseek',
          env: {},
        });
      }).toThrow(/API key|required/i);
    });

    it('should provide clear error for invalid provider', () => {
      expect(() => {
        parseProvider('unknown-provider');
      }).toThrow(/provider|invalid/i);
    });

    it('should include provider name in error message', () => {
      try {
        createLLMProvider({
          provider: 'openrouter',
          env: {},
        });
        expect.fail('Should have thrown');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toContain('openrouter');
      }
    });
  });

  describe('Provider consistency', () => {
    it('should maintain provider identity across creations', () => {
      const provider1 = createLLMProviderFromEnv({ LLM_PROVIDER: 'deepseek', LLM_DEEPSEEK_API_KEY: 'key1' } as any);

      const provider2 = createLLMProviderFromEnv({ LLM_PROVIDER: 'deepseek', LLM_DEEPSEEK_API_KEY: 'key2' } as any);

      expect(provider1.getName()).toBe(provider2.getName());
      expect(provider1.getModel()).toBe(provider2.getModel());
    });

    it('should create different provider types', () => {
      const deepseek = createLLMProviderFromEnv({ LLM_PROVIDER: 'deepseek', LLM_DEEPSEEK_API_KEY: 'key1' } as any);

      const openrouter = createLLMProviderFromEnv({ LLM_PROVIDER: 'openrouter', LLM_OPENROUTER_API_KEY: 'key2' } as any);

      const zhipu = createLLMProviderFromEnv({ LLM_PROVIDER: 'zhipu', LLM_ZHIPU_API_KEY: 'key3' } as any);

      expect(deepseek.getName()).not.toBe(openrouter.getName());
      expect(openrouter.getName()).not.toBe(zhipu.getName());
      expect(zhipu.getName()).not.toBe(deepseek.getName());
    });
  });

  describe('Environment variable handling', () => {
    it('should ignore unknown environment variables', () => {
      const env = {
        LLM_PROVIDER: 'deepseek',
        LLM_DEEPSEEK_API_KEY: 'test-key',
        UNKNOWN_VAR: 'should be ignored',
        ANOTHER_UNKNOWN: 'also ignored',
      };

      const provider = createLLMProviderFromEnv(env as any);

      expect(provider.getName()).toBe('deepseek');
    });

    it('should handle empty environment object', () => {
      expect(() => {
        createLLMProvider({
          provider: 'deepseek',
          env: {},
        });
      }).toThrow();
    });

    it('should handle undefined environment values gracefully', () => {
      const env = {
        LLM_DEEPSEEK_API_KEY: undefined,
      };

      expect(() => {
        createLLMProvider({
          provider: 'deepseek',
          env: env as any,
        });
      }).toThrow();
    });
  });

  describe('API key formats', () => {
    it('should accept API keys of various lengths', () => {
      const keys = [
        'short-key',
        'sk-' + 'x'.repeat(48),
        'sk-' + 'x'.repeat(100),
      ];

      for (const key of keys) {
        const provider = createLLMProviderFromEnv({ LLM_PROVIDER: 'deepseek', LLM_DEEPSEEK_API_KEY: key } as any);

        expect(provider.getName()).toBe('deepseek');
      }
    });

    it('should accept keys with various characters', () => {
      const keys = [
        'key-with-dash-123',
        'key_with_underscore_456',
        'key.with.dot.789',
        'keyWithCamelCase',
      ];

      for (const key of keys) {
        const provider = createLLMProviderFromEnv({ LLM_PROVIDER: 'deepseek', LLM_DEEPSEEK_API_KEY: key } as any);

        expect(provider.getName()).toBe('deepseek');
      }
    });
  });
});
