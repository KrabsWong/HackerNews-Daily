/**
 * Content Source type definitions
 * 
 * Types for content sources (HackerNews, Reddit, etc.)
 */

/**
 * Configuration options passed to content sources
 * Sources can define their own specific configuration schemas
 */
export interface SourceConfig {
  [key: string]: any;
}

/**
 * Content returned by a content source
 */
export interface SourceContent {
  /** Generated Markdown content ready for publishing */
  markdown: string;
  /** Date string in YYYY-MM-DD format */
  dateStr: string;
  /** Source-specific metadata (e.g., story count, API calls, processing time) */
  metadata: Record<string, any>;
}

/**
 * Content Source interface
 * All content sources MUST implement this interface
 */
export interface ContentSource {
  /** Unique name of the content source (e.g., 'hackernews', 'reddit') */
  readonly name: string;
  
  /**
   * Fetch and process content for a specific date
   * @param date - Target date for content (typically previous day)
   * @param config - Source-specific configuration
   * @returns Promise resolving to source content
   */
  fetchContent(date: Date, config: SourceConfig): Promise<SourceContent>;
}
