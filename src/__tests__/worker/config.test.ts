/**
 * Tests for Worker configuration validation
 * 
 * Validates:
 * - LLM provider configuration
 * - Publisher setup (GitHub, Telegram, Terminal)
 * - Required environment variables
 * - Configuration combinations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateWorkerConfig,
  isGitHubConfigValid,
  isTelegramConfigValid,
  isGitHubEnabled,
  isTelegramEnabled,
  validateGitHubConfig,
  validateTelegramConfig,
} from '../../worker/config/validation';
import { createMockEnv } from '../helpers/workerEnvironment';
import type { Env } from '../../worker';

describe('Worker Configuration Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GitHub configuration validation', () => {
    it('should return true when GitHub is enabled with valid config', () => {
      const env = createMockEnv({ githubEnabled: true });
      expect(isGitHubConfigValid(env)).toBe(true);
    });

    it('should return false when GitHub is disabled', () => {
      const env = createMockEnv({ githubEnabled: false });
      expect(isGitHubConfigValid(env)).toBe(false);
    });

    it('should return false when GITHUB_TOKEN is missing', () => {
      const env = createMockEnv({ githubEnabled: true });
      delete (env as any).GITHUB_TOKEN;
      expect(isGitHubConfigValid(env)).toBe(false);
    });

    it('should return false when TARGET_REPO is missing', () => {
      const env = createMockEnv({ githubEnabled: true });
      delete (env as any).TARGET_REPO;
      expect(isGitHubConfigValid(env)).toBe(false);
    });

    it('should return true by default (GitHub is enabled by default)', () => {
      const env = createMockEnv();
      expect(isGitHubEnabled(env)).toBe(true);
      expect(isGitHubConfigValid(env)).toBe(true);
    });
  });

  describe('validateGitHubConfig', () => {
    it('should return no warnings when config is valid', () => {
      const env = createMockEnv({ githubEnabled: true });
      const warnings = validateGitHubConfig(env);
      expect(warnings).toEqual([]);
    });

    it('should warn when GITHUB_TOKEN is missing but enabled', () => {
      const env = createMockEnv({ githubEnabled: true });
      delete (env as any).GITHUB_TOKEN;
      const warnings = validateGitHubConfig(env);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('GITHUB_TOKEN');
    });

    it('should warn when TARGET_REPO is missing but enabled', () => {
      const env = createMockEnv({ githubEnabled: true });
      delete (env as any).TARGET_REPO;
      const warnings = validateGitHubConfig(env);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('TARGET_REPO');
    });

    it('should return empty warnings when GitHub is disabled', () => {
      const env = createMockEnv({ githubEnabled: false });
      delete (env as any).GITHUB_TOKEN;
      delete (env as any).TARGET_REPO;
      const warnings = validateGitHubConfig(env);
      expect(warnings).toEqual([]);
    });
  });

  describe('Telegram configuration validation', () => {
    it('should return true when Telegram is enabled with valid config', () => {
      const env = createMockEnv({ telegramEnabled: true });
      expect(isTelegramConfigValid(env)).toBe(true);
    });

    it('should return false when Telegram is disabled', () => {
      const env = createMockEnv({ telegramEnabled: false });
      expect(isTelegramConfigValid(env)).toBe(false);
    });

    it('should return false when TELEGRAM_BOT_TOKEN is missing', () => {
      const env = createMockEnv({ telegramEnabled: true });
      delete (env as any).TELEGRAM_BOT_TOKEN;
      expect(isTelegramConfigValid(env)).toBe(false);
    });

    it('should return false when TELEGRAM_CHANNEL_ID is missing', () => {
      const env = createMockEnv({ telegramEnabled: true });
      delete (env as any).TELEGRAM_CHANNEL_ID;
      expect(isTelegramConfigValid(env)).toBe(false);
    });

    it('should be case insensitive for enabled check', () => {
      const env = { ...createMockEnv(), TELEGRAM_ENABLED: 'TRUE' };
      expect(isTelegramEnabled(env)).toBe(true);
    });
  });

  describe('validateTelegramConfig', () => {
    it('should return no warnings when config is valid', () => {
      const env = createMockEnv({ telegramEnabled: true });
      const warnings = validateTelegramConfig(env);
      expect(warnings).toEqual([]);
    });

    it('should warn when TELEGRAM_BOT_TOKEN is missing but enabled', () => {
      const env = createMockEnv({ telegramEnabled: true });
      delete (env as any).TELEGRAM_BOT_TOKEN;
      const warnings = validateTelegramConfig(env);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('TELEGRAM_BOT_TOKEN');
    });

    it('should warn when TELEGRAM_CHANNEL_ID is missing but enabled', () => {
      const env = createMockEnv({ telegramEnabled: true });
      delete (env as any).TELEGRAM_CHANNEL_ID;
      const warnings = validateTelegramConfig(env);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('TELEGRAM_CHANNEL_ID');
    });

    it('should return empty warnings when Telegram is disabled', () => {
      const env = createMockEnv({ telegramEnabled: false });
      delete (env as any).TELEGRAM_BOT_TOKEN;
      delete (env as any).TELEGRAM_CHANNEL_ID;
      const warnings = validateTelegramConfig(env);
      expect(warnings).toEqual([]);
    });
  });

  describe('validateWorkerConfig', () => {
    it('should pass with valid GitHub + LLM config', () => {
      const env = createMockEnv({ githubEnabled: true, llmProvider: 'deepseek' });
      expect(() => validateWorkerConfig(env)).not.toThrow();
    });

    it('should pass with valid Telegram + LLM config', () => {
      const env = createMockEnv({ telegramEnabled: true, llmProvider: 'deepseek' });
      expect(() => validateWorkerConfig(env)).not.toThrow();
    });

    it('should throw when LLM_PROVIDER is missing', () => {
      const env = createMockEnv();
      delete (env as any).LLM_PROVIDER;
      expect(() => validateWorkerConfig(env)).toThrow();
    });

    it('should throw when LLM provider API key is missing', () => {
      const env = createMockEnv({ llmProvider: 'deepseek' });
      delete (env as any).LLM_DEEPSEEK_API_KEY;
      expect(() => validateWorkerConfig(env)).toThrow();
    });

    it('should throw when no publisher is enabled', () => {
      const env = createMockEnv({
        githubEnabled: false,
        telegramEnabled: false,
        llmProvider: 'deepseek',
      });
      expect(() => validateWorkerConfig(env)).toThrow();
    });

    it('should throw when GitHub is enabled but missing TARGET_REPO', () => {
      const env = createMockEnv({ githubEnabled: true });
      delete (env as any).TARGET_REPO;
      expect(() => validateWorkerConfig(env)).toThrow();
    });

    it('should throw when GitHub is enabled but missing GITHUB_TOKEN', () => {
      const env = createMockEnv({ githubEnabled: true });
      delete (env as any).GITHUB_TOKEN;
      expect(() => validateWorkerConfig(env)).toThrow();
    });

    it('should throw when Telegram is enabled but missing TELEGRAM_BOT_TOKEN', () => {
      const env = createMockEnv({
        telegramEnabled: true,
        githubEnabled: false,
        llmProvider: 'deepseek',
      });
      delete (env as any).TELEGRAM_BOT_TOKEN;
      expect(() => validateWorkerConfig(env)).toThrow();
    });

    it('should throw when Telegram is enabled but missing TELEGRAM_CHANNEL_ID', () => {
      const env = createMockEnv({
        telegramEnabled: true,
        githubEnabled: false,
        llmProvider: 'deepseek',
      });
      delete (env as any).TELEGRAM_CHANNEL_ID;
      expect(() => validateWorkerConfig(env)).toThrow();
    });

    it('should throw with multiple error messages when multiple issues exist', () => {
      const env = createMockEnv();
      delete (env as any).LLM_PROVIDER;
      delete (env as any).GITHUB_TOKEN;
      try {
        validateWorkerConfig(env);
        expect.fail('Should have thrown');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        expect(message).toContain('configuration validation failed');
      }
    });

    it('should pass with OpenRouter provider', () => {
      const env = createMockEnv({
        llmProvider: 'openrouter',
        githubEnabled: true,
      });
      expect(() => validateWorkerConfig(env)).not.toThrow();
    });

    it('should pass with Zhipu provider', () => {
      const env = createMockEnv({
        llmProvider: 'zhipu',
        githubEnabled: true,
      });
      expect(() => validateWorkerConfig(env)).not.toThrow();
    });

    it('should throw on invalid LLM provider', () => {
      const env = createMockEnv() as any;
      env.LLM_PROVIDER = 'invalid-provider';
      expect(() => validateWorkerConfig(env)).toThrow();
    });
  });

  describe('Configuration combinations', () => {
    it('should allow GitHub disabled + Telegram enabled', () => {
      const env = createMockEnv({
        githubEnabled: false,
        telegramEnabled: true,
        llmProvider: 'deepseek',
      });
      expect(() => validateWorkerConfig(env)).not.toThrow();
    });

    it('should allow both GitHub and Telegram enabled', () => {
      const env = createMockEnv({
        githubEnabled: true,
        telegramEnabled: true,
        llmProvider: 'deepseek',
      });
      expect(() => validateWorkerConfig(env)).not.toThrow();
    });
  });
});
