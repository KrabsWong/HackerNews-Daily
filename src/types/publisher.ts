/**
 * Publisher-related type definitions
 * 
 * Types for content publishing to various destinations (GitHub, Telegram, RSS, etc.)
 */

import type { ProcessedStory } from './shared';

/**
 * Publisher type enum
 */
export enum PublisherType {
  GITHUB = 'github',
  TELEGRAM = 'telegram',
  TERMINAL = 'terminal',
}

/**
 * GitHub publisher configuration
 */
export interface GitHubPublisherConfig {
  type: PublisherType.GITHUB;
  GITHUB_TOKEN: string;
  TARGET_REPO: string;
  TARGET_BRANCH: string;
}

/**
 * Telegram publisher configuration
 */
export interface TelegramPublisherConfig {
  type: PublisherType.TELEGRAM;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
}

/**
 * Terminal publisher configuration (for console output)
 */
export interface TerminalPublisherConfig {
  type: PublisherType.TERMINAL;
}

/**
 * Discriminated union of all publisher configurations
 * The 'type' field acts as the discriminator
 */
export type PublisherConfig =
  | GitHubPublisherConfig
  | TelegramPublisherConfig
  | TerminalPublisherConfig;

/**
 * Content to be published
 */
export interface PublishContent {
  /** Markdown content to publish */
  markdown: string;
  /** Date string in YYYY-MM-DD format */
  dateStr: string;
  /** Processed stories for publishers that need structured data (e.g., Telegram) */
  stories?: ProcessedStory[];
  /** Additional metadata from the content source */
  metadata?: Record<string, any>;
}

/**
 * Publisher interface
 * All publishers MUST implement this interface
 */
export interface Publisher {
  /** Unique name of the publisher (e.g., PublisherType.GITHUB, PublisherType.TELEGRAM) */
  readonly name: PublisherType;

  
  /**
   * Publish content to the destination
   * @param content - Content to publish
   * @param config - Publisher-specific configuration
   * @returns Promise that resolves when publishing is complete
   */
  publish(content: PublishContent, config: PublisherConfig): Promise<void>;
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
