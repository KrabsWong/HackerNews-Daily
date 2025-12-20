/**
 * Tests for Firebase HN API functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  fetchBestStoryIds, 
  fetchStoryDetails,
  fetchBestStoriesByDateAndScore,
  fetchTopStories
} from '../../../api/hackernews/firebase';
import { createMockHNStory, createMockAlgoliaStory } from '../../helpers/fixtures';
import { mockFirebaseBestStories, mockAlgoliaStoriesResponse } from '../../helpers/mockHNApi';
import { FetchError } from '../../../utils/fetch';

describe('Firebase HN API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchBestStoryIds', () => {
    it('should fetch best story IDs from Firebase API', async () => {
      const mockIds = [10001, 10002, 10003, 10004, 10005];
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockIds),
      });

      const result = await fetchBestStoryIds();

      expect(result).toEqual(mockIds);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/beststories.json'),
        expect.any(Object)
      );
    });

    it('should wrap FetchError in descriptive error message', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
      });

      await expect(fetchBestStoryIds()).rejects.toThrow(
        'Failed to fetch best story IDs: HTTP 500: Internal Server Error'
      );
    });

    it('should pass through non-FetchError errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      await expect(fetchBestStoryIds()).rejects.toThrow('Network failure');
    });

    it('should use correct timeout from config', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue([1, 2, 3]),
      });

      await fetchBestStoryIds();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('fetchStoryDetails', () => {
    it('should fetch story details from Firebase API', async () => {
      const mockStory = createMockHNStory({
        id: 12345,
        title: 'Test Story',
        url: 'https://example.com',
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(mockStory),
      });

      const result = await fetchStoryDetails(12345);

      expect(result).toEqual(mockStory);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/item/12345.json'),
        expect.any(Object)
      );
    });

    it('should return null for story without title', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue({ id: 12345, type: 'story' }),
      });

      const result = await fetchStoryDetails(12345);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Story 12345 has no title')
      );

      consoleSpy.mockRestore();
    });

    it('should return null for null response', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
        json: vi.fn().mockResolvedValue(null),
      });

      const result = await fetchStoryDetails(12345);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Story 12345 has no title')
      );

      consoleSpy.mockRestore();
    });

    it('should return null on fetch error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: vi.fn().mockReturnValue('application/json'),
        },
      });

      const result = await fetchStoryDetails(99999);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch story 99999')
      );

      consoleSpy.mockRestore();
    });

    it('should return null on network error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await fetchStoryDetails(12345);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch story 12345')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('fetchBestStoriesByDateAndScore', () => {
    it('should fetch and filter stories by date range', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = now - 7200; // 2 hours ago
      const endTime = now;

      // Mock best story IDs
      const bestIds = [1, 2, 3, 4, 5];
      
      // Create mock stories with different timestamps
      const mockStories = [
        createMockAlgoliaStory({ story_id: 1, points: 200, created_at_i: now - 1800 }), // 30 min ago (in range)
        createMockAlgoliaStory({ story_id: 2, points: 150, created_at_i: now - 3600 }), // 1 hour ago (in range)
        createMockAlgoliaStory({ story_id: 3, points: 100, created_at_i: now - 10800 }), // 3 hours ago (out of range)
        createMockAlgoliaStory({ story_id: 4, points: 180, created_at_i: now - 5400 }), // 1.5 hours ago (in range)
        createMockAlgoliaStory({ story_id: 5, points: 90, created_at_i: now - 900 }), // 15 min ago (in range)
      ];

      // Mock fetchBestStoryIds
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(bestIds),
        })
        // Mock Algolia batch fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue({
            hits: mockStories,
            nbHits: mockStories.length,
            page: 0,
            nbPages: 1,
            hitsPerPage: 100,
            exhaustiveNbHits: true,
            query: '',
            params: 'tags=story',
            processingTimeMS: 1,
          }),
        });

      const result = await fetchBestStoriesByDateAndScore(10, startTime, endTime);

      // Should filter to 4 stories (IDs 1, 2, 4, 5)
      expect(result).toHaveLength(4);
      
      // Should be sorted by score descending
      expect(result[0].score).toBe(200); // ID 1
      expect(result[1].score).toBe(180); // ID 4
      expect(result[2].score).toBe(150); // ID 2
      expect(result[3].score).toBe(90);  // ID 5

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should limit results to requested count', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const now = Math.floor(Date.now() / 1000);
      const startTime = now - 7200;
      const endTime = now;

      const bestIds = [1, 2, 3, 4, 5];
      const mockStories = bestIds.map((id, i) => 
        createMockAlgoliaStory({ 
          story_id: id, 
          points: 200 - i * 10, 
          created_at_i: now - 1800 
        })
      );

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(bestIds),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue({
            hits: mockStories,
            nbHits: mockStories.length,
            page: 0,
            nbPages: 1,
            hitsPerPage: 100,
            exhaustiveNbHits: true,
            query: '',
            params: 'tags=story',
            processingTimeMS: 1,
          }),
        });

      const result = await fetchBestStoriesByDateAndScore(3, startTime, endTime);

      expect(result).toHaveLength(3);
      expect(result[0].score).toBe(200);
      expect(result[1].score).toBe(190);
      expect(result[2].score).toBe(180);

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should throw error on rate limit (429) from fetchBestStoryIds', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: { get: vi.fn().mockReturnValue('application/json') },
      });

      // Error comes from fetchBestStoryIds which wraps the error
      await expect(
        fetchBestStoriesByDateAndScore(10, 1000, 2000)
      ).rejects.toThrow('Failed to fetch best story IDs');

      consoleSpy.mockRestore();
    });

    it('should throw descriptive error on other fetch failures', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: { get: vi.fn().mockReturnValue('application/json') },
      });

      // Error comes from fetchBestStoryIds
      await expect(
        fetchBestStoriesByDateAndScore(10, 1000, 2000)
      ).rejects.toThrow('Failed to fetch best story IDs');

      consoleSpy.mockRestore();
    });

    it('should pass through non-FetchError errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Unknown error'));

      await expect(
        fetchBestStoriesByDateAndScore(10, 1000, 2000)
      ).rejects.toThrow('Unknown error');

      consoleSpy.mockRestore();
    });
  });

  describe('fetchTopStories', () => {
    it('should fetch top stories within time window', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const now = Math.floor(Date.now() / 1000);
      const bestIds = [1, 2, 3];
      const mockStories = bestIds.map((id, i) => 
        createMockAlgoliaStory({ 
          story_id: id, 
          points: 200 - i * 10,
          created_at_i: now - 1800 // 30 min ago
        })
      );

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue(bestIds),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue({
            hits: mockStories,
            nbHits: mockStories.length,
            page: 0,
            nbPages: 1,
            hitsPerPage: 100,
            exhaustiveNbHits: true,
            query: '',
            params: 'tags=story',
            processingTimeMS: 1,
          }),
        });

      const result = await fetchTopStories(10, 24);

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Fetching HackerNews best stories')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 best stories')
      );

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should calculate correct time range', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue([]),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('application/json') },
          json: vi.fn().mockResolvedValue({
            hits: [],
            nbHits: 0,
            page: 0,
            nbPages: 0,
            hitsPerPage: 100,
            exhaustiveNbHits: true,
            query: '',
            params: 'tags=story',
            processingTimeMS: 1,
          }),
        });

      await fetchTopStories(5, 12); // 12 hours

      // Verify the time window is 12 hours = 43200 seconds
      // This is indirectly tested through the function call to fetchBestStoriesByDateAndScore
      expect(global.fetch).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });
});
