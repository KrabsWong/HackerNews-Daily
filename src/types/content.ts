/**
 * Content-related type definitions
 * 
 * Types for content filtering, article fetching, and content processing
 */

import { HNStory } from './api';
import { SensitivityLevel } from '../config/constants';

/**
 * Classification result for a single story title
 */
export interface FilterClassification {
  /** Index of the story in the original array */
  index: number;
  /** Classification result: SAFE or SENSITIVE */
  classification: 'SAFE' | 'SENSITIVE';
  /** Optional confidence score for future use */
  confidence?: number;
}

/**
 * Content filter interface for filtering sensitive stories
 */
export interface ContentFilter {
  /**
   * Filter stories by classifying titles with AI
   * @param stories - Array of HNStory objects to filter
   * @returns Array of stories classified as "SAFE"
   */
  filterStories(stories: HNStory[]): Promise<HNStory[]>;
  
  /**
   * Check if content filtering is enabled
   * @returns true if filtering is enabled, false otherwise
   */
  isEnabled(): boolean;
  
  /**
   * Get the current sensitivity level
   * @returns The configured sensitivity level (low, medium, or high)
   */
  getSensitivityLevel(): SensitivityLevel;
}

/**
 * Metadata extracted from an article URL
 */
export interface ArticleMetadata {
  url: string;
  description: string | null;
  fullContent: string | null;
}
