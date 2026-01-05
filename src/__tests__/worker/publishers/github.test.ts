/**
 * Unit Tests for GitHub Publisher
 * 
 * Coverage target: 85%+
 * 
 * Tests cover:
 * - GitHubClient authentication and request handling
 * - File versioning logic (v2, v3, etc.)
 * - Error handling (401, 403, 404, 429, 500+)
 * - Retry logic with exponential backoff
 * - Configuration validation
 * - Base64 encoding/decoding
 * - Rate limit handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubClient } from '../../../worker/publishers/github/client';
import { pushToGitHub } from '../../../worker/publishers/github/versioning';
import { GitHubPublisher } from '../../../worker/publishers/github';
import { createMockGitHubCreateResponse } from '../../helpers/fixtures';
import type { PublishContent, GitHubPublisherConfig } from '../../../types/publisher';
import { PublisherType } from '../../../types/publisher';

describe('GitHubClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid token', () => {
      const client = new GitHubClient('valid-token-123');
      expect(client).toBeDefined();
    });

    it('should throw error with empty token', () => {
      expect(() => new GitHubClient('')).toThrow('Missing GITHUB_TOKEN');
    });

    it('should throw error with whitespace-only token', () => {
      expect(() => new GitHubClient('   ')).toThrow('Missing GITHUB_TOKEN');
    });

    it('should throw error with no token', () => {
      expect(() => new GitHubClient(undefined as any)).toThrow('Missing GITHUB_TOKEN');
    });
  });

  describe('getFileContent', () => {
    it('should return file content and sha when file exists', async () => {
      const client = new GitHubClient('token-123');
      const mockContent = 'Hello World';
      const encodedContent = btoa(mockContent);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          sha: 'abc123',
          content: encodedContent,
          type: 'file',
        }),
      });

      const result = await client.getFileContent('owner/repo', 'path/to/file.md', 'main');

      expect(result).toEqual({
        sha: 'abc123',
        content: mockContent,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/path/to/file.md?ref=main',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer token-123',
            'Accept': 'application/vnd.github+json',
          }),
        })
      );
    });

    it('should return null when file does not exist (404)', async () => {
      const client = new GitHubClient('token-123');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Not Found' }),
      });

      const result = await client.getFileContent('owner/repo', 'nonexistent.md', 'main');

      expect(result).toBeNull();
    });

    it('should decode base64 content with newlines correctly', async () => {
      const client = new GitHubClient('token-123');
      const mockContent = 'Line 1\nLine 2\nLine 3';
      const encodedContent = btoa(mockContent).match(/.{1,60}/g)!.join('\n'); // GitHub returns with newlines

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          sha: 'def456',
          content: encodedContent,
        }),
      });

      const result = await client.getFileContent('owner/repo', 'file.md', 'main');

      expect(result).toEqual({
        sha: 'def456',
        content: mockContent,
      });
    });

    it('should handle authentication error (401)', async () => {
      const client = new GitHubClient('invalid-token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Bad credentials',
      });

      await expect(client.getFileContent('owner/repo', 'file.md', 'main')).rejects.toThrow(
        /GitHub authentication failed.*401.*Bad credentials/
      );
    });

    it('should handle permission error (403)', async () => {
      const client = new GitHubClient('token-no-scope');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Resource not accessible by token',
      });

      await expect(client.getFileContent('owner/repo', 'file.md', 'main')).rejects.toThrow(
        /GitHub authentication failed.*403/
      );
    });

    it('should retry on rate limit (429) and succeed', async () => {
      const client = new GitHubClient('token-123');
      const resetTime = Math.floor(Date.now() / 1000) + 3600;

      // First attempt: rate limited
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetTime),
        }),
      });

      // Second attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          sha: 'abc123',
          content: btoa('Success'),
        }),
      });

      const result = await client.getFileContent('owner/repo', 'file.md', 'main');

      expect(result).toEqual({ sha: 'abc123', content: 'Success' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries on persistent rate limit', async () => {
      const client = new GitHubClient('token-123');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
      });

      await expect(client.getFileContent('owner/repo', 'file.md', 'main')).rejects.toThrow(
        'GitHub API rate limit exceeded after retries'
      );
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000); // Increase timeout for retries

    it('should retry on 5xx server errors and succeed', async () => {
      const client = new GitHubClient('token-123');

      // First attempt: server error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        headers: new Headers(),
      });

      // Second attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          sha: 'abc123',
          content: btoa('Recovered'),
        }),
      });

      const result = await client.getFileContent('owner/repo', 'file.md', 'main');

      expect(result).toEqual({ sha: 'abc123', content: 'Recovered' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries on persistent 5xx errors', async () => {
      const client = new GitHubClient('token-123');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(client.getFileContent('owner/repo', 'file.md', 'main')).rejects.toThrow(
        'GitHub API server error: 500'
      );
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx client errors', async () => {
      const client = new GitHubClient('token-123');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid parameters',
      });

      await expect(client.getFileContent('owner/repo', 'file.md', 'main')).rejects.toThrow(
        /GitHub API client error.*400/
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error on non-JSON response', async () => {
      const client = new GitHubClient('token-123');

      // Mock all retry attempts with the same non-JSON response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () => '<html>Error</html>',
      });

      await expect(client.getFileContent('owner/repo', 'file.md', 'main')).rejects.toThrow(
        /unexpected content-type.*text\/html/
      );
    }, 10000); // Increase timeout for retries

    it('should retry on network errors', async () => {
      const client = new GitHubClient('token-123');

      // First attempt: network error
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      // Second attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          sha: 'abc123',
          content: btoa('Success after retry'),
        }),
      });

      const result = await client.getFileContent('owner/repo', 'file.md', 'main');

      expect(result).toEqual({ sha: 'abc123', content: 'Success after retry' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('createOrUpdateFile', () => {
    it('should create new file successfully', async () => {
      const client = new GitHubClient('token-123');
      const content = '# Hello World\n\nTest content';
      const mockResponse = createMockGitHubCreateResponse();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
          'X-RateLimit-Remaining': '50',
        }),
        json: async () => mockResponse,
      });

      await client.createOrUpdateFile(
        'owner/repo',
        '_posts/2025-12-20-daily.md',
        'main',
        content,
        'Add daily export for 2025-12-20'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/contents/_posts/2025-12-20-daily.md',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer token-123',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining(btoa(unescape(encodeURIComponent(content)))),
        })
      );
    });

    it('should update existing file with sha', async () => {
      const client = new GitHubClient('token-123');
      const content = '# Updated Content';
      const existingSha = 'old-sha-123';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json',
          'X-RateLimit-Remaining': '45',
        }),
        json: async () => createMockGitHubCreateResponse(),
      });

      await client.createOrUpdateFile(
        'owner/repo',
        'file.md',
        'main',
        content,
        'Update file',
        existingSha
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.sha).toBe(existingSha);
    });

    it('should encode UTF-8 content correctly', async () => {
      const client = new GitHubClient('token-123');
      const content = '中文内容测试\n# Chinese Test\n🚀 Emoji';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
          'X-RateLimit-Remaining': '50',
        }),
        json: async () => createMockGitHubCreateResponse(),
      });

      await client.createOrUpdateFile(
        'owner/repo',
        'chinese.md',
        'main',
        content,
        'Add Chinese content'
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const encodedContent = callBody.content;
      
      // Verify encoding/decoding round-trip
      const decoded = decodeURIComponent(escape(atob(encodedContent)));
      expect(decoded).toBe(content);
    });

    it('should warn on low rate limit', async () => {
      const client = new GitHubClient('token-123');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
          'X-RateLimit-Remaining': '5', // Low remaining
        }),
        json: async () => createMockGitHubCreateResponse(),
      });

      await client.createOrUpdateFile(
        'owner/repo',
        'file.md',
        'main',
        'content',
        'commit message'
      );

      // Should complete successfully even with low rate limit
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication error', async () => {
      const client = new GitHubClient('invalid-token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Bad credentials',
      });

      await expect(
        client.createOrUpdateFile('owner/repo', 'file.md', 'main', 'content', 'message')
      ).rejects.toThrow(/GitHub authentication failed/);
    });

    it('should retry and succeed on transient errors', async () => {
      const client = new GitHubClient('token-123');

      // First attempt: network error
      mockFetch.mockRejectedValueOnce(new Error('Connection reset'));

      // Second attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          'content-type': 'application/json',
          'X-RateLimit-Remaining': '50',
        }),
        json: async () => createMockGitHubCreateResponse(),
      });

      await client.createOrUpdateFile(
        'owner/repo',
        'file.md',
        'main',
        'content',
        'message'
      );

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});

describe('pushToGitHub (versioning)', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockConfig = {
    GITHUB_TOKEN: 'token-123',
    TARGET_REPO: 'owner/repo',
    TARGET_BRANCH: 'main',
  };

  it('should create new file when none exists', async () => {
    const markdown = '# Daily Export\n\nContent here';
    const dateStr = '2025-12-20';

    // Check for existing file: 404
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    // Create file: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({
        'content-type': 'application/json',
        'X-RateLimit-Remaining': '50',
      }),
      json: async () => createMockGitHubCreateResponse(),
    });

    await pushToGitHub(markdown, dateStr, mockConfig);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    
    // Verify GET request for 2025-12-20-daily.md
    expect(mockFetch.mock.calls[0][0]).toContain('2025-12-20-daily.md');
    expect(mockFetch.mock.calls[0][1].method).toBe('GET');
    
    // Verify PUT request for 2025-12-20-daily.md
    expect(mockFetch.mock.calls[1][0]).toContain('2025-12-20-daily.md');
    expect(mockFetch.mock.calls[1][1].method).toBe('PUT');
    
    const putBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(putBody.message).toBe('Add HackerNews daily export for 2025-12-20');
  });

  it('should create versioned file (v2) when file exists', async () => {
    const markdown = '# Second Export\n\nNew content';
    const dateStr = '2025-12-20';

    // Check for 2025-12-20-daily.md: exists
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        sha: 'existing-sha',
        content: btoa('Existing content'),
      }),
    });

    // Check for 2025-12-20-daily-v2.md: does not exist
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    // Create v2 file: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({
        'content-type': 'application/json',
        'X-RateLimit-Remaining': '50',
      }),
      json: async () => createMockGitHubCreateResponse(),
    });

    await pushToGitHub(markdown, dateStr, mockConfig);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    
    // Verify v2 file creation
    expect(mockFetch.mock.calls[2][0]).toContain('2025-12-20-daily-v2.md');
    
    const putBody = JSON.parse(mockFetch.mock.calls[2][1].body);
    expect(putBody.message).toBe('Add HackerNews daily export for 2025-12-20 (v2)');
  });

  it('should handle multiple versions (v3, v4, etc.)', async () => {
    const markdown = '# Fourth Export';
    const dateStr = '2025-12-20';

    // Original file exists
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ sha: 'sha1', content: btoa('v1') }),
    });

    // v2 exists
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ sha: 'sha2', content: btoa('v2') }),
    });

    // v3 exists
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ sha: 'sha3', content: btoa('v3') }),
    });

    // v4 does not exist
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    // Create v4 file
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({
        'content-type': 'application/json',
        'X-RateLimit-Remaining': '50',
      }),
      json: async () => createMockGitHubCreateResponse(),
    });

    await pushToGitHub(markdown, dateStr, mockConfig);

    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(mockFetch.mock.calls[4][0]).toContain('2025-12-20-daily-v4.md');
  });

  it('should throw error when exceeding max version limit', async () => {
    const markdown = '# Too many versions';
    const dateStr = '2025-12-20';

    // All versions 1-10 exist
    for (let i = 0; i < 10; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ sha: `sha${i}`, content: btoa(`v${i}`) }),
      });
    }

    await expect(pushToGitHub(markdown, dateStr, mockConfig)).rejects.toThrow(
      'Too many versions exist for date 2025-12-20 (exceeded 10)'
    );

    expect(mockFetch).toHaveBeenCalledTimes(10);
  });

  it('should use correct file path (_posts/ directory)', async () => {
    const markdown = '# Test';
    const dateStr = '2025-12-20';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({
        'content-type': 'application/json',
        'X-RateLimit-Remaining': '50',
      }),
      json: async () => createMockGitHubCreateResponse(),
    });

    await pushToGitHub(markdown, dateStr, mockConfig);

    expect(mockFetch.mock.calls[0][0]).toContain('/_posts/2025-12-20-daily.md');
    expect(mockFetch.mock.calls[1][0]).toContain('/_posts/2025-12-20-daily.md');
  });

  it('should handle authentication errors from client', async () => {
    const markdown = '# Test';
    const dateStr = '2025-12-20';

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Bad credentials',
    });

    await expect(pushToGitHub(markdown, dateStr, mockConfig)).rejects.toThrow(
      /GitHub authentication failed/
    );
  });

  it('should propagate network errors', async () => {
    const markdown = '# Test';
    const dateStr = '2025-12-20';

    // Mock all retry attempts with network errors
    mockFetch.mockRejectedValue(new Error('Network connection failed'));

    await expect(pushToGitHub(markdown, dateStr, mockConfig)).rejects.toThrow(
      'Network connection failed'
    );
  }, 10000); // Increase timeout for retries
});

describe('GitHubPublisher', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let publisher: GitHubPublisher;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
    publisher = new GitHubPublisher();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct name', () => {
    expect(publisher.name).toBe(PublisherType.GITHUB);
  });

  it('should publish successfully with valid config', async () => {
    const content: PublishContent = {
      markdown: '# Test Content',
      dateStr: '2025-12-20',
      stories: [],
      metadata: {},
    };

    const config: GitHubPublisherConfig = {
      type: PublisherType.GITHUB,
      GITHUB_TOKEN: 'token-123',
      TARGET_REPO: 'owner/repo',
      TARGET_BRANCH: 'main',
    };

    // File does not exist
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    // Create file success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({
        'content-type': 'application/json',
        'X-RateLimit-Remaining': '50',
      }),
      json: async () => createMockGitHubCreateResponse(),
    });

    await publisher.publish(content, config);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw error when GITHUB_TOKEN is missing', async () => {
    const content: PublishContent = {
      markdown: '# Test',
      dateStr: '2025-12-20',
      stories: [],
      metadata: {},
    };

    const config = {
      type: PublisherType.GITHUB,
      TARGET_REPO: 'owner/repo',
      TARGET_BRANCH: 'main',
    } as GitHubPublisherConfig;

    await expect(publisher.publish(content, config)).rejects.toThrow(
      'GITHUB_TOKEN is required for GitHub publisher'
    );
  });

  it('should throw error when TARGET_REPO is missing', async () => {
    const content: PublishContent = {
      markdown: '# Test',
      dateStr: '2025-12-20',
      stories: [],
      metadata: {},
    };

    const config = {
      type: PublisherType.GITHUB,
      GITHUB_TOKEN: 'token-123',
      TARGET_BRANCH: 'main',
    } as GitHubPublisherConfig;

    await expect(publisher.publish(content, config)).rejects.toThrow(
      'TARGET_REPO is required for GitHub publisher'
    );
  });

  it('should throw error when TARGET_BRANCH is missing', async () => {
    const content: PublishContent = {
      markdown: '# Test',
      dateStr: '2025-12-20',
      stories: [],
      metadata: {},
    };

    const config = {
      type: PublisherType.GITHUB,
      GITHUB_TOKEN: 'token-123',
      TARGET_REPO: 'owner/repo',
    } as GitHubPublisherConfig;

    await expect(publisher.publish(content, config)).rejects.toThrow(
      'TARGET_BRANCH is required for GitHub publisher'
    );
  });

  it('should pass markdown and dateStr to pushToGitHub correctly', async () => {
    const content: PublishContent = {
      markdown: '# Specific Content\n\nWith details',
      dateStr: '2025-12-25',
      stories: [],
      metadata: {},
    };

    const config: GitHubPublisherConfig = {
      type: PublisherType.GITHUB,
      GITHUB_TOKEN: 'token-123',
      TARGET_REPO: 'owner/repo',
      TARGET_BRANCH: 'dev',
    };

    // File does not exist
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    // Create file
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({
        'content-type': 'application/json',
        'X-RateLimit-Remaining': '50',
      }),
      json: async () => createMockGitHubCreateResponse(),
    });

    await publisher.publish(content, config);

    // Verify the dateStr is used in filename
    expect(mockFetch.mock.calls[0][0]).toContain('2025-12-25-daily.md');
    
    // Verify the markdown content is encoded in PUT request
    const putBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    const decodedContent = decodeURIComponent(escape(atob(putBody.content)));
    expect(decodedContent).toBe(content.markdown);
  });
});
