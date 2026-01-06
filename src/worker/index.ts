/**
 * Cloudflare Worker entry point for HackerNews Daily Export
 * Handles scheduled (cron) and HTTP-triggered exports
 *
 * Uses distributed task processing with D1 database for state management
 * and incremental processing across multiple cron triggers.
 */

import { logInfo, logError } from './logger';
import { executeStateMachine } from './statemachine/index';
import { createRouter } from './routes/index';
import type { Env } from '../types/worker';

// Re-export Env type for backward compatibility
export type { Env } from '../types/worker';

// Create router instance
const router = createRouter();

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

    // Run export in background to avoid timeout
    ctx.waitUntil(
      executeStateMachine(env)
        .then(() => logInfo('Scheduled export completed'))
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
    return router.handle(request, env);
  },
};
