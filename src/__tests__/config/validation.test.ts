/**
 * Configuration Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../config/validation';
import type { AppConfig } from '../../config/schema';
import { LLMProviderType } from '../../config/constants';

describe('Config Validation', () => {
  const buildValidConfig = (): AppConfig => ({
    llm: {
      provider: LLMProviderType.DEEPSEEK,
      deepSeekApiKey: 'test-key',
    },
    hn: {
      storyLimit: 30,
      timeWindowHours: 24,
    },
    summary: {
      maxLength: 300,
    },
    task: {
      batchSize: 6,
      maxRetries: 3,
    },
    cache: {
      enabled: true,
      ttlMinutes: 30,
    },
    contentFilter: {
      enabled: false,
      sensitivity: 'medium',
      timeout: 15000,
      fallbackOnError: true,
    },
    llmBatch: {
      batchSize: 10,
      minBatchSize: 0,
      maxBatchSize: 0,
      maxContentPerArticle: 0,
      defaultConcurrency: 5,
    },
    github: {
      enabled: true,
      token: 'test-token',
      targetRepo: 'owner/repo',
      targetBranch: 'main',
    },
    telegram: {
      enabled: false,
    } as any,
    crawler: {
      enabled: false,
    },
    testMode: {
      enabled: false,
    },
  });

  describe('LLM Configuration Validation', () => {
    it('should pass with valid DeepSeek configuration', () => {
      const config = buildValidConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when DeepSeek API key is missing', () => {
      const config = buildValidConfig();
      config.llm.deepSeekApiKey = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('LLM_DEEPSEEK_API_KEY'))).toBe(true);
    });

    it('should fail when LLM provider is invalid', () => {
      const config = buildValidConfig();
      config.llm.provider = 'invalid' as any;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid LLM_PROVIDER'))).toBe(true);
    });
  });

  describe('HackerNews Configuration Validation', () => {
    it('should pass with valid HN configuration', () => {
      const config = buildValidConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should fail when story limit is out of range', () => {
      const config = buildValidConfig();
      config.hn.storyLimit = 150;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('HN_STORY_LIMIT'))).toBe(true);
    });

    it('should fail when time window is out of range', () => {
      const config = buildValidConfig();
      config.hn.timeWindowHours = 200;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('HN_TIME_WINDOW_HOURS'))).toBe(true);
    });
  });

  describe('Task Configuration Validation', () => {
    it('should pass with valid task configuration', () => {
      const config = buildValidConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should fail when batch size is out of range', () => {
      const config = buildValidConfig();
      config.task.batchSize = 20;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('TASK_BATCH_SIZE'))).toBe(true);
    });

    it('should fail when retry count is negative', () => {
      const config = buildValidConfig();
      config.task.maxRetries = -1;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('MAX_RETRY_COUNT'))).toBe(true);
    });
  });

  describe('GitHub Configuration Validation', () => {
    it('should pass with valid GitHub configuration', () => {
      const config = buildValidConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should fail when GitHub is enabled but token is missing', () => {
      const config = buildValidConfig();
      config.github.token = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('GITHUB_TOKEN'))).toBe(true);
    });

    it('should fail when GitHub is enabled but target repo is missing', () => {
      const config = buildValidConfig();
      config.github.targetRepo = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('TARGET_REPO'))).toBe(true);
    });
  });

  describe('Telegram Configuration Validation', () => {
    it('should pass when Telegram is disabled', () => {
      const config = buildValidConfig();
      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should pass with valid Telegram configuration', () => {
      const config = buildValidConfig();
      config.telegram = {
        enabled: true,
        botToken: 'test-token',
        channelId: '@test',
        batchSize: 2,
        messageDelay: 500,
      };

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should fail when Telegram is enabled but bot token is missing', () => {
      const config = buildValidConfig();
      config.telegram.enabled = true;
      config.telegram.botToken = undefined;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('TELEGRAM_BOT_TOKEN'))).toBe(true);
    });

    it('should fail when batch size is out of range', () => {
      const config = buildValidConfig();
      config.telegram.enabled = true;
      config.telegram.batchSize = 20;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('TELEGRAM_BATCH_SIZE'))).toBe(true);
    });
  });

  describe('Publisher Validation', () => {
    it('should pass when at least one publisher is configured', () => {
      const config = buildValidConfig();
      config.github.enabled = true;
      config.telegram.enabled = false;

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
    });

    it('should fail when no publisher is configured', () => {
      const config = buildValidConfig();
      config.github.enabled = false;
      config.telegram.enabled = false;

      const result = validateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('At least one publisher'))).toBe(true);
    });

    it('should pass when LOCAL_TEST_MODE is enabled even without publishers', () => {
      const config = buildValidConfig();
      config.github.enabled = false;
      config.telegram.enabled = false;
      config.testMode.enabled = true;

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when LOCAL_TEST_MODE is enabled with publishers disabled', () => {
      const config = buildValidConfig();
      config.github.enabled = false;
      config.github.token = undefined;
      config.github.targetRepo = undefined;
      config.telegram.enabled = false;
      config.testMode.enabled = true;

      const result = validateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
