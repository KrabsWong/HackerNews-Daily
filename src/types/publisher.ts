/**
 * Publisher-related type definitions
 * 
 * Types for content publishing to various destinations (GitHub, Telegram, RSS, etc.)
 */

import type { ProcessedStory } from './shared';

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
  /** Processed stories for publishers that need structured data (e.g., Telegram) */
  stories: ProcessedStory[];
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

/**
 * Telegram publisher configuration
 */
export interface TelegramPublisherConfig extends PublisherConfig {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

/**
 * Telegram API sendMessage response structure
 */
export interface TelegramMessageResponse {
  ok: boolean;
  result?: {
    message_id: number;
    chat: {
      id: number;
      title?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
  description?: string;
  error_code?: number;
}
