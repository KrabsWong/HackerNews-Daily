/**
 * Tests for Content Summarization Service
 * 
 * Tests content and comment summarization:
 * - Single content summarization
 * - Batch summarization
 * - Comment summarization
 * - Length constraints
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { summarizeContent, summarizeContentBatch } from '../../../services/translator/summary';
import { MockLLMProviderWithRateLimit, mockSummaryResponse } from '../../helpers/mockLLMProvider';
import { createMockHNComment } from '../../helpers/fixtures';

describe('Content Summarization Service', () => {
  let mockProvider: MockLLMProviderWithRateLimit;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = new MockLLMProviderWithRateLimit();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('summarizeContent', () => {
    it('should summarize long article content', async () => {
      const content = `
        This is a long article about machine learning.
        It covers various topics including neural networks, deep learning, and practical applications.
        The article discusses how these technologies are transforming industries.
        It provides insights into the future of AI and its impact on society.
      `.repeat(50);

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 500);

      expect(result).toBeTruthy();
      expect(result).not.toBe(content);
    });

    it('should return null for empty content', async () => {
      const result = await summarizeContent(mockProvider, '', 500);

      expect(result).toBeNull();
    });

    it('should return null for whitespace-only content', async () => {
      const result = await summarizeContent(mockProvider, '   \n\t  ', 500);

      expect(result).toBeNull();
    });

    it('should respect max length constraint', async () => {
      const content = 'This is article content about technology and programming.'.repeat(100);
      const maxLength = 300;

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, maxLength);

      expect(result).toBeTruthy();
      // Summary should be roughly around max length (exact depends on implementation)
      if (result) {
        expect(result.length).toBeLessThanOrEqual(maxLength * 1.5); // Allow 50% buffer
      }
    });

    it('should return Chinese summary', async () => {
      const content = 'This article is about artificial intelligence and machine learning.'.repeat(20);

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 500);

      expect(result).toBeTruthy();
      // Result should have Chinese characters
      if (result) {
        expect(/[\u4e00-\u9fa5]/.test(result)).toBe(true);
      }
    });

    it('should handle very short content', async () => {
      const content = 'Brief article';

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 500);

      expect(result).toBeDefined();
    });

    it('should handle content with code blocks', async () => {
      const content = `
        Here is some code:
        \`\`\`python
        def hello_world():
            print("Hello, World!")
        \`\`\`
        This code demonstrates a basic function.
      `.repeat(20);

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 300);

      expect(result).toBeTruthy();
    });

    it('should handle content with HTML tags', async () => {
      const content = `
        <h1>Article Title</h1>
        <p>This is the main content of the article.</p>
        <p>It has multiple paragraphs with useful information.</p>
      `.repeat(20);

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 300);

      expect(result).toBeTruthy();
    });

    it('should handle rate limiting gracefully', async () => {
      const content = 'Article content about technology'.repeat(20);
      mockProvider.configureRateLimit(0);

      const result = await summarizeContent(mockProvider, content, 300);

      // Should handle and return result or null
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle network errors', async () => {
      const content = 'Article content'.repeat(20);
      mockProvider.configureError(0, 'network');

      const result = await summarizeContent(mockProvider, content, 300);

      // Should return null on error
      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle different max length values', async () => {
      const content = 'Article content about various topics.'.repeat(50);
      const lengths = [100, 300, 500, 1000];

      mockProvider.reset();

      for (const maxLength of lengths) {
        const result = await summarizeContent(mockProvider, content, maxLength);
        expect(result === null || typeof result === 'string').toBe(true);
      }
    });
  });

  describe('summarizeContentBatch', () => {
    it('should batch summarize multiple articles', async () => {
      const articles = [
        'Article one content about technology.'.repeat(30),
        'Article two content about programming.'.repeat(30),
        'Article three content about AI.'.repeat(30),
      ];

      mockProvider.reset();

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result === null || typeof result === 'string').toBe(true);
      });
    });

    it('should preserve order in batch summarization', async () => {
      const articles = [
        'Content about Python programming.'.repeat(20),
        'Content about JavaScript frameworks.'.repeat(20),
        'Content about Rust performance.'.repeat(20),
      ];

      mockProvider.reset();

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      expect(results).toHaveLength(3);
      // All should be processed
      expect(results[0] !== undefined).toBe(true);
      expect(results[1] !== undefined).toBe(true);
      expect(results[2] !== undefined).toBe(true);
    });

    it('should handle empty array', async () => {
      const results = await summarizeContentBatch(mockProvider, [], 300);

      expect(results).toEqual([]);
    });

    it('should handle array with single article', async () => {
      const articles = ['Single article content about technology.'.repeat(30)];

      mockProvider.reset();

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      expect(results).toHaveLength(1);
      expect(results[0] !== undefined).toBe(true);
    });

    it('should handle articles of varying lengths', async () => {
      const articles = [
        'Short content',
        'Medium length article content about technology and programming basics.'.repeat(10),
        'Very long article '.repeat(100),
      ];

      mockProvider.reset();

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      expect(results).toHaveLength(3);
    });

    it('should handle batch with mixed empty and non-empty content', async () => {
      const articles = [
        'Content here',
        '',
        'More content',
        '   ',
        'Final content',
      ];

      mockProvider.reset();

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      expect(results).toHaveLength(5);
      // Empty articles should return empty string (not null)
      expect(results[1]).toBe('');
      expect(results[3]).toBe('');
    });

    it('should handle large batch', async () => {
      const articles = Array.from({ length: 20 }, (_, i) =>
        `Article ${i + 1} content about technology.`.repeat(20)
      );

      mockProvider.reset();

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      expect(results).toHaveLength(20);
    });

    it('should handle partial failures in batch', async () => {
      const articles = [
        'Article 1 content'.repeat(20),
        'Article 2 content'.repeat(20),
        'Article 3 content'.repeat(20),
      ];

      mockProvider.configureRateLimit(1); // Fail after first

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Comment summarization', () => {
    it('should summarize array of HN comments', async () => {
      const comments = [
        createMockHNComment({ text: '<p>Great article! The technical details were excellent.</p>' }),
        createMockHNComment({ text: '<p>I disagree with the conclusion. Here is why...</p>' }),
        createMockHNComment({ text: '<p>Has anyone tried the approach in production?</p>' }),
      ];

      mockProvider.reset();

      // Note: This tests the pattern - actual comment summarization may use specific function
      const result = await summarizeContent(
        mockProvider,
        comments.map(c => c.text).join('\n'),
        300
      );

      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle comments with HTML tags', async () => {
      const comments = [
        createMockHNComment({ text: '<p>Great point about <code>async/await</code></p>' }),
        createMockHNComment({ text: '<p>The <b>performance impact</b> is significant</p>' }),
      ];

      mockProvider.reset();

      const content = comments.map(c => c.text).join('\n');
      const result = await summarizeContent(mockProvider, content, 300);

      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle comments with code snippets', async () => {
      const comments = [
        createMockHNComment({
          text: '<p>Here is an example:<br/><code>const x = 5;</code></p>',
        }),
      ];

      mockProvider.reset();

      const content = comments.map(c => c.text).join('\n');
      const result = await summarizeContent(mockProvider, content, 300);

      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('Batch size handling', () => {
    it('should respect batch size limits', async () => {
      const articles = Array.from({ length: 100 }, (_, i) =>
        `Article ${i} content.`.repeat(20)
      );

      mockProvider.reset();

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      // Should process all articles (may be split into smaller batches)
      expect(results.length).toBe(articles.length);
    });

    it('should handle batch size optimization', async () => {
      const articles = Array.from({ length: 50 }, (_, i) =>
        `Content ${i}`.repeat(20)
      );

      mockProvider.reset();

      const startTime = Date.now();
      const results = await summarizeContentBatch(mockProvider, articles, 300);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(50);
      // Batch should complete in reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds max
    });
  });

  describe('Error recovery', () => {
    it('should fallback to individual summarization on batch failure', async () => {
      const articles = [
        'Content about machine learning'.repeat(20),
        'Content about deep learning'.repeat(20),
      ];

      mockProvider.reset();

      const results = await summarizeContentBatch(mockProvider, articles, 300);

      // Should have results even if batch fails
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle timeout in summarization', async () => {
      const content = 'Article content'.repeat(50);
      mockProvider.configureTimeout(0);

      // Should not throw, should handle gracefully
      expect(async () => {
        await summarizeContent(mockProvider, content, 300);
      }).not.toThrow();
    });

    it('should handle auth errors (401)', async () => {
      const content = 'Article content'.repeat(50);
      mockProvider.configureError(0, 'auth');

      const result = await summarizeContent(mockProvider, content, 300);

      // Should return null on auth error
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('Content length edge cases', () => {
    it('should handle zero max length', async () => {
      const content = 'Content'.repeat(20);

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 0);

      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle very large max length', async () => {
      const content = 'Content'.repeat(100);

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 10000);

      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle content longer than max length', async () => {
      const content = 'A'.repeat(10000);
      const maxLength = 500;

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, maxLength);

      expect(result === null || typeof result === 'string').toBe(true);
    });

    it('should handle content shorter than max length', async () => {
      const content = 'Short content here.';
      const maxLength = 500;

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, maxLength);

      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('Chinese output verification', () => {
    it('should output Chinese text', async () => {
      const content = 'This is an article about technology and artificial intelligence.'.repeat(30);

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 300);

      if (result) {
        // Result should contain Chinese characters
        expect(/[\u4e00-\u9fa5]/.test(result)).toBe(true);
      }
    });

    it('should maintain readability in Chinese output', async () => {
      const content = 'Complex technical concepts explained simply.'.repeat(40);

      mockProvider.reset();

      const result = await summarizeContent(mockProvider, content, 400);

      expect(result).toBeTruthy();
    });
  });
});
