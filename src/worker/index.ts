/**
 * Cloudflare Worker entry point for HackerNews Daily Export
 * Handles scheduled (cron) and HTTP-triggered exports
 * 
 * Simple architecture: Cron -> runDailyExport -> Push to GitHub
 * No subrequest limits with paid plan.
 */

import { HackerNewsSource } from './sources/hackernews';
import { GitHubPublisher } from './publishers/github';
import { TelegramPublisher } from './publishers/telegram';
import { validateWorkerConfig, isGitHubConfigValid, validateGitHubConfig, isTelegramConfigValid, validateTelegramConfig } from './config/validation';
import { logInfo, logError, logWarn } from './logger';
import { LLMProviderType } from '../config/constants';
import type { Env } from '../types/worker';

// Re-export Env type for backward compatibility
export type { Env } from '../types/worker';

/**
 * Handle the daily export process
 * Executes the export pipeline and pushes to GitHub
 */
async function handleDailyExport(env: Env): Promise<string> {
  try {
    logInfo('=== Daily Export Started ===');

    // Validate configuration (fail fast if required vars missing)
    validateWorkerConfig(env);

    // Set environment variables for process.env access
    (process as any).env = (process as any).env || {};
    if (env.CRAWLER_API_URL) {
      (process as any).env.CRAWLER_API_URL = env.CRAWLER_API_URL;
    }
    if (env.LLM_PROVIDER) {
      (process as any).env.LLM_PROVIDER = env.LLM_PROVIDER;
    }
    if (env.LLM_DEEPSEEK_MODEL) {
      (process as any).env.LLM_DEEPSEEK_MODEL = env.LLM_DEEPSEEK_MODEL;
    }
    if (env.LLM_OPENROUTER_MODEL) {
      (process as any).env.LLM_OPENROUTER_MODEL = env.LLM_OPENROUTER_MODEL;
    }
    if (env.LLM_OPENROUTER_SITE_URL) {
      (process as any).env.LLM_OPENROUTER_SITE_URL = env.LLM_OPENROUTER_SITE_URL;
    }
    if (env.LLM_OPENROUTER_SITE_NAME) {
      (process as any).env.LLM_OPENROUTER_SITE_NAME = env.LLM_OPENROUTER_SITE_NAME;
    }

    // Initialize source
    const source = new HackerNewsSource();
    
    // Fetch content from source
    logInfo('Fetching content from source', { source: source.name });
    const content = await source.fetchContent(new Date(), env);
    
    // Track publishing results
    const publishResults: string[] = [];
    
    // Publish to GitHub (optional, enabled by default)
    const githubWarnings = validateGitHubConfig(env);
    for (const warning of githubWarnings) {
      logWarn(warning);
    }
    
    if (isGitHubConfigValid(env)) {
      try {
        const githubPublisher = new GitHubPublisher();
        logInfo('Publishing content to GitHub', { 
          publisher: githubPublisher.name, 
          repo: env.TARGET_REPO 
        });
        await githubPublisher.publish(content, {
          GITHUB_TOKEN: env.GITHUB_TOKEN!,
          TARGET_REPO: env.TARGET_REPO!,
          TARGET_BRANCH: env.TARGET_BRANCH || 'main',
        });
        logInfo('GitHub publishing completed successfully');
        publishResults.push('GitHub');
      } catch (error) {
        logError('GitHub publishing failed', error);
        throw error; // Re-throw GitHub errors as they are critical when enabled
      }
    } else {
      logInfo('GitHub publishing is disabled');
    }

    // Publish to Telegram (optional)
    const telegramWarnings = validateTelegramConfig(env);
    for (const warning of telegramWarnings) {
      logWarn(warning);
    }
    
    if (isTelegramConfigValid(env)) {
      try {
        const telegramPublisher = new TelegramPublisher();
        logInfo('Publishing content to Telegram', { 
          publisher: telegramPublisher.name, 
          channelId: env.TELEGRAM_CHANNEL_ID 
        });
        await telegramPublisher.publish(content, {
          TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN!,
          TELEGRAM_CHANNEL_ID: env.TELEGRAM_CHANNEL_ID!,
        });
        logInfo('Telegram publishing completed successfully');
        publishResults.push('Telegram');
      } catch (error) {
        // Log error but don't fail the export - Telegram is optional
        logError('Telegram publishing failed (export continues)', error);
      }
    } else {
      logInfo('Telegram publishing is disabled');
    }

    const successMessage = `Export completed successfully for ${content.dateStr} (published to: ${publishResults.join(', ') || 'none'})`;
    logInfo('=== Daily Export Completed ===', { dateStr: content.dateStr });
    
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
