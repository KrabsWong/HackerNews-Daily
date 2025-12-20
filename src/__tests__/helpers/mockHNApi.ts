/**
 * Mock factory for HackerNews API responses (Firebase and Algolia)
 * 
 * CRITICAL: All mock responses MUST match their corresponding API interface types exactly.
 * Field names, types, and structure must be identical to production API responses.
 */

import type { AlgoliaSearchResponse } from '../../types/api';
import { createMockAlgoliaStory, createMockAlgoliaComment } from './fixtures';

/**
 * Mock Firebase API response for best stories
 * Returns array of story IDs (matches Firebase /v0/beststories.json format)
 */
export function mockFirebaseBestStories(storyIds: number[] = [10001, 10002, 10003]): number[] {
  return storyIds;
}

/**
 * Mock Algolia search response for stories
 * CRITICAL: Must match AlgoliaSearchResponse interface exactly
 */
export function mockAlgoliaStoriesResponse(
  storyIds: number[],
  options: {
    page?: number;
    hitsPerPage?: number;
  } = {}
): AlgoliaSearchResponse {
  const { page = 0, hitsPerPage = 100 } = options;
  
  const hits = storyIds.map((id, index) => createMockAlgoliaStory({
    story_id: id,
    objectID: String(id),
    title: `Story ${id}`,
    points: 200 - index * 10, // Use 'points' not 'score' (Algolia field name)
  }));

  return {
    hits,
    nbHits: hits.length,
    page,
    nbPages: Math.ceil(hits.length / hitsPerPage),
    hitsPerPage,
    exhaustiveNbHits: true,
    query: '',
    params: `tags=story`,
    processingTimeMS: 1,
  };
}

/**
 * Mock Algolia search response for comments
 */
export function mockAlgoliaCommentsResponse(
  storyId: number,
  commentCount: number = 10
): AlgoliaSearchResponse {
  const hits = Array.from({ length: commentCount }, (_, i) => createMockAlgoliaComment({
    objectID: String(20000 + i),
    story_id: storyId,
    author: `user${i + 1}`,
    comment_text: `This is comment ${i + 1} with insightful analysis.`,
  }));

  return {
    hits,
    nbHits: hits.length,
    page: 0,
    nbPages: 1,
    hitsPerPage: 100,
    exhaustiveNbHits: true,
    query: '',
    params: `tags=comment,story_${storyId}`,
    processingTimeMS: 1,
  };
}

/**
 * Mock fetch function for HN API requests
 */
export function createMockHNApiFetch() {
  return async (url: string): Promise<Response> => {
    // Firebase best stories endpoint
    if (url.includes('beststories.json')) {
      return new Response(JSON.stringify(mockFirebaseBestStories()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Algolia search endpoint
    if (url.includes('algolia.com/api/v1/search')) {
      const urlObj = new URL(url);
      const tags = urlObj.searchParams.get('tags') || '';
      
      if (tags.includes('story')) {
        return new Response(JSON.stringify(mockAlgoliaStoriesResponse([10001, 10002, 10003])), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      if (tags.includes('comment')) {
        const storyIdMatch = tags.match(/story_(\d+)/);
        const storyId = storyIdMatch ? parseInt(storyIdMatch[1]) : 10001;
        return new Response(JSON.stringify(mockAlgoliaCommentsResponse(storyId)), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Default fallback
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

/**
 * Mock error response for API failures
 */
export function mockApiError(status: number = 500, message: string = 'Internal Server Error'): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Mock timeout for testing timeout scenarios
 */
export function mockApiTimeout(): Promise<never> {
  return new Promise(() => {
    // Never resolves, simulating a timeout
  });
}
