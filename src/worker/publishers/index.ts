/**
 * Publisher Abstraction
 * 
 * Defines the interface for all publishing channels (GitHub, Telegram, RSS, etc.)
 * Each publisher is responsible for delivering content to a specific destination
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
