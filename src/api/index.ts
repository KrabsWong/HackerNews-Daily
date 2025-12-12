/**
 * API Module - Unified Entry Point
 * 
 * This module provides access to all data source APIs.
 * Currently supports:
 * - HackerNews (via Algolia and Firebase)
 * 
 * Future data sources can be added here:
 * - Reddit
 * - Lobsters
 * - Product Hunt
 * 
 * Usage:
 *   // Import specific functions
 *   import { fetchTopStories } from '@/api';
 *   
 *   // Or import entire module
 *   import * as api from '@/api';
 *   api.fetchTopStories();
 */

// Re-export all HackerNews API functions
export * from './hackernews';

// Re-export types for convenience
export type {
  HNStory,
  HNComment,
  AlgoliaStory,
  AlgoliaComment,
  AlgoliaSearchResponse,
} from '../types/api';
