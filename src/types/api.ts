/**
 * Type definitions for HackerNews API responses
 * Shared between Firebase and Algolia implementations
 */

/**
 * HackerNews story structure (normalized from both APIs)
 */
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
  _tags: string[];
}

/**
 * Algolia HN API comment response structure
 */
export interface AlgoliaComment {
  objectID: string;
  author: string;
  comment_text: string;
  created_at_i: number;
  story_id: number;
  parent_id?: number;
  _tags: string[];
}

/**
 * Algolia search response structure (generic for stories and comments)
 */
export interface AlgoliaSearchResponse {
  hits: any[]; // Can be AlgoliaStory[] or AlgoliaComment[]
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
