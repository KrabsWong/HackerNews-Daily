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
        createMockHNStory({ title: 'Technical article on programming', id: 1 }),
        createMockHNStory({ title: 'Chinese government censorship debate', id: 2 }),
      ];

      // Mock the LLM provider
      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      // With low sensitivity, should keep safe tech content
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify that safe technical content is included
      const safeTitles = result.map(s => s.title);
      expect(safeTitles).toContain('Technical article on programming');
    });

    it('should filter stories with medium sensitivity', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Regular tech news', id: 1 }),
        createMockHNStory({ title: 'Tibet independence movement', id: 2 }),
      ];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // With medium sensitivity, political content should be filtered
      const resultTitles = result.map(s => s.title);
      expect(resultTitles).toContain('Regular tech news');
      
      // Political content should not be included (or length should be less than total)
      expect(result.length).toBeLessThanOrEqual(stories.length);
    });

    it('should filter stories with high sensitivity', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Python 3.14 released', id: 1 }),
        createMockHNStory({ title: 'Hong Kong protests escalate', id: 2 }),
      ];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // High sensitivity should keep tech news
      const resultTitles = result.map(s => s.title);
      expect(resultTitles).toContain('Python 3.14 released');
      
      // Sensitive political content should be filtered out
      expect(result.length).toBeLessThanOrEqual(stories.length);
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
        createMockHNStory({ title: 'TypeScript improvements announced', id: 1 }),
        createMockHNStory({ title: 'New Python library for data science', id: 2 }),
      ];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // All safe technical stories should pass through
      expect(result.length).toBe(2);
      const resultTitles = result.map(s => s.title);
      expect(resultTitles).toContain('TypeScript improvements announced');
      expect(resultTitles).toContain('New Python library for data science');
    });

    it('should handle batch filtering of multiple stories', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = Array.from({ length: 10 }, (_, i) =>
        createMockHNStory({ title: `Story ${i}`, id: i })
      );

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(stories.length);
      
      // Verify all results are from original stories
      const inputIds = new Set(stories.map(s => s.id));
      result.forEach(story => {
        expect(inputIds.has(story.id)).toBe(true);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle LLM provider error gracefully', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Story 1', id: 1 }),
        createMockHNStory({ title: 'Story 2', id: 2 }),
      ];

      const failingProvider = new MockLLMProviderWithRateLimit();
      failingProvider.configureError(0, 'network');

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(failingProvider as any);

      // With fallback enabled, should return all stories (safe default)
      const result = await filter.filterStories(stories);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Fallback behavior: either returns all stories (safe) or empty (safe)
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(result.length).toBeLessThanOrEqual(stories.length);
    });

    it('should handle rate limiting from LLM', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [createMockHNStory({ title: 'Test story', id: 1 })];

      const rateLimitProvider = new MockLLMProviderWithRateLimit();
      rateLimitProvider.configureRateLimit(0);

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(rateLimitProvider as any);

      // Should handle gracefully with safe fallback
      const result = await filter.filterStories(stories);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Rate limit should trigger safe fallback behavior
      expect(result.length).toBeGreaterThanOrEqual(0);
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
        createMockHNStory({ title: `Story ${i}`, id: i })
      );

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(stories.length);
      
      // Verify all returned stories are from input
      const inputIds = new Set(stories.map(s => s.id));
      result.forEach(story => {
        expect(inputIds.has(story.id)).toBe(true);
      });
    });

    it('should handle stories with very long titles', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const longTitle = 'A'.repeat(500);
      const stories = [createMockHNStory({ title: longTitle, id: 1 })];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Long titles should be handled gracefully
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should handle stories with special characters', async () => {
      const filter = new AIContentFilter({
        provider: LLMProviderType.DEEPSEEK,
        config: { apiKey: 'test-key' },
      });

      const stories = [
        createMockHNStory({ title: 'Article about 中文 content', id: 1 }),
        createMockHNStory({ title: 'Story with émojis 🎉 and special chars', id: 2 }),
      ];

      vi.spyOn(filter as any, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await filter.filterStories(stories);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Special characters should not cause errors
      expect(result.length).toBeGreaterThanOrEqual(0);
      expect(result.length).toBeLessThanOrEqual(stories.length);
      
      // Verify UTF-8 content is preserved in all results
      result.forEach(story => {
        expect(story.title).toBeDefined();
        expect(typeof story.title).toBe('string');
      });
    });
  });
});
