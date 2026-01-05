/**
 * GitHub Publisher
 * Publishes Markdown content to GitHub repository
 */

import type { Publisher, PublishContent, PublisherConfig, GitHubPublisherConfig } from '../../../types/publisher';
import { PublisherType } from '../../../types/publisher';
import { pushToGitHub } from './versioning';

/**
 * GitHub Publisher implementation
 * Pushes Markdown files to a GitHub repository with automatic versioning
 */
export class GitHubPublisher implements Publisher {
  readonly name = PublisherType.GITHUB;
  
  /**
   * Publish content to GitHub repository
   * @param content - Content to publish
   * @param config - GitHub-specific configuration
   */
  async publish(content: PublishContent, config: PublisherConfig): Promise<void> {
    // Type guard: ensure config is GitHubPublisherConfig
    if (config.type !== PublisherType.GITHUB) {
      throw new Error(`Invalid config type: expected '${PublisherType.GITHUB}', got '${config.type}'`);
    }
    
    // Validate required configuration
    if (!config.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is required for GitHub publisher');
    }
    if (!config.TARGET_REPO) {
      throw new Error('TARGET_REPO is required for GitHub publisher');
    }
    if (!config.TARGET_BRANCH) {
      throw new Error('TARGET_BRANCH is required for GitHub publisher');
    }
    
    // Use existing versioning logic
    await pushToGitHub(
      content.markdown,
      content.dateStr,
      {
        GITHUB_TOKEN: config.GITHUB_TOKEN,
        TARGET_REPO: config.TARGET_REPO,
        TARGET_BRANCH: config.TARGET_BRANCH,
      }
    );
  }
}

// Re-export for backward compatibility
export { pushToGitHub } from './versioning';
export { GitHubClient } from './client';
