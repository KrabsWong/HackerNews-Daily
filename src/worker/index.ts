/**
 * Cloudflare Worker entry point for HackerNews Daily Export
 * Handles scheduled (cron) and HTTP-triggered exports
 */

import { runDailyExport } from './exportHandler';
import { pushToGitHub } from './githubPush';
import { logInfo, logError } from './logger';

/**
 * Environment variables and secrets available to the Worker
 * Configured via wrangler.toml and Cloudflare secrets
 */
export interface Env {
  // Secrets (set via wrangler secret put)
  DEEPSEEK_API_KEY: string;
  GITHUB_TOKEN: string;
  CRAWLER_API_URL?: string;
  
  // Configuration variables (set in wrangler.toml)
  HN_STORY_LIMIT: string;
  HN_TIME_WINDOW_HOURS: string;
  SUMMARY_MAX_LENGTH: string;
  ENABLE_CONTENT_FILTER: string;
  CONTENT_FILTER_SENSITIVITY: string;
  CACHE_ENABLED: string;
  TARGET_REPO: string;
  TARGET_BRANCH: string;
}

/**
 * Handle the daily export process
 * Executes the export pipeline and pushes to GitHub
 */
async function handleDailyExport(env: Env): Promise<string> {
  try {
    logInfo('=== Daily Export Started ===');

    // Validate required secrets
    if (!env.DEEPSEEK_API_KEY) {
      throw new Error('Missing DEEPSEEK_API_KEY secret');
    }
    if (!env.GITHUB_TOKEN) {
      throw new Error('Missing GITHUB_TOKEN secret');
    }

    // Set crawler API URL in process.env if provided
    if (env.CRAWLER_API_URL) {
      (process as any).env = (process as any).env || {};
      (process as any).env.CRAWLER_API_URL = env.CRAWLER_API_URL;
    }

    // Run the export pipeline
    logInfo('Running export pipeline');
    const { markdown, dateStr } = await runDailyExport(env);

    // Push to GitHub
    logInfo('Pushing to GitHub repository');
    await pushToGitHub(markdown, dateStr, {
      GITHUB_TOKEN: env.GITHUB_TOKEN,
      TARGET_REPO: env.TARGET_REPO || 'KrabsWong/tldr-hacknews-24',
      TARGET_BRANCH: env.TARGET_BRANCH || 'main',
    });

    const successMessage = `Export completed successfully for ${dateStr}`;
    logInfo('=== Daily Export Completed ===', { dateStr });
    
    return successMessage;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('=== Daily Export Failed ===', error);
    throw new Error(`Export failed: ${errorMessage}`);
  }
}

/**
 * Cloudflare Worker default export
 * Handles both scheduled (cron) and HTTP requests
 */
export default {
  /**
   * Handle scheduled (cron) triggers
   * Configured in wrangler.toml: crons = ["0 1 * * *"]
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    logInfo('Scheduled export triggered', { 
      cron: event.cron,
      scheduledTime: new Date(event.scheduledTime).toISOString() 
    });

    // Use waitUntil to allow long-running export beyond initial response
    ctx.waitUntil(
      handleDailyExport(env)
        .then((message) => {
          logInfo('Scheduled export succeeded', { message });
        })
        .catch((error) => {
          logError('Scheduled export failed', error);
        })
    );
  },

  /**
   * Handle HTTP requests
   * Provides health check and manual trigger endpoints
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response('HackerNews Daily Export Worker', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'X-Worker-Version': '1.0.0',
        },
      });
    }

    // Manual trigger endpoint
    if (url.pathname === '/trigger-export' && request.method === 'POST') {
      logInfo('Manual export triggered', { 
        source: 'http',
        userAgent: request.headers.get('User-Agent') 
      });

      // Start export asynchronously
      ctx.waitUntil(
        handleDailyExport(env)
          .then((message) => {
            logInfo('Manual export succeeded', { message });
          })
          .catch((error) => {
            logError('Manual export failed', error);
          })
      );

      return new Response('Export triggered', {
        status: 202,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // 404 for unknown routes
    return new Response('Not Found', { status: 404 });
  },
};
