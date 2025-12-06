import axios, { AxiosError } from 'axios';

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export interface HNStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  time: number;
  type: string;
  by?: string;
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
 * Filter stories to only include those within the specified time window
 */
export function filterByTime(stories: HNStory[], hours: number): HNStory[] {
  const cutoffTime = Date.now() / 1000 - (hours * 3600);
  return stories.filter(story => story.time >= cutoffTime);
}

/**
 * Fetch top N stories from HackerNews within a time window
 */
export async function fetchTopStories(limit: number, timeWindowHours: number): Promise<HNStory[]> {
  console.log('Fetching HackerNews stories...');
  
  // Get all best story IDs
  const storyIds = await fetchBestStories();
  
  // Limit the number of stories to fetch (take first N from best list)
  const limitedIds = storyIds.slice(0, limit);
  
  // Fetch details for each story
  const storyPromises = limitedIds.map(id => fetchStoryDetails(id));
  const stories = await Promise.all(storyPromises);
  
  // Filter out null values (failed fetches) and apply time filter
  const validStories = stories.filter((story): story is HNStory => story !== null);
  const recentStories = filterByTime(validStories, timeWindowHours);
  
  console.log(`Found ${recentStories.length} stories from the past ${timeWindowHours} hours`);
  
  return recentStories;
}
