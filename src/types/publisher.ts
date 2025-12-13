/**
 * Publisher-related type definitions
 * 
 * Types for content publishing to various destinations (GitHub, Telegram, RSS, etc.)
 */

/**
 * Configuration options passed to publishers
 * Publishers can define their own specific configuration schemas
 */
export interface PublisherConfig {
  [key: string]: any;
}

/**
 * Content to be published
 */
export interface PublishContent {
  /** Markdown content to publish */
  markdown: string;
  /** Date string in YYYY-MM-DD format */
  dateStr: string;
  /** Additional metadata from the content source */
  metadata: Record<string, any>;
}

/**
 * Publisher interface
 * All publishers MUST implement this interface
 */
export interface Publisher {
  /** Unique name of the publisher (e.g., 'github', 'telegram') */
  readonly name: string;
  
  /**
   * Publish content to the destination
   * @param content - Content to publish
   * @param config - Publisher-specific configuration
   * @returns Promise that resolves when publishing is complete
   */
  publish(content: PublishContent, config: PublisherConfig): Promise<void>;
}

/**
 * GitHub publisher configuration
 */
export interface GitHubPublisherConfig extends PublisherConfig {
  GITHUB_TOKEN: string;
  TARGET_REPO: string;
  TARGET_BRANCH: string;
}

/**
 * GitHub API file response structure
 */
export interface GitHubFileResponse {
  sha: string;
  content: string;
  name: string;
}

/**
 * GitHub API create/update file request structure
 */
export interface GitHubCreateFileRequest {
  message: string;
  content: string; // Base64 encoded
  branch: string;
  sha?: string; // Required for updates
}

/**
 * Configuration for pushing files to GitHub
 */
export interface PushConfig {
  GITHUB_TOKEN: string;
  TARGET_REPO: string;
  TARGET_BRANCH: string;
}
