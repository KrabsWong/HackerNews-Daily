/**
 * Firebase HN API functions
 * Provides access to HackerNews Firebase API for best stories and item details
 */

import { HN_API } from '../../config/constants';
import { get } from '../../utils/fetch';
import { APIError } from '../../types/errors';
import { HNStory } from '../../types/api';
import { mapAlgoliaStoryToHNStory } from './mapper';
import { fetchStoriesFromAlgoliaByIds } from './algolia';

/**
 * Fetch the list of best story IDs from HackerNews Firebase API
 * These are stories curated by HN's "best" algorithm (https://news.ycombinator.com/best)
 */
export async function fetchBestStoryIds(): Promise<number[]> {
  try {
    const response = await get<number[]>(`${HN_API.BASE_URL}/beststories.json`, {
      timeout: HN_API.REQUEST_TIMEOUT,
    });
    return response.data;
  } catch (error) {
    // Add context to API errors
    if (error instanceof APIError) {
      throw new APIError(
        `Failed to fetch best story IDs: ${error.message}`,
        error.statusCode,
        error.provider,
        { originalError: error }
      );
    }
    throw error;
  }
}

/**
 * Fetch best stories from HN's "best" list, filtered by date range and sorted by score
 * This combines Firebase's beststories ranking with Algolia's detailed data
 * @param limit - Maximum number of top stories to return
 * @param startTime - Unix timestamp for start of date range
 * @param endTime - Unix timestamp for end of date range
 * @returns Array of HNStory objects from the "best" list, filtered by date, sorted by score
 */
export async function fetchBestStoriesByDateAndScore(
  limit: number,
  startTime: number,
  endTime: number
): Promise<HNStory[]> {
  // Step 1: Get best story IDs from Firebase (HN's curated "best" list)
  console.log('Fetching best story IDs from HackerNews...');
  const bestIds = await fetchBestStoryIds(); // Errors propagate naturally
  console.log(`Found ${bestIds.length} stories in HN best list`);
  
  // Step 2: Fetch story details from Algolia (more efficient than Firebase for bulk)
  const { stories: allStories, errors } = await fetchStoriesFromAlgoliaByIds(bestIds);

  if (errors.length > 0) {
    console.warn(`${errors.length} batch(es) failed while fetching story details`);
  }

  console.log(`Fetched details for ${allStories.length} best stories`);
  
  // Step 3: Filter by date range
  const filteredStories = allStories.filter(
    story => story.created_at_i > startTime && story.created_at_i < endTime
  );
  
  console.log(`${filteredStories.length} stories match the date range`);
  
  // Step 4: Sort by score (points) descending
  filteredStories.sort((a, b) => b.points - a.points);
  
  // Step 5: Take top N and map to HNStory format
  const topStories = filteredStories.slice(0, limit);
  return topStories.map(mapAlgoliaStoryToHNStory);
}

/**
 * Fetch details for a single story by ID from Firebase
 * Returns null if the story cannot be fetched or is invalid
 * Uses optional chaining for cleaner null checks
 */
export async function fetchStoryDetails(id: number): Promise<HNStory | null> {
  try {
    const response = await get<HNStory>(`${HN_API.BASE_URL}/item/${id}.json`, {
      timeout: HN_API.REQUEST_TIMEOUT,
    });

    // Use optional chaining for cleaner null/title check
    if (!response.data?.title) {
      console.warn(`Story ${id} has no title, skipping`);
      return null;
    }

    return response.data;
  } catch (_) {
    console.warn(`Failed to fetch story ${id}, skipping`);
    return null;
  }
}

/**
 * Fetch top N stories from HackerNews within a time window
 * Only includes stories from HN's "best" list (https://news.ycombinator.com/best)
 * Stories are filtered by date range and sorted by score
 */
export async function fetchTopStories(limit: number, timeWindowHours: number): Promise<HNStory[]> {
  console.log('Fetching HackerNews best stories...');
  
  // Calculate time range for date filter
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - (timeWindowHours * 3600);
  
  // Fetch best stories filtered by date and sorted by score
  const stories = await fetchBestStoriesByDateAndScore(limit, startTime, endTime);
  
  console.log(`Found ${stories.length} best stories (by score) from the past ${timeWindowHours} hours`);
  
  return stories;
}
