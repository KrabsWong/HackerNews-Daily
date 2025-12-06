import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_FETCH_LIMIT = 100; // Absolute maximum to prevent performance issues

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
 * Fetch the list of best story IDs from HackerNews
 */
export async function fetchBestStories(): Promise<number[]> {
  try {
    const response = await axios.get<number[]>(`${HN_API_BASE}/beststories.json`, {
      timeout: REQUEST_TIMEOUT,
    });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new Error(`Failed to fetch HackerNews stories: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch details for a single story by ID
 * Returns null if the story cannot be fetched or is invalid
 */
export async function fetchStoryDetails(id: number): Promise<HNStory | null> {
  try {
    const response = await axios.get<HNStory>(`${HN_API_BASE}/item/${id}.json`, {
      timeout: REQUEST_TIMEOUT,
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
    const response = await axios.get<HNComment>(`${HN_API_BASE}/item/${id}.json`, {
      timeout: REQUEST_TIMEOUT,
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
 * Filter stories to only include those within the specified time window
 */
export function filterByTime(stories: HNStory[], hours: number): HNStory[] {
  const cutoffTime = Date.now() / 1000 - (hours * 3600);
  return stories.filter(story => story.time >= cutoffTime);
}

/**
 * Calculate the number of stories to fetch from the API to compensate for time filtering
 * Applies a multiplier based on the time window to ensure we get approximately the requested count
 * @param requestedLimit - The number of stories the user wants after filtering
 * @param timeWindowHours - The time window filter in hours
 * @returns The buffered fetch count (capped at MAX_FETCH_LIMIT)
 */
export function calculateFetchBuffer(requestedLimit: number, timeWindowHours: number): number {
  // Apply different multipliers based on time window strictness
  // 24h or less: 2.5x buffer (stricter filtering)
  // More than 24h: 1.5x buffer (less filtering needed)
  const multiplier = timeWindowHours <= 24 ? 2.5 : 1.5;
  
  const bufferedCount = Math.ceil(requestedLimit * multiplier);
  
  // Cap at absolute maximum for safety
  const cappedCount = Math.min(bufferedCount, MAX_FETCH_LIMIT);
  
  if (bufferedCount > MAX_FETCH_LIMIT) {
    console.warn(`⚠️  Buffer calculation (${bufferedCount}) exceeds maximum fetch limit. Capping at ${MAX_FETCH_LIMIT}.`);
  }
  
  console.log(`Fetching ${cappedCount} stories (${multiplier}x buffer for ${timeWindowHours}h window) to achieve ~${requestedLimit} after filtering...`);
  
  return cappedCount;
}

/**
 * Fetch top N stories from HackerNews within a time window
 */
export async function fetchTopStories(limit: number, timeWindowHours: number): Promise<HNStory[]> {
  console.log('Fetching HackerNews stories...');
  
  // Get all best story IDs
  const storyIds = await fetchBestStories();
  
  // Calculate buffered fetch count to compensate for time filtering
  const fetchCount = calculateFetchBuffer(limit, timeWindowHours);
  
  // Limit the number of stories to fetch (take first N from best list)
  const limitedIds = storyIds.slice(0, fetchCount);
  
  // Fetch details for each story
  const storyPromises = limitedIds.map(id => fetchStoryDetails(id));
  const stories = await Promise.all(storyPromises);
  
  // Filter out null values (failed fetches) and apply time filter
  const validStories = stories.filter((story): story is HNStory => story !== null);
  const recentStories = filterByTime(validStories, timeWindowHours);
  
  console.log(`Found ${recentStories.length} stories from the past ${timeWindowHours} hours`);
  
  return recentStories;
}
