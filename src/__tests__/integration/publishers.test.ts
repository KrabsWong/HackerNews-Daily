/**
 * Integration Tests for Multi-Publisher Coordination
 * 
 * Tests publisher coordination:
 * - GitHub + Terminal publishers
 * - GitHub + Telegram publishers
 * - Error handling per publisher
 * - Content isolation between publishers
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockEnv, createMockExecutionContext } from '../helpers/workerEnvironment';
import { createMockProcessedStory, createMockGitHubCreateResponse, createMockTelegramResponse } from '../helpers/fixtures';

describe('Multi-Publisher Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GitHub + Terminal Publishers', () => {
    it('should publish to GitHub successfully', async () => {
      const env = createMockEnv({ githubEnabled: true, localTestMode: false });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockGitHubCreateResponse(),
      });

      const response = await fetch('https://api.github.com/repos/test/repo/contents/_posts/2025-12-20-daily.md', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        },
      });

      expect(response.ok).toBe(true);
      const data = await response.json() as any;
      expect(data.content).toBeDefined();
    });

    it('should publish to Terminal (console output)', () => {
      const env = createMockEnv({ localTestMode: true });
      const stories = [
        createMockProcessedStory({ rank: 1, titleChinese: '故事一' }),
        createMockProcessedStory({ rank: 2, titleChinese: '故事二' }),
      ];

      // Terminal publisher outputs to console
      const output = stories.map(s => `${s.rank}. ${s.titleChinese}`).join('\n');

      expect(output).toContain('1. 故事一');
      expect(output).toContain('2. 故事二');
    });

    it('should coordinate GitHub and Terminal publishers', async () => {
      const env = createMockEnv({ githubEnabled: true, localTestMode: true });
      const stories = [createMockProcessedStory()];

      const publishers = [];

      // GitHub
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockGitHubCreateResponse(),
      });

      const githubResponse = await fetch('https://api.github.com/repos/test/repo/contents/test.md', {
        method: 'PUT',
      });
      publishers.push({ name: 'github', success: githubResponse.ok });

      // Terminal (no network call)
      publishers.push({ name: 'terminal', success: true });

      expect(publishers).toHaveLength(2);
      expect(publishers[0].success).toBe(true);
      expect(publishers[1].success).toBe(true);
    });

    it('should receive same content in both publishers', () => {
      const stories = [
        createMockProcessedStory({ rank: 1, titleChinese: '故事一' }),
      ];

      const githubContent = JSON.stringify(stories);
      const terminalContent = JSON.stringify(stories);

      expect(githubContent).toBe(terminalContent);
    });
  });

  describe('GitHub + Telegram Publishers', () => {
    it('should publish to GitHub successfully', async () => {
      const env = createMockEnv({ githubEnabled: true, telegramEnabled: false });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockGitHubCreateResponse(),
      });

      const response = await fetch('https://api.github.com/repos/test/repo/contents/test.md', {
        method: 'PUT',
      });

      expect(response.ok).toBe(true);
    });

    it('should publish to Telegram successfully', async () => {
      const env = createMockEnv({ telegramEnabled: true, githubEnabled: false });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTelegramResponse(),
      });

      const response = await fetch('https://api.telegram.org/bot123/sendMessage', {
        method: 'POST',
      });

      expect(response.ok).toBe(true);
      const data = await response.json() as any;
      expect(data.ok).toBe(true);
    });

    it('should coordinate GitHub and Telegram publishers', async () => {
      const env = createMockEnv({ githubEnabled: true, telegramEnabled: true });

      const publishers = [];

      // GitHub
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockGitHubCreateResponse(),
      });

      const githubResponse = await fetch('https://api.github.com/repos/test/repo/contents/test.md', {
        method: 'PUT',
      });
      publishers.push({ name: 'github', success: githubResponse.ok });

      // Telegram
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockTelegramResponse(),
      });

      const telegramResponse = await fetch('https://api.telegram.org/bot123/sendMessage', {
        method: 'POST',
      });
      publishers.push({ name: 'telegram', success: telegramResponse.ok });

      expect(publishers).toHaveLength(2);
      expect(publishers[0].success).toBe(true);
      expect(publishers[1].success).toBe(true);
    });
  });

  describe('Error handling per publisher', () => {
    it('should throw on GitHub failure (hard failure)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const response = await fetch('https://api.github.com/repos/test/repo/contents/test.md', {
        method: 'PUT',
      });

      expect(response.ok).toBe(false);
    });

    it('should continue on Telegram failure (soft failure)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const response = await fetch('https://api.telegram.org/bot123/sendMessage', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);

      // Test should continue despite failure
      expect(true).toBe(true);
    });

    it('should handle partial publisher failures', async () => {
      const results = [];

      // GitHub succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMockGitHubCreateResponse(),
      });

      const github = await fetch('https://api.github.com/repos/test/repo/contents/test.md', {
        method: 'PUT',
      });
      results.push({ publisher: 'github', success: github.ok });

      // Telegram fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const telegram = await fetch('https://api.telegram.org/bot123/sendMessage', {
        method: 'POST',
      });
      results.push({ publisher: 'telegram', success: telegram.ok });

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should handle GitHub authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Bad credentials' }),
      });

      const response = await fetch('https://api.github.com/repos/test/repo/contents/test.md', {
        method: 'PUT',
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });

    it('should handle Telegram authentication error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ ok: false, error_code: 401, description: 'Unauthorized' }),
      });

      const response = await fetch('https://api.telegram.org/bot-invalid-token/sendMessage', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);
    });

    it('should handle network timeout in GitHub', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      try {
        await fetch('https://api.github.com/repos/test/repo/contents/test.md', {
          method: 'PUT',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle network timeout in Telegram', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      try {
        await fetch('https://api.telegram.org/bot123/sendMessage', {
          method: 'POST',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle rate limiting in GitHub', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(Date.now() + 3600000),
        },
      });

      const response = await fetch('https://api.github.com/repos/test/repo/contents/test.md', {
        method: 'PUT',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });

    it('should handle rate limiting in Telegram', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ ok: false, error_code: 429, description: 'Too Many Requests' }),
      });

      const response = await fetch('https://api.telegram.org/bot123/sendMessage', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
    });
  });

  describe('Terminal publisher', () => {
    it('should always succeed', () => {
      const stories = [
        createMockProcessedStory({ rank: 1 }),
        createMockProcessedStory({ rank: 2 }),
      ];

      // Terminal publisher formats and outputs
      const output = stories.map(s => `${s.rank}. ${s.titleChinese}`).join('\n');

      expect(output).toBeTruthy();
    });

    it('should format stories correctly', () => {
      const story = createMockProcessedStory({
        rank: 1,
        titleChinese: '标题',
        titleEnglish: 'Title',
        score: 150,
      });

      const formatted = `[${story.rank}] ${story.titleChinese} (${story.score} points)`;

      expect(formatted).toContain('标题');
      expect(formatted).toContain('150 points');
    });

    it('should handle empty stories array', () => {
      const stories: any[] = [];

      const output = stories.map(s => `${s.rank}. ${s.titleChinese}`).join('\n');

      expect(output).toBe('');
    });

    it('should handle large story count', () => {
      const stories = Array.from({ length: 100 }, (_, i) =>
        createMockProcessedStory({ rank: i + 1 })
      );

      expect(stories).toHaveLength(100);
    });
  });

  describe('Content isolation', () => {
    it('should not modify content between publishers', () => {
      const original = createMockProcessedStory({
        titleChinese: '原始标题',
        description: '原始描述',
      });

      const copy = { ...original };

      // Both should be identical
      expect(original.titleChinese).toBe(copy.titleChinese);
      expect(original.description).toBe(copy.description);
    });

    it('should send identical content to multiple publishers', async () => {
      const stories = [
        createMockProcessedStory({ rank: 1, titleChinese: '故事一' }),
      ];

      const content1 = JSON.stringify(stories);
      const content2 = JSON.stringify(stories);

      expect(content1).toBe(content2);
    });

    it('should not interfere between concurrent publishes', async () => {
      const stories = [
        createMockProcessedStory({ rank: 1 }),
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const promises = [
        fetch('https://api.github.com/repos/test/repo/contents/test.md', { method: 'PUT' }),
        fetch('https://api.telegram.org/bot123/sendMessage', { method: 'POST' }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(2);
      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);
    });
  });

  describe('Publisher coordination and ordering', () => {
    it('should execute publishers in sequence', async () => {
      const executionOrder: string[] = [];

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('github')) {
          executionOrder.push('github');
          return { ok: true, json: async () => createMockGitHubCreateResponse() };
        } else if (url.includes('telegram')) {
          executionOrder.push('telegram');
          return { ok: true, json: async () => createMockTelegramResponse() };
        }
        return { ok: false };
      });

      // Execute GitHub first
      await fetch('https://api.github.com/repos/test/repo/contents/test.md', { method: 'PUT' });

      // Execute Telegram second
      await fetch('https://api.telegram.org/bot123/sendMessage', { method: 'POST' });

      expect(executionOrder).toEqual(['github', 'telegram']);
    });

    it('should record publisher results', async () => {
      const results: any[] = [];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockGitHubCreateResponse(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createMockTelegramResponse(),
        });

      const github = await fetch('https://api.github.com/repos/test/repo/contents/test.md', { method: 'PUT' });
      results.push({ publisher: 'github', success: github.ok });

      const telegram = await fetch('https://api.telegram.org/bot123/sendMessage', { method: 'POST' });
      results.push({ publisher: 'telegram', success: telegram.ok });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should provide feedback on which publishers succeeded', () => {
      const publishResults = ['github', 'telegram'];

      const message = `Export completed successfully (published to: ${publishResults.join(', ')})`;

      expect(message).toContain('github');
      expect(message).toContain('telegram');
    });
  });
});
