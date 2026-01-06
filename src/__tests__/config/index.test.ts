/**
 * Configuration Module Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getConfig, clearConfigCache } from '../../config';
import type { Env } from '../../types/worker';
import { LLMProviderType } from '../../config/constants';

describe('Config Module', () => {
  let mockEnv: Env;

  beforeEach(() => {
    clearConfigCache();
    mockEnv = {
      DB: {} as D1Database,
      LLM_PROVIDER: 'deepseek',
      LLM_DEEPSEEK_API_KEY: 'test-deepseek-key',
      HN_STORY_LIMIT: '30',
      HN_TIME_WINDOW_HOURS: '24',
      SUMMARY_MAX_LENGTH: '300',
      ENABLE_CONTENT_FILTER: 'false',
      CONTENT_FILTER_SENSITIVITY: 'medium',
      CACHE_ENABLED: 'true',
      TARGET_BRANCH: 'main',
      LLM_BATCH_SIZE: '10',
      GITHUB_ENABLED: 'true',
      GITHUB_TOKEN: 'test-github-token',
      TARGET_REPO: 'owner/repo',
      TELEGRAM_ENABLED: 'false',
    } as unknown as Env;
  });

  describe('getConfig', () => {
    it('should build valid configuration from environment', () => {
      const config = getConfig(mockEnv);

      expect(config).toBeDefined();
      expect(config.llm.provider).toBe(LLMProviderType.DEEPSEEK);
      expect(config.llm.deepSeekApiKey).toBe('test-deepseek-key');
      expect(config.hn.storyLimit).toBe(30);
      expect(config.hn.timeWindowHours).toBe(24);
      expect(config.summary.maxLength).toBe(300);
    });

    it('should cache configuration', () => {
      const config1 = getConfig(mockEnv);
      const config2 = getConfig(mockEnv);

      expect(config1).toBe(config2);
    });

    it('should refresh cache when forceRefresh is true', () => {
      const config1 = getConfig(mockEnv);
      mockEnv.HN_STORY_LIMIT = '25';
      const config2 = getConfig(mockEnv, true);

      expect(config1).not.toBe(config2);
      expect(config1.hn.storyLimit).toBe(30);
      expect(config2.hn.storyLimit).toBe(25);
    });

    it('should use default values when environment variables are missing', () => {
      delete (mockEnv as any).LLM_BATCH_SIZE;
      delete (mockEnv as any).TASK_BATCH_SIZE;
      delete (mockEnv as any).MAX_RETRY_COUNT;

      const config = getConfig(mockEnv);

      expect(config.llmBatch.batchSize).toBeDefined();
      expect(config.task.batchSize).toBeDefined();
      expect(config.task.maxRetries).toBeDefined();
    });

    it('should parse boolean values correctly', () => {
      const config = getConfig(mockEnv);

      expect(config.github.enabled).toBe(true);
      expect(config.telegram.enabled).toBe(false);
      expect(config.cache.enabled).toBe(true);
    });
  });

  describe('clearConfigCache', () => {
    it('should clear the configuration cache', () => {
      getConfig(mockEnv);
      clearConfigCache();

      // Should not throw
      const config = getConfig(mockEnv);
      expect(config).toBeDefined();
    });
  });

  describe('Configuration validation', () => {
    it('should throw error when LLM API key is missing', () => {
      delete (mockEnv as any).LLM_DEEPSEEK_API_KEY;

      expect(() => getConfig(mockEnv)).toThrow('LLM_DEEPSEEK_API_KEY is required');
    });

    it('should throw error when HN_STORY_LIMIT is invalid', () => {
      mockEnv.HN_STORY_LIMIT = '150';

      expect(() => getConfig(mockEnv)).toThrow('HN_STORY_LIMIT must be between 1 and 100');
    });

    it('should throw error when TASK_BATCH_SIZE is invalid', () => {
      mockEnv.TASK_BATCH_SIZE = '20';

      expect(() => getConfig(mockEnv)).toThrow('TASK_BATCH_SIZE must be between 1 and 10');
    });

    it('should throw error when no publisher is configured', () => {
      mockEnv.GITHUB_ENABLED = 'false';
      mockEnv.TELEGRAM_ENABLED = 'false';

      expect(() => getConfig(mockEnv)).toThrow('At least one publisher');
    });

    it('should throw error when GitHub is enabled but token is missing', () => {
      mockEnv.GITHUB_ENABLED = 'true';
      delete (mockEnv as any).GITHUB_TOKEN;

      expect(() => getConfig(mockEnv)).toThrow('GITHUB_TOKEN is required');
    });

    it('should throw error when Telegram is enabled but bot token is missing', () => {
      mockEnv.TELEGRAM_ENABLED = 'true';
      delete (mockEnv as any).TELEGRAM_BOT_TOKEN;

      expect(() => getConfig(mockEnv)).toThrow('TELEGRAM_BOT_TOKEN is required');
    });
  });

  describe('LLM Provider Configuration', () => {
    it('should configure DeepSeek provider', () => {
      const config = getConfig(mockEnv);

      expect(config.llm.provider).toBe(LLMProviderType.DEEPSEEK);
      expect(config.llm.deepSeekApiKey).toBe('test-deepseek-key');
    });

    it('should configure OpenRouter provider', () => {
      mockEnv.LLM_PROVIDER = 'openrouter';
      mockEnv.LLM_OPENROUTER_API_KEY = 'test-openrouter-key';

      const config = getConfig(mockEnv);

      expect(config.llm.provider).toBe(LLMProviderType.OPENROUTER);
      expect(config.llm.openRouterApiKey).toBe('test-openrouter-key');
    });

    it('should configure Zhipu provider', () => {
      mockEnv.LLM_PROVIDER = 'zhipu';
      mockEnv.LLM_ZHIPU_API_KEY = 'test-zhipu-key';

      const config = getConfig(mockEnv);

      expect(config.llm.provider).toBe(LLMProviderType.ZHIPU);
      expect(config.llm.zhipuApiKey).toBe('test-zhipu-key');
    });
  });

  describe('GitHub Configuration', () => {
    it('should enable GitHub publishing by default', () => {
      const config = getConfig(mockEnv);

      expect(config.github.enabled).toBe(true);
      expect(config.github.token).toBe('test-github-token');
      expect(config.github.targetRepo).toBe('owner/repo');
    });

    it('should disable GitHub publishing when set to false', () => {
      mockEnv.GITHUB_ENABLED = 'false';
      mockEnv.TELEGRAM_ENABLED = 'true';
      mockEnv.TELEGRAM_BOT_TOKEN = 'test-bot-token';
      mockEnv.TELEGRAM_CHANNEL_ID = '@test-channel';

      const config = getConfig(mockEnv);

      expect(config.github.enabled).toBe(false);
    });
  });

  describe('Telegram Configuration', () => {
    it('should configure Telegram publisher when enabled', () => {
      mockEnv.TELEGRAM_ENABLED = 'true';
      mockEnv.TELEGRAM_BOT_TOKEN = 'test-bot-token';
      mockEnv.TELEGRAM_CHANNEL_ID = '@test-channel';

      const config = getConfig(mockEnv);

      expect(config.telegram.enabled).toBe(true);
      expect(config.telegram.botToken).toBe('test-bot-token');
      expect(config.telegram.channelId).toBe('@test-channel');
    });
  });

  describe('Cache Configuration', () => {
    it('should enable cache by default', () => {
      const config = getConfig(mockEnv);

      expect(config.cache.enabled).toBe(true);
    });

    it('should disable cache when set to false', () => {
      mockEnv.CACHE_ENABLED = 'false';

      const config = getConfig(mockEnv);

      expect(config.cache.enabled).toBe(false);
    });
  });

  describe('Content Filter Configuration', () => {
    it('should enable content filter when set to true', () => {
      mockEnv.ENABLE_CONTENT_FILTER = 'true';

      const config = getConfig(mockEnv);

      expect(config.contentFilter.enabled).toBe(true);
    });

    it('should set sensitivity level from environment', () => {
      mockEnv.CONTENT_FILTER_SENSITIVITY = 'high';

      const config = getConfig(mockEnv);

      expect(config.contentFilter.sensitivity).toBe('high');
    });
  });

  describe('Test Mode Configuration', () => {
    it('should enable test mode when set to true', () => {
      mockEnv.LOCAL_TEST_MODE = 'true';

      const config = getConfig(mockEnv);

      expect(config.testMode.enabled).toBe(true);
    });

    it('should disable test mode by default', () => {
      const config = getConfig(mockEnv);

      expect(config.testMode.enabled).toBe(false);
    });
  });
});
