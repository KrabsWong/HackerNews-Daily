/**
 * HackerNews API Module
 * 
 * Provides access to HackerNews data via multiple backends:
 * - Algolia HN Search API (optimized for search and batch operations)
 * - Firebase HN API (official API for real-time data)
 * 
 * Usage:
 *   import { fetchTopStories, fetchCommentsFromAlgolia } from '@/api/hackernews';
 */

// Re-export Algolia functions
export {
  fetchStoriesFromAlgolia,
  fetchTopStoriesByScore,
  fetchCommentsFromAlgolia,
  fetchCommentsBatchFromAlgolia,
  fetchStoriesFromAlgoliaByIds,
} from './algolia';

// Re-export Firebase functions
export {
  fetchBestStoryIds,
  fetchBestStoriesByDateAndScore,
  fetchStoryDetails,
  fetchTopStories,
} from './firebase';

// Re-export mapper function
export { mapAlgoliaStoryToHNStory } from './mapper';
