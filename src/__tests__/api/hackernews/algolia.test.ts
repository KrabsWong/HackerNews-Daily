/**
 * Tests for Algolia HN Search API functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchStoriesFromAlgolia,
  fetchTopStoriesByScore,
  fetchStoriesFromAlgoliaByIds,
  fetchCommentsFromAlgolia,
  fetchCommentsBatchFromAlgolia,
} from '../../../api/hackernews/algolia';
import { createMockAlgoliaStory, createMockHNStory, createMockAlgoliaComment } from '../../helpers/fixtures';
import { mockAlgoliaStoriesResponse, mockAlgoliaCommentsResponse } from '../../helpers/mockHNApi';

describe('Algolia HN API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchStoriesFromAlgolia', () => {
    it('should fetch stories with date range filtering', async () => {
      const startTime = 1700000000;
      const endTime = 1700086400;
      const mockResponse = mockAlgoliaStoriesResponse([1, 2, 3]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await fetchStoriesFromAlgolia(10, startTime, endTime);

      expect(result).toHaveLength(3);
      
      const fetchUrl = (global.fetch as any).mock.calls[0][0];
      expect(fetchUrl).toContain('search_by_date');
      expect(fetchUrl).toContain('created_at_i');
      expect(fetchUrl).toContain(String(startTime));
      expect(fetchUrl).toContain(String(endTime));
    });

    it('should fetch stories without end time', async () => {
      const startTime = 1700000000;
      const mockResponse = mockAlgoliaStoriesResponse([1, 2]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await fetchStoriesFromAlgolia(10, startTime);

      expect(result).toHaveLength(2);
      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).not.toContain('created_at_i<');
    });

    it('should respect MAX_HITS_PER_PAGE limit', async () => {
      const mockResponse = mockAlgoliaStoriesResponse(Array.from({ length: 1000 }, (_, i) => i));

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      await fetchStoriesFromAlgolia(200, 1700000000);

      // Should cap at MAX_HITS_PER_PAGE (1000)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('hitsPerPage=200'),
        expect.any(Object)
      );
    });

    it('should handle pagination when more results needed', async () => {
      // First page returns 5 stories, we need 8, so pagination should fetch another page
      const page1Response = {
        ...mockAlgoliaStoriesResponse([1, 2, 3, 4, 5]),
        nbPages: 2,
        page: 0,
        hitsPerPage: 5,
      };
      
      const page2Response = {
        ...mockAlgoliaStoriesResponse([6, 7, 8, 9, 10]),
        page: 1,
        nbPages: 2,
        hitsPerPage: 5,
      };

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(page1Response),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(page2Response),
        });

      const result = await fetchStoriesFromAlgolia(8, 1700000000);

      // Should get 8 stories (5 from page 1 + 3 from page 2, limited to 8)
      expect(result.length).toBe(8);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should limit to requested count across pages', async () => {
      const page1 = mockAlgoliaStoriesResponse([1, 2, 3, 4, 5], { hitsPerPage: 5 });
      page1.nbPages = 2;
      
      const page2 = mockAlgoliaStoriesResponse([6, 7, 8, 9, 10], { hitsPerPage: 5, page: 1 });

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(page1),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(page2),
        });

      const result = await fetchStoriesFromAlgolia(7, 1700000000);

      expect(result).toHaveLength(7);
    });

    it('should throw error on rate limit (429)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: { get: vi.fn().mockReturnValue('application/json') },
      });

      await expect(
        fetchStoriesFromAlgolia(10, 1700000000)
      ).rejects.toThrow('Algolia API rate limit exceeded');
    });

    it('should throw descriptive error on other failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        fetchStoriesFromAlgolia(10, 1700000000)
      ).rejects.toThrow('Network error');
    }, 10000);

    it('should pass through non-FetchError errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        fetchStoriesFromAlgolia(10, 1700000000)
      ).rejects.toThrow('Network error');
    });

    it('should use retry configuration from constants', async () => {
      const mockResponse = mockAlgoliaStoriesResponse([1]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      await fetchStoriesFromAlgolia(5, 1700000000);

      // Verify fetch was called with signal (timeout handling)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('fetchTopStoriesByScore', () => {
    it('should fetch all stories and sort by score', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockStories = [
        createMockAlgoliaStory({ story_id: 1, points: 100 }),
        createMockAlgoliaStory({ story_id: 2, points: 300 }),
        createMockAlgoliaStory({ story_id: 3, points: 200 }),
      ];

      const mockResponse = {
        ...mockAlgoliaStoriesResponse([1, 2, 3]),
        hits: mockStories,
        nbPages: 1,
        nbHits: 3,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await fetchTopStoriesByScore(10, 1700000000, 1700086400);

      expect(result).toHaveLength(3);
      expect(result[0].score).toBe(300); // Highest score first
      expect(result[1].score).toBe(200);
      expect(result[2].score).toBe(100);

      consoleSpy.mockRestore();
    });

    it('should handle multiple pages', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const page1Stories = [
        createMockAlgoliaStory({ story_id: 1, points: 100 }),
        createMockAlgoliaStory({ story_id: 2, points: 200 }),
      ];
      
      const page2Stories = [
        createMockAlgoliaStory({ story_id: 3, points: 300 }),
        createMockAlgoliaStory({ story_id: 4, points: 150 }),
      ];

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue({
            hits: page1Stories,
            nbPages: 2,
            nbHits: 4,
            page: 0,
            hitsPerPage: 2,
            exhaustiveNbHits: true,
            query: '',
            params: 'tags=story',
            processingTimeMS: 1,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue({
            hits: page2Stories,
            nbPages: 2,
            nbHits: 4,
            page: 1,
            hitsPerPage: 2,
            exhaustiveNbHits: true,
            query: '',
            params: 'tags=story',
            processingTimeMS: 1,
          }),
        });

      const result = await fetchTopStoriesByScore(10, 1700000000, 1700086400);

      expect(result).toHaveLength(4);
      expect(result[0].score).toBe(300);
      expect(result[1].score).toBe(200);
      expect(result[2].score).toBe(150);
      expect(result[3].score).toBe(100);

      consoleSpy.mockRestore();
    });

    it('should limit results to requested count', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockStories = Array.from({ length: 10 }, (_, i) => 
        createMockAlgoliaStory({ story_id: i, points: 100 - i })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({
          hits: mockStories,
          nbPages: 1,
          nbHits: 10,
          page: 0,
          hitsPerPage: 10,
          exhaustiveNbHits: true,
          query: '',
          params: 'tags=story',
          processingTimeMS: 1,
        }),
      });

      const result = await fetchTopStoriesByScore(5, 1700000000, 1700086400);

      expect(result).toHaveLength(5);

      consoleSpy.mockRestore();
    });

    it('should respect max pages limit (10 pages)', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({
          hits: [createMockAlgoliaStory()],
          nbPages: 50, // Many pages
          nbHits: 5000,
          page: 0,
          hitsPerPage: 100,
          exhaustiveNbHits: true,
          query: '',
          params: 'tags=story',
          processingTimeMS: 1,
        }),
      });

      await fetchTopStoriesByScore(10, 1700000000, 1700086400);

      // Should fetch initial page + max 9 more pages = 10 total
      expect(global.fetch).toHaveBeenCalledTimes(10);

      consoleSpy.mockRestore();
    });

    it('should handle rate limit errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: { get: vi.fn().mockReturnValue('application/json') },
      });

      await expect(
        fetchTopStoriesByScore(10, 1700000000, 1700086400)
      ).rejects.toThrow('Algolia API rate limit exceeded');

      consoleSpy.mockRestore();
    });
  });

  describe('fetchStoriesFromAlgoliaByIds', () => {
    it('should fetch stories in batches', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => i + 1);
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(
          mockAlgoliaStoriesResponse(Array.from({ length: 100 }, (_, i) => i + 1))
        ),
      });

      const result = await fetchStoriesFromAlgoliaByIds(ids);

      expect(result.stories.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(global.fetch).toHaveBeenCalledTimes(2); // 150 ids = 2 batches of 100
    });

    it('should accumulate errors from failed batches', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create 3 batches: first 100, second 100, third 50 ids
      const ids = Array.from({ length: 250 }, (_, i) => i + 1);
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(mockAlgoliaStoriesResponse(Array.from({length: 100}, (_, i) => i + 1))),
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(mockAlgoliaStoriesResponse(Array.from({length: 50}, (_, i) => i + 200))),
        });

      const result = await fetchStoriesFromAlgoliaByIds(ids);

      expect(result.stories.length).toBe(150); // First (100) and third (50) batch succeeded
      expect(result.errors).toHaveLength(1); // Second batch failed
      expect(result.errors[0].message).toContain('Batch 2 failed');

      consoleWarnSpy.mockRestore();
    }, 10000);

    it('should handle batch size of exactly 100', async () => {
      const ids = Array.from({ length: 100 }, (_, i) => i + 1);
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(mockAlgoliaStoriesResponse(ids)),
      });

      const result = await fetchStoriesFromAlgoliaByIds(ids);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.stories.length).toBe(100);
    });

    it('should handle small batch sizes', async () => {
      const ids = [1, 2, 3];
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(mockAlgoliaStoriesResponse(ids)),
      });

      const result = await fetchStoriesFromAlgoliaByIds(ids);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result.stories.length).toBe(3);
    });

    it('should use correct tag filters for batch fetch', async () => {
      const ids = [101, 102, 103];
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(mockAlgoliaStoriesResponse(ids)),
      });

      await fetchStoriesFromAlgoliaByIds(ids);

      const fetchUrl = (global.fetch as any).mock.calls[0][0];
      expect(fetchUrl).toContain('tags=story');
      expect(fetchUrl).toContain('story_101');
      expect(fetchUrl).toContain('story_102');
      expect(fetchUrl).toContain('story_103');
    });
  });

  describe('fetchCommentsFromAlgolia', () => {
    it('should fetch comments for a story', async () => {
      const storyId = 12345;
      const mockResponse = mockAlgoliaCommentsResponse(storyId, 10);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await fetchCommentsFromAlgolia(storyId, 10);

      expect(result).toHaveLength(10);
      expect(result[0].parent).toBe(storyId);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`story_${storyId}`),
        expect.any(Object)
      );
    });

    it('should use default limit of 10', async () => {
      const storyId = 12345;
      const mockResponse = mockAlgoliaCommentsResponse(storyId, 10);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const result = await fetchCommentsFromAlgolia(storyId);

      expect(result).toHaveLength(10);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('hitsPerPage=10'),
        expect.any(Object)
      );
    });

    it('should return empty array on error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchCommentsFromAlgolia(12345);

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch comments from Algolia')
      );

      consoleWarnSpy.mockRestore();
    }, 10000);

    it('should map Algolia comment format to HN comment format', async () => {
      const storyId = 12345;
      const mockAlgoliaComment = createMockAlgoliaComment({
        objectID: '99999',
        author: 'testuser',
        comment_text: 'Test comment',
        created_at_i: 1700000000,
        story_id: storyId,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({
          hits: [mockAlgoliaComment],
          nbHits: 1,
          page: 0,
          nbPages: 1,
          hitsPerPage: 10,
          exhaustiveNbHits: true,
          query: '',
          params: `tags=comment,story_${storyId}`,
          processingTimeMS: 1,
        }),
      });

      const result = await fetchCommentsFromAlgolia(storyId);

      expect(result[0]).toEqual({
        id: 99999,
        by: 'testuser',
        text: 'Test comment',
        time: 1700000000,
        parent: storyId,
      });
    });

    it('should handle missing comment_text with empty string', async () => {
      const storyId = 12345;
      const mockCommentNoText = {
        ...createMockAlgoliaComment({ story_id: storyId }),
        comment_text: undefined,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue({
          hits: [mockCommentNoText],
          nbHits: 1,
          page: 0,
          nbPages: 1,
          hitsPerPage: 10,
          exhaustiveNbHits: true,
          query: '',
          params: `tags=comment,story_${storyId}`,
          processingTimeMS: 1,
        }),
      });

      const result = await fetchCommentsFromAlgolia(storyId);

      expect(result[0].text).toBe('');
    });
  });

  describe('fetchCommentsBatchFromAlgolia', () => {
    it('should fetch comments for multiple stories in parallel', async () => {
      const stories = [
        createMockHNStory({ id: 1 }),
        createMockHNStory({ id: 2 }),
        createMockHNStory({ id: 3 }),
      ];

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(mockAlgoliaCommentsResponse(1, 5)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(mockAlgoliaCommentsResponse(2, 3)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(mockAlgoliaCommentsResponse(3, 7)),
        });

      const result = await fetchCommentsBatchFromAlgolia(stories, 10);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(5); // Story 1 has 5 comments
      expect(result[1]).toHaveLength(3); // Story 2 has 3 comments
      expect(result[2]).toHaveLength(7); // Story 3 has 7 comments
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should maintain order with input stories', async () => {
      const stories = [
        createMockHNStory({ id: 100 }),
        createMockHNStory({ id: 200 }),
      ];

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(mockAlgoliaCommentsResponse(100, 2)),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(mockAlgoliaCommentsResponse(200, 3)),
        });

      const result = await fetchCommentsBatchFromAlgolia(stories, 10);

      expect(result[0][0].parent).toBe(100);
      expect(result[1][0].parent).toBe(200);
    });

    it('should handle stories with no comments', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const stories = [createMockHNStory({ id: 1 })];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue('application/json') },
        json: vi.fn().mockResolvedValue(mockAlgoliaCommentsResponse(1, 0)),
      });

      const result = await fetchCommentsBatchFromAlgolia(stories, 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(0);

      consoleWarnSpy.mockRestore();
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const stories = [
        createMockHNStory({ id: 1 }),
        createMockHNStory({ id: 2 }),
      ];

      // Make sure fetch completes for both stories even with error
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(mockAlgoliaCommentsResponse(1, 3)),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          headers: { get: vi.fn().mockReturnValue('application/json') },
        });

      const result = await fetchCommentsBatchFromAlgolia(stories, 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(3); // First succeeded
      expect(result[1]).toHaveLength(0); // Second failed, returns empty array

      consoleWarnSpy.mockRestore();
    }, 10000);
  });
});
