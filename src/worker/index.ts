/**
 * Cloudflare Worker entry point for HackerNews Daily Export
 * Handles scheduled (cron) and HTTP-triggered exports
 * 
 * Simple architecture: Cron -> runDailyExport -> Push to GitHub
 * No subrequest limits with paid plan.
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
  DEEPSEEK_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  GITHUB_TOKEN: string;
  CRAWLER_API_URL?: string;
  
  // LLM Provider configuration
  LLM_PROVIDER?: string;  // 'deepseek' | 'openrouter'
  OPENROUTER_MODEL?: string;
  OPENROUTER_SITE_URL?: string;
  OPENROUTER_SITE_NAME?: string;
  
  // Configuration variables (set in wrangler.toml)
  HN_STORY_LIMIT: string;
  HN_TIME_WINDOW_HOURS: string;
  SUMMARY_MAX_LENGTH: string;
  ENABLE_CONTENT_FILTER: string;
  CONTENT_FILTER_SENSITIVITY: string;
  CACHE_ENABLED: string;
  TARGET_REPO: string;
  TARGET_BRANCH: string;
  LLM_BATCH_SIZE: string;
}

/**
 * Handle the daily export process
 * Executes the export pipeline and pushes to GitHub
 */
async function handleDailyExport(env: Env): Promise<string> {
  try {
    logInfo('=== Daily Export Started ===');

    // Validate required secrets based on provider
    const provider = (env.LLM_PROVIDER?.toLowerCase() || 'deepseek') as 'deepseek' | 'openrouter';
    
    if (provider === 'openrouter') {
      if (!env.OPENROUTER_API_KEY) {
        throw new Error('Missing OPENROUTER_API_KEY secret (required when LLM_PROVIDER=openrouter)');
      }
    } else {
      if (!env.DEEPSEEK_API_KEY) {
        throw new Error('Missing DEEPSEEK_API_KEY secret');
      }
    }
    
    if (!env.GITHUB_TOKEN) {
      throw new Error('Missing GITHUB_TOKEN secret');
    }

    // Set environment variables for process.env access
    (process as any).env = (process as any).env || {};
    if (env.CRAWLER_API_URL) {
      (process as any).env.CRAWLER_API_URL = env.CRAWLER_API_URL;
    }
    if (env.LLM_PROVIDER) {
      (process as any).env.LLM_PROVIDER = env.LLM_PROVIDER;
    }
    if (env.OPENROUTER_MODEL) {
      (process as any).env.OPENROUTER_MODEL = env.OPENROUTER_MODEL;
    }
    if (env.OPENROUTER_SITE_URL) {
      (process as any).env.OPENROUTER_SITE_URL = env.OPENROUTER_SITE_URL;
    }
    if (env.OPENROUTER_SITE_NAME) {
      (process as any).env.OPENROUTER_SITE_NAME = env.OPENROUTER_SITE_NAME;
    }

    // Run the export pipeline
    logInfo('Running export pipeline', { provider });
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
      scheduledTime: new Date(event.scheduledTime).toISOString(),
    });

    // Run export in background to avoid timeout
    ctx.waitUntil(
      handleDailyExport(env)
        .then(result => logInfo('Scheduled export completed', { result }))
        .catch(error => logError('Scheduled export failed', error))
    );
  },

  /**
   * Handle HTTP requests
   * Provides manual trigger and health check endpoints
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
          'X-Worker-Version': '3.0.0',
        },
      });
    }

    // Manual trigger endpoint (async - returns immediately)
    if (url.pathname === '/trigger-export' && request.method === 'POST') {
      logInfo('Manual export triggered via HTTP');
      
      ctx.waitUntil(
        handleDailyExport(env)
          .then(result => logInfo('Manual export completed', { result }))
          .catch(error => logError('Manual export failed', error))
      );

      return Response.json({
        success: true,
        message: 'Export started in background',
      });
    }

    // Manual trigger endpoint (sync - waits for completion)
    if (url.pathname === '/trigger-export-sync' && request.method === 'POST') {
      logInfo('Manual sync export triggered via HTTP');
      
      try {
        const result = await handleDailyExport(env);
        return Response.json({
          success: true,
          message: result,
        });
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    // 404 for unknown routes
    return new Response('Not Found', { status: 404 });
  },
};
