import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { HN_API, ALGOLIA_HN_API, STORY_LIMITS } from '../config/constants';

export interface HNStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  time: number;
  type: string;
  by?: string;
  kids?: number[]; // Top-level comment IDs
}

/**
 * Algolia HN API story response structure
 */
export interface AlgoliaStory {
  story_id: number;
  objectID: string;
  title: string;
  url?: string;
  points: number;
  created_at_i: number;
  author: string;
  num_comments: number | null;
  story_text?: string;
  _tags: string[];
}

/**
 * Algolia search response structure
 */
export interface AlgoliaSearchResponse {
  hits: AlgoliaStory[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  exhaustiveNbHits: boolean;
  query: string;
  params: string;
  processingTimeMS: number;
}

/**
 * HackerNews comment structure
 */
export interface HNComment {
  id: number;
  by: string;      // Comment author
  text: string;    // HTML-formatted comment text
  time: number;    // Unix timestamp
  parent: number;  // Parent item ID
  kids?: number[]; // Child comment IDs (not fetched)
}

/**
 * Strip HTML tags from comment text and return plain text
 * Preserves code blocks and technical terms
 */
export function stripHTML(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }
  
  try {
    // Load HTML with cheerio
    const $ = cheerio.load(html);
    
    // Extract text content (automatically strips tags)
    const text = $.text();
    
    // Clean up whitespace
    return text.trim().replace(/\s+/g, ' ');
  } catch (error) {
    console.warn('Failed to parse HTML in comment:', error instanceof Error ? error.message : 'Unknown error');
    return '';
  }
}

/**
 * Map Algolia story response to HNStory interface
 */
export function mapAlgoliaStoryToHNStory(algoliaStory: AlgoliaStory): HNStory {
  return {
    id: algoliaStory.story_id,
    title: algoliaStory.title,
    url: algoliaStory.url,
    score: algoliaStory.points,
    time: algoliaStory.created_at_i,
    type: 'story',
    by: algoliaStory.author,
    // kids field not provided by Algolia search endpoint
    // will be fetched separately if needed for comments
  };
}

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
    
    const response = await axios.get<AlgoliaSearchResponse>(url, {
      timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT,
    });
    
    const { hits, nbPages, page } = response.data;
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
          axios.get<AlgoliaSearchResponse>(
            `${ALGOLIA_HN_API.BASE_URL}/search_by_date?${pageParams}`,
            { timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT }
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
    if (error instanceof AxiosError) {
      if (error.response?.status === 429) {
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
    const response = await axios.get<AlgoliaSearchResponse>(url, {
      timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT,
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
          axios.get<AlgoliaSearchResponse>(
            `${ALGOLIA_HN_API.BASE_URL}/search_by_date?${pageParams}`,
            { timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT }
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
    if (error instanceof AxiosError) {
      if (error.response?.status === 429) {
        throw new Error('Algolia API rate limit exceeded, please try again later');
      }
      throw new Error(`Failed to fetch stories from Algolia HN API: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch the list of best story IDs from HackerNews Firebase API
 * These are stories curated by HN's "best" algorithm (https://news.ycombinator.com/best)
 */
export async function fetchBestStoryIds(): Promise<number[]> {
  try {
    const response = await axios.get<number[]>(`${HN_API.BASE_URL}/beststories.json`, {
      timeout: HN_API.REQUEST_TIMEOUT,
    });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`Failed to fetch best story IDs: ${error.message}`);
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
  try {
    // Step 1: Get best story IDs from Firebase (HN's curated "best" list)
    console.log('Fetching best story IDs from HackerNews...');
    const bestIds = await fetchBestStoryIds();
    console.log(`Found ${bestIds.length} stories in HN best list`);
    
    // Step 2: Fetch story details from Algolia (more efficient than Firebase for bulk)
    // We'll fetch in batches using Algolia's search with story IDs
    const batchSize = 100;
    const allStories: AlgoliaStory[] = [];
    
    // Process in batches
    for (let i = 0; i < bestIds.length; i += batchSize) {
      const batchIds = bestIds.slice(i, i + batchSize);
      
      // Use Algolia search with story tags to get details
      const tagFilters = batchIds.map(id => `story_${id}`).join(',');
      const params = new URLSearchParams({
        tags: `story,(${tagFilters})`,
        hitsPerPage: batchSize.toString(),
      });
      
      try {
        const response = await axios.get<AlgoliaSearchResponse>(
          `${ALGOLIA_HN_API.BASE_URL}/search?${params}`,
          { timeout: ALGOLIA_HN_API.REQUEST_TIMEOUT }
        );
        allStories.push(...response.data.hits);
      } catch (err) {
        // If batch fetch fails, continue with next batch
        console.warn(`Failed to fetch batch ${i / batchSize + 1}, skipping...`);
      }
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
    
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 429) {
        throw new Error('API rate limit exceeded, please try again later');
      }
      throw new Error(`Failed to fetch best stories: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch details for a single story by ID
 * Returns null if the story cannot be fetched or is invalid
 * Used for fetching comment IDs from stories
 */
export async function fetchStoryDetails(id: number): Promise<HNStory | null> {
  try {
    const response = await axios.get<HNStory>(`${HN_API.BASE_URL}/item/${id}.json`, {
      timeout: HN_API.REQUEST_TIMEOUT,
    });
    
    const story = response.data;
    
    // Skip stories without titles (e.g., deleted or invalid)
    if (!story || !story.title) {
      console.warn(`Story ${id} has no title, skipping`);
      return null;
    }
    
    return story;
  } catch (error) {
    console.warn(`Failed to fetch story ${id}, skipping`);
    return null;
  }
}

/**
 * Fetch details for a single comment by ID
 * Returns null if the comment cannot be fetched or is invalid
 */
async function fetchCommentDetails(id: number): Promise<HNComment | null> {
  try {
    const response = await axios.get<HNComment>(`${HN_API.BASE_URL}/item/${id}.json`, {
      timeout: HN_API.REQUEST_TIMEOUT,
    });
    
    const comment = response.data;
    
    // Skip comments without text (e.g., deleted or invalid)
    if (!comment || !comment.text) {
      return null;
    }
    
    return comment;
  } catch (error) {
    return null;
  }
}

/**
 * Fetch top comments for a story
 * @param storyId - The story ID
 * @param limit - Maximum number of comments to fetch (default 10)
 * @returns Array of comment objects, sorted by HN's ranking
 */
export async function fetchComments(storyId: number, limit: number = 10): Promise<HNComment[]> {
  try {
    // Fetch story to get comment IDs
    const story = await fetchStoryDetails(storyId);
    
    // If no kids field or empty, return empty array
    if (!story || !story.kids || story.kids.length === 0) {
      return [];
    }
    
    // Take first N comment IDs (already sorted by HN's algorithm)
    const commentIds = story.kids.slice(0, limit);
    
    // Fetch comment details in parallel
    const commentPromises = commentIds.map(id => fetchCommentDetails(id));
    const comments = await Promise.all(commentPromises);
    
    // Filter out null values (failed fetches or deleted comments)
    const validComments = comments.filter((comment): comment is HNComment => comment !== null);
    
    return validComments;
  } catch (error) {
    console.warn(`Failed to fetch comments for story ${storyId}:`, error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Fetch comments for multiple stories in parallel
 * @param stories - Array of stories to fetch comments for
 * @param limit - Maximum number of comments per story
 * @returns Array of comment arrays, maintaining order with input stories
 */
export async function fetchCommentsBatch(stories: HNStory[], limit: number = 10): Promise<HNComment[][]> {
  const fetchPromises = stories.map(story => fetchComments(story.id, limit));
  const results = await Promise.all(fetchPromises);
  return results;
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
