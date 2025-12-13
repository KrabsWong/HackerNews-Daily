/**
 * GitHub push handler with file versioning logic
 * Pushes generated Markdown files to target repository
 */

import { GitHubClient } from './client';
import { logInfo, logWarn, logError } from '../../logger';
import type { PushConfig } from '../../../types/publisher';

/**
 * Push Markdown file to GitHub repository with automatic versioning
 * If a file with the same name already exists, creates a versioned file (e.g., YYYY-MM-DD-daily-v2.md)
 */
export async function pushToGitHub(
  markdown: string,
  dateStr: string, // YYYY-MM-DD format
  config: PushConfig
): Promise<void> {
  const client = new GitHubClient(config.GITHUB_TOKEN);
  const repo = config.TARGET_REPO;
  const branch = config.TARGET_BRANCH;

  try {
    // Step 1: Check if file already exists
    let filename = `${dateStr}-daily.md`;
    let path = `_posts/${filename}`;
    
    logInfo('Checking for existing file', { filename, repo, branch });
    
    let existing = await client.getFileContent(repo, path, branch);

    // Step 2: Handle versioning if file exists
    if (existing) {
      logWarn('File already exists, checking for next version', { filename });
      
      let version = 2;
      const maxVersionCheck = 10; // Safety limit to prevent infinite loop
      
      while (version <= maxVersionCheck) {
        filename = `${dateStr}-daily-v${version}.md`;
        path = `_posts/${filename}`;
        
        existing = await client.getFileContent(repo, path, branch);
        
        if (!existing) {
          logInfo('Using versioned filename', { filename, version });
          break;
        }
        
        version++;
      }

      if (version > maxVersionCheck) {
        throw new Error(`Too many versions exist for date ${dateStr} (exceeded ${maxVersionCheck})`);
      }
    } else {
      logInfo('File does not exist, will create new file', { filename });
    }

    // Step 3: Generate commit message
    const versionMatch = filename.match(/-v(\d+)\.md$/);
    const versionSuffix = versionMatch ? ` (v${versionMatch[1]})` : '';
    const commitMessage = `Add HackerNews daily export for ${dateStr}${versionSuffix}`;

    // Step 4: Push file to GitHub
    logInfo('Pushing file to GitHub', { 
      repo,
      branch,
      path,
      contentSize: markdown.length,
      commitMessage 
    });

    await client.createOrUpdateFile(
      repo,
      path,
      branch,
      markdown,
      commitMessage,
      existing?.sha // Include SHA if updating existing file (shouldn't happen with versioning, but just in case)
    );

    logInfo('Successfully pushed to GitHub', { 
      filename,
      repo,
      fullPath: `${repo}/_posts/${filename}` 
    });
  } catch (error) {
    logError('Failed to push to GitHub', error, { dateStr, repo });
    throw error;
  }
}
