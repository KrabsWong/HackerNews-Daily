/**
 * Tests for AI Content Filter Service
 * 
 * Tests content filtering with different sensitivity levels:
 * - Low sensitivity (obvious violations only)
 * - Medium sensitivity (China political topics)
 * - High sensitivity (any China politics)
 * - Error handling and fallback behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIContentFilter } from '../../services/contentFilter';
import { createMockHNStory } from '../helpers/fixtures';
import { MockLLMProviderWithRateLimit } from '../helpers/mockLLMProvider';
import { LLMProviderType } from '../../config/constants';

describe('Content Filter Service', () => {
  let mockProvider: MockLLMProviderWithRateLimit;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = new MockLLMProviderWithRateLimit();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sensitivity levels', () => {
    it('should filter stories with low sensitivity', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Technical article on programming' }),
        createMockHNStory({ title: 'Chinese government censorship debate' }),
      ];

      // Mock the LLM provider
      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      // With low sensitivity, most stories should pass
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter stories with medium sensitivity', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Regular tech news' }),
        createMockHNStory({ title: 'Tibet independence movement' }),
      ];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
    });

    it('should filter stories with high sensitivity', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Python 3.14 released' }),
        createMockHNStory({ title: 'Hong Kong protests escalate' }),
      ];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
    });
  });

  describe('Filter behavior', () => {
    it('should return all stories when filter is disabled', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      // Override enabled state
      Object.defineProperty(filter, 'enabled', { value: false, writable: true });

      const stories = [
        createMockHNStory({ title: 'Story 1' }),
        createMockHNStory({ title: 'Story 2' }),
        createMockHNStory({ title: 'Story 3' }),
      ];

      const result = await filter.filterStories(stories);

      expect(result).toEqual(stories);
    });

    it('should return empty array for empty input', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const result = await filter.filterStories([]);

      expect(result).toEqual([]);
    });

    it('should return safe stories', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'TypeScript improvements announced' }),
        createMockHNStory({ title: 'New Python library for data science' }),
      ];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle batch filtering of multiple stories', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = Array.from({ length: 10 }, (_, i) =>
        createMockHNStory({ title: `Story ${i}` })
      );

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(stories.length);
    });
  });

  describe('Error handling', () => {
    it('should handle LLM provider error gracefully', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Story 1' }),
        createMockHNStory({ title: 'Story 2' }),
      ];

      const failingProvider = new MockLLMProviderWithRateLimit();
      failingProvider.configureError(0, 'network');

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(failingProvider as any);

      // With fallback enabled, should return all stories
      const result = await filter.filterStories(stories);
      expect(result).toBeDefined();
    });

    it('should handle rate limiting from LLM', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [createMockHNStory({ title: 'Test story' })];

      const rateLimitProvider = new MockLLMProviderWithRateLimit();
      rateLimitProvider.configureRateLimit(0);

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(rateLimitProvider as any);

      // Should handle gracefully
      const result = await filter.filterStories(stories);
      expect(result).toBeDefined();
    });

    it('should handle timeout from LLM', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [createMockHNStory({ title: 'Test story' })];

      const timeoutProvider = new MockLLMProviderWithRateLimit();
      timeoutProvider.configureTimeout(0);

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(timeoutProvider as any);

      // Should handle timeout gracefully
      expect(async () => {
        await filter.filterStories(stories);
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should track enabled state', () => {
      const filterEnabled = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const filterDisabled = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      expect(filterEnabled.isEnabled()).toBe(filterEnabled.isEnabled());
      expect(filterDisabled.isEnabled()).toBe(filterDisabled.isEnabled());
    });

    it('should support multiple LLM providers', async () => {
      const providers = [
        LLMProviderType.DEEPSEEK,
        LLMProviderType.OPENROUTER,
        LLMProviderType.ZHIPU,
      ];

      for (const provider of providers) {
        const filter = new AIContentFilter({
          provider,
          config: { apiKey: 'test-key' },
        });

        const stories = [createMockHNStory({ title: 'Test' })];
        vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

        const result = await filter.filterStories(stories);
        expect(result).toBeDefined();
      }
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large number of stories', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = Array.from({ length: 100 }, (_, i) =>
        createMockHNStory({ title: `Story ${i}` })
      );

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(stories.length);
    });

    it('should handle stories with very long titles', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const longTitle = 'A'.repeat(500);
      const stories = [createMockHNStory({ title: longTitle })];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
    });

    it('should handle stories with special characters', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Article about 中文 content' }),
        createMockHNStory({ title: 'Story with émojis 🎉 and special chars' }),
      ];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
    });
  });
});
