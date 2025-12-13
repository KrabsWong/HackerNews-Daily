/**
 * GitHub Publisher
 * Publishes Markdown content to GitHub repository
 */

import { Publisher, PublishContent, PublisherConfig } from '../index';
import { pushToGitHub } from './versioning';

/**
 * GitHub publisher configuration
 */
export interface GitHubPublisherConfig extends PublisherConfig {
  GITHUB_TOKEN: string;
  TARGET_REPO: string;
  TARGET_BRANCH: string;
}

/**
 * GitHub Publisher implementation
 * Pushes Markdown files to a GitHub repository with automatic versioning
 */
export class GitHubPublisher implements Publisher {
  readonly name = 'github';
  
  /**
   * Publish content to GitHub repository
   * @param content - Content to publish
   * @param config - GitHub-specific configuration
   */
  async publish(content: PublishContent, config: PublisherConfig): Promise<void> {
    const githubConfig = config as GitHubPublisherConfig;
    
    // Validate required configuration
    if (!githubConfig.GITHUB_TOKEN) {
      throw new Error('GITHUB_TOKEN is required for GitHub publisher');
    }
    if (!githubConfig.TARGET_REPO) {
      throw new Error('TARGET_REPO is required for GitHub publisher');
    }
    if (!githubConfig.TARGET_BRANCH) {
      throw new Error('TARGET_BRANCH is required for GitHub publisher');
    }
    
    // Use existing versioning logic
    await pushToGitHub(
      content.markdown,
      content.dateStr,
      {
        GITHUB_TOKEN: githubConfig.GITHUB_TOKEN,
        TARGET_REPO: githubConfig.TARGET_REPO,
        TARGET_BRANCH: githubConfig.TARGET_BRANCH,
      }
    );
  }
}

// Re-export for backward compatibility
export { pushToGitHub } from './versioning';
export { GitHubClient } from './client';
