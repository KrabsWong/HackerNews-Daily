/**
 * Algolia HN Search API functions
 * Provides efficient story and comment fetching via Algolia
 */

import { ALGOLIA_HN_API } from '../../config/constants';
import { get, FetchError } from '../../utils/fetch';
import { Result, Ok, Err, fromPromise } from '../../utils/result';
import { getErrorMessage } from '../../worker/logger';
import { 
  HNStory, 
  HNComment, 
  AlgoliaStory, 
  AlgoliaSearchResponse, 
} from '../../types/api';
import { mapAlgoliaStoryToHNStory } from './mapper';

/**
 * Fetch stories from Algolia HN Search API with date range filtering
 * @param limit - Maximum number of stories to fetch
 * @param startTime - Unix timestamp for start of date range (inclusive)
 * @param endTime - Optional Unix timestamp for end of date range (inclusive)
 * @returns Array of HNStory objects sorted by date (most recent first)
 */
export async function fetchStoriesFromAlgolia(
  limit: number,
  startTime: number,
  endTime?: number
): Promise<HNStory[]> {
  try {
    // Build numeric filters for date range
    const filters: string[] = [`created_at_i>${startTime}`];
    if (endTime) {
      filters.push(`created_at_i<${endTime}`);
    }
    
    // Cap hits per page at API maximum
    const hitsPerPage = Math.min(limit, ALGOLIA_HN_API.MAX_HITS_PER_PAGE);
    
    // Build query parameters
    const params = new URLSearchParams({
      tags: 'story',
      numericFilters: filters.join(','),
      hitsPerPage: hitsPerPage.toString(),
    });
    
    const url = `${ALGOLIA_HN_API.BASE_URL}/search_by_date?${params}`;
    
    const response = await get<AlgoliaSearchResponse>(url, {
      timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT,
      retries: ALGOLIA_HN_API.RETRIES,
      retryDelay: ALGOLIA_HN_API.RETRY_DELAY,
    });
    
    const { hits, nbPages } = response.data;
    let allHits = hits;
    
    // Handle pagination if we need more results and there are more pages
    if (allHits.length < limit && nbPages > 1) {
      const remainingNeeded = limit - allHits.length;
      const additionalPages = Math.min(
        Math.ceil(remainingNeeded / hitsPerPage),
        nbPages - 1
      );
      
      // Fetch additional pages
      const pagePromises: Promise<AlgoliaSearchResponse>[] = [];
      for (let i = 1; i <= additionalPages; i++) {
        const pageParams = new URLSearchParams({
          tags: 'story',
          numericFilters: filters.join(','),
          hitsPerPage: hitsPerPage.toString(),
          page: i.toString(),
        });
        
        pagePromises.push(
          get<AlgoliaSearchResponse>(
            `${ALGOLIA_HN_API.BASE_URL}/search_by_date?${pageParams}`,
            { 
              timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT,
              retries: ALGOLIA_HN_API.RETRIES,
              retryDelay: ALGOLIA_HN_API.RETRY_DELAY,
            }
          ).then(res => res.data)
        );
      }
      
      const additionalResults = await Promise.all(pagePromises);
      additionalResults.forEach(result => {
        allHits = allHits.concat(result.hits);
      });
    }
    
    // Limit to requested count and map to HNStory format
    const limitedHits = allHits.slice(0, limit);
    return limitedHits.map(mapAlgoliaStoryToHNStory);
    
  } catch (error) {
    if (error instanceof FetchError) {
      if (error.status === 429) {
        throw new Error('Algolia API rate limit exceeded, please try again later');
      }
      throw new Error(`Failed to fetch stories from Algolia HN API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch ALL stories from a specific date range, then sort by score and return top N
 * This is useful for getting the "best" stories from a complete day
 * @param limit - Maximum number of top stories to return (default 30)
 * @param startTime - Unix timestamp for start of date range
 * @param endTime - Unix timestamp for end of date range
 * @returns Array of HNStory objects sorted by score (highest first)
 */
export async function fetchTopStoriesByScore(
  limit: number,
  startTime: number,
  endTime: number
): Promise<HNStory[]> {
  try {
    const filters = [`created_at_i>${startTime}`, `created_at_i<${endTime}`];
    const hitsPerPage = ALGOLIA_HN_API.MAX_HITS_PER_PAGE; // Use max for efficiency
    
    // First request to get total page count
    const params = new URLSearchParams({
      tags: 'story',
      numericFilters: filters.join(','),
      hitsPerPage: hitsPerPage.toString(),
    });
    
    const url = `${ALGOLIA_HN_API.BASE_URL}/search_by_date?${params}`;
    const response = await get<AlgoliaSearchResponse>(url, {
      timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT,
      retries: ALGOLIA_HN_API.RETRIES,
      retryDelay: ALGOLIA_HN_API.RETRY_DELAY,
    });
    
    const { hits, nbPages, nbHits } = response.data;
    let allHits = [...hits];
    
    console.log(`Found ${nbHits} total stories in date range, fetching all pages...`);
    
    // Fetch remaining pages if there are more
    if (nbPages > 1) {
      // Limit to reasonable number of pages (e.g., 10 pages = 1000 stories max)
      const maxPages = Math.min(nbPages, 10);
      const pagePromises: Promise<AlgoliaSearchResponse>[] = [];
      
      for (let i = 1; i < maxPages; i++) {
        const pageParams = new URLSearchParams({
          tags: 'story',
          numericFilters: filters.join(','),
          hitsPerPage: hitsPerPage.toString(),
          page: i.toString(),
        });
        
        pagePromises.push(
          get<AlgoliaSearchResponse>(
            `${ALGOLIA_HN_API.BASE_URL}/search_by_date?${pageParams}`,
            { 
              timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT,
              retries: ALGOLIA_HN_API.RETRIES,
              retryDelay: ALGOLIA_HN_API.RETRY_DELAY,
            }
          ).then(res => res.data)
        );
      }
      
      const additionalResults = await Promise.all(pagePromises);
      additionalResults.forEach(result => {
        allHits = allHits.concat(result.hits);
      });
    }
    
    console.log(`Fetched ${allHits.length} stories, sorting by score...`);
    
    // Sort by points (score) descending
    allHits.sort((a, b) => b.points - a.points);
    
    // Take top N and map to HNStory format
    const topHits = allHits.slice(0, limit);
    return topHits.map(mapAlgoliaStoryToHNStory);
    
  } catch (error) {
    if (error instanceof FetchError) {
      if (error.status === 429) {
        throw new Error('Algolia API rate limit exceeded, please try again later');
      }
      throw new Error(`Failed to fetch stories from Algolia HN API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch a single batch of stories from Algolia by IDs
 * @internal
 */
async function fetchBatchFromAlgolia(batchIds: number[], batchSize: number): Promise<Result<AlgoliaStory[]>> {
  const tagFilters = batchIds.map(id => `story_${id}`).join(',');
  const params = new URLSearchParams({
    tags: `story,(${tagFilters})`,
    hitsPerPage: batchSize.toString(),
  });

  const result = await fromPromise(
    get<AlgoliaSearchResponse>(
      `${ALGOLIA_HN_API.BASE_URL}/search?${params}`,
      {
        timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT,
        retries: ALGOLIA_HN_API.RETRIES,
        retryDelay: ALGOLIA_HN_API.RETRY_DELAY,
      }
    )
  );

  if (!result.ok) {
    return Err(result.error);
  }

  return Ok(result.value.data.hits);
}

/**
 * Fetch story details from Algolia by IDs (batch)
 * Uses Result pattern for error accumulation - failed batches are logged but don't break the entire operation
 * @param ids - Array of story IDs to fetch
 * @returns Object containing successful stories and any errors that occurred
 */
export async function fetchStoriesFromAlgoliaByIds(ids: number[]): Promise<{
  stories: AlgoliaStory[];
  errors: Error[];
}> {
  const batchSize = 100;
  const allStories: AlgoliaStory[] = [];
  const errors: Error[] = [];

  // Process in batches
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;

    const result = await fetchBatchFromAlgolia(batchIds, batchSize);

    if (result.ok) {
      allStories.push(...result.value);
    } else {
      errors.push(new Error(`Batch ${batchNum} failed: ${getErrorMessage(result.error)}`));
      console.warn(`Failed to fetch batch ${batchNum}: ${getErrorMessage(result.error)}`);
    }
  }

  if (errors.length > 0) {
    console.warn(`${errors.length} batch(es) failed out of ${Math.ceil(ids.length / batchSize)}`);
  }

  return { stories: allStories, errors };
}

/**
 * Fetch comments for a single story using Algolia Search API (Result version)
 * @internal
 */
async function fetchCommentsFromAlgoliaSafe(storyId: number, limit: number): Promise<Result<HNComment[]>> {
  const params = new URLSearchParams({
    tags: `comment,story_${storyId}`,
    hitsPerPage: limit.toString(),
  });

  const url = `${ALGOLIA_HN_API.BASE_URL}/search?${params}`;

  const result = await fromPromise(
    get<AlgoliaSearchResponse>(url, {
      timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT,
      retries: ALGOLIA_HN_API.RETRIES,
      retryDelay: ALGOLIA_HN_API.RETRY_DELAY,
    })
  );

  if (!result.ok) {
    return Err(result.error);
  }

  const { hits } = result.value.data;

  // Map Algolia comment format to HNComment format using nullish coalescing
  const comments: HNComment[] = hits.map(hit => ({
    id: parseInt(hit.objectID, 10),
    by: hit.author,
    text: hit.comment_text ?? '',
    time: hit.created_at_i,
    parent: hit.story_id ?? storyId,
  }));

  return Ok(comments);
}

/**
 * Fetch comments for a single story using Algolia Search API
 * This is much more efficient than Firebase API (1 request vs N requests per story)
 * @param storyId - The story ID
 * @param limit - Maximum number of comments to fetch (default 10)
 * @returns Array of comment objects, sorted by relevance (empty array on error)
 */
export async function fetchCommentsFromAlgolia(storyId: number, limit: number = 10): Promise<HNComment[]> {
  const result = await fetchCommentsFromAlgoliaSafe(storyId, limit);

  if (!result.ok) {
    console.warn(`Failed to fetch comments from Algolia for story ${storyId}: ${getErrorMessage(result.error)}`);
    return [];
  }

  return result.value;
}

/**
 * Fetch comments for multiple stories using Algolia (optimized)
 * Uses Algolia Search API which is much more efficient than Firebase
 * @param stories - Array of stories to fetch comments for
 * @param limit - Maximum number of comments per story
 * @returns Array of comment arrays, maintaining order with input stories
 */
export async function fetchCommentsBatchFromAlgolia(stories: HNStory[], limit: number = 10): Promise<HNComment[][]> {
  // Fetch comments for each story using Algolia (1 request per story)
  // This replaces 30 stories × (1 story + 10 comments) = 330 Firebase requests
  // with just 30 Algolia requests (1 per story)
  const fetchPromises = stories.map(story => fetchCommentsFromAlgolia(story.id, limit));
  const results = await Promise.all(fetchPromises);
  return results;
}
