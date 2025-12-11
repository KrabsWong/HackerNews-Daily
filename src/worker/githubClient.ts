/**
 * GitHub API client for pushing files to repository
 * Uses GitHub REST API v3
 */

import { FetchError } from '../utils/fetch';
import { logInfo, logWarn, logError } from './logger';

interface GitHubFileResponse {
  sha: string;
  content: string;
  name: string;
}

interface GitHubCreateFileRequest {
  message: string;
  content: string; // Base64 encoded
  branch: string;
  sha?: string; // Required for updates
}

export class GitHubClient {
  private token: string;
  private baseURL = 'https://api.github.com';

  constructor(token: string) {
    if (!token || token.trim() === '') {
      throw new Error('Missing GITHUB_TOKEN');
    }
    this.token = token;
  }

  /**
   * Make a request to GitHub API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<{ data: T; status: number; headers: Headers }> {
    const url = `${this.baseURL}${path}`;
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'HackerNewsDaily-Worker/1.0',
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle authentication errors (don't retry)
        if (response.status === 401 || response.status === 403) {
          const errorText = await response.text();
          throw new Error(
            `GitHub authentication failed: ${response.status} ${response.statusText}. ` +
            `Check GITHUB_TOKEN expiration and scopes (requires 'repo'). Details: ${errorText}`
          );
        }

        // Handle rate limiting
        if (response.status === 429) {
          const resetTime = response.headers.get('X-RateLimit-Reset');
          const remaining = response.headers.get('X-RateLimit-Remaining');
          
          logWarn('GitHub API rate limit reached', { 
            remaining,
            resetTime: resetTime ? new Date(parseInt(resetTime) * 1000).toISOString() : 'unknown'
          });

          if (attempt < maxRetries) {
            // Wait and retry
            const waitTime = 2000 * attempt; // Exponential backoff: 2s, 4s, 6s
            logInfo(`Retrying after ${waitTime}ms`, { attempt, maxRetries });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          
          throw new Error('GitHub API rate limit exceeded after retries');
        }

        // Handle 5xx server errors (retry)
        if (response.status >= 500) {
          if (attempt < maxRetries) {
            const waitTime = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
            logWarn(`GitHub server error ${response.status}, retrying...`, { attempt, waitTime });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error(`GitHub API server error: ${response.status} ${response.statusText}`);
        }

        // Handle 4xx client errors (don't retry, except 409 Conflict)
        if (response.status >= 400 && response.status !== 404 && response.status !== 409) {
          const errorText = await response.text();
          throw new Error(`GitHub API client error: ${response.status} ${response.statusText}. ${errorText}`);
        }

        // Success or 404 (which is handled by caller)
        const data = response.status === 404 ? null : await response.json();
        
        return {
          data: data as T,
          status: response.status,
          headers: response.headers,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on authentication/client errors
        if (lastError.message.includes('authentication') || 
            lastError.message.includes('client error')) {
          throw lastError;
        }

        // Retry on network errors
        if (attempt < maxRetries) {
          const waitTime = 1000 * Math.pow(2, attempt - 1);
          logWarn('Request failed, retrying...', { 
            attempt, 
            maxRetries,
            error: lastError.message,
            waitTime 
          });
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Get file content from repository
   * Returns null if file doesn't exist (404)
   */
  async getFileContent(
    repo: string,
    path: string,
    branch: string
  ): Promise<{ sha: string; content: string } | null> {
    try {
      const response = await this.request<GitHubFileResponse>(
        'GET',
        `/repos/${repo}/contents/${path}?ref=${branch}`
      );

      if (response.status === 404) {
        return null;
      }

      // Decode base64 content
      const content = atob(response.data.content.replace(/\n/g, ''));
      
      return {
        sha: response.data.sha,
        content,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(
    repo: string,
    path: string,
    branch: string,
    content: string,
    message: string,
    sha?: string
  ): Promise<void> {
    // Base64 encode content
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const requestBody: GitHubCreateFileRequest = {
      message,
      content: encodedContent,
      branch,
      ...(sha ? { sha } : {}),
    };

    try {
      const response = await this.request<any>(
        'PUT',
        `/repos/${repo}/contents/${path}`,
        requestBody
      );

      // Log rate limit info
      const remaining = response.headers.get('X-RateLimit-Remaining');
      if (remaining && parseInt(remaining) < 10) {
        logWarn('GitHub API rate limit low', { remaining });
      }

      logInfo('File successfully pushed to GitHub', { 
        repo,
        path,
        branch,
        commitSha: response.data.commit?.sha 
      });
    } catch (error) {
      logError('Failed to push file to GitHub', error, { repo, path, branch });
      throw error;
    }
  }
}
