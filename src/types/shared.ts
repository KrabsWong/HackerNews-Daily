/**
 * Shared type definitions for CLI and Worker
 * Provides consistent interfaces across all execution environments
 */

/**
 * Processed story ready for display or export
 * Unified interface used by both CLI and Worker
 */
export interface ProcessedStory {
  /** Display rank (1-based) */
  rank: number;
  /** HackerNews story ID for navigation to original discussion */
  storyId: number;
  /** Chinese translated title */
  titleChinese: string;
  /** Original English title */
  titleEnglish: string;
  /** HackerNews score (points) */
  score: number;
  /** Article URL */
  url: string;
  /** Formatted timestamp string for display */
  time: string;
  /** Unix timestamp for filtering and sorting */
  timestamp: number;
  /** AI-generated summary or translated description */
  description: string;
  /** AI summary of top comments, null if insufficient comments */
  commentSummary: string | null;
}
