/**
 * Cloudflare Worker entry point for HackerNews Daily Export
 * Handles scheduled (cron) and HTTP-triggered exports
 * 
 * Uses distributed task processing with D1 database for state management
 * and incremental processing across multiple cron triggers.
 */

import { logInfo, logError, logWarn } from './logger';
import { createTaskExecutor } from '../services/task';
import { formatDateForDisplay } from '../utils/date';
import type { Env } from '../types/worker';
import { DailyTaskStatus } from '../types/database';

// Re-export Env type for backward compatibility
export type { Env } from '../types/worker';

/**
 * Handle distributed task processing with state machine
 * State transitions: init → list_fetched → processing → aggregating → published
 */
async function handleDistributedExport(env: Env): Promise<void> {
  try {
    logInfo('=== Distributed Task Processing (Scheduled) ===');
    
    // Debug: Log environment configuration
    console.log('🔍 Environment Check:');
    console.log(`   CRAWLER_API_URL: ${env.CRAWLER_API_URL ? env.CRAWLER_API_URL.substring(0, 50) + '...' : 'NOT SET'}`);
    console.log(`   CRAWLER_API_TOKEN: ${env.CRAWLER_API_TOKEN ? 'SET (' + env.CRAWLER_API_TOKEN.substring(0, 10) + '...)' : 'NOT SET'}`);
    
    // Get today's date
    const today = new Date();
    const taskDate = formatDateForDisplay(today);
    
    logInfo('Task date', { taskDate });
    
    // Initialize task executor
    const executor = createTaskExecutor(env);
    
    // Get or create task
    const storage = executor['storage']; // Access private field for task status check
    const task = await storage.getOrCreateTask(taskDate);
    
    logInfo('Current task status', { 
      taskDate: task.task_date, 
      status: task.status,
      totalArticles: task.total_articles,
      completedArticles: task.completed_articles,
      failedArticles: task.failed_articles
    });
    
    // State machine transitions
    switch (task.status) {
      case DailyTaskStatus.INIT:
        // Initialize task: fetch article list and store in D1
        logInfo('State: init -> Fetching article list');
        const initResult = await executor.initializeTask(taskDate);
        logInfo('Task initialized', initResult);
        break;
      
      case DailyTaskStatus.LIST_FETCHED:
      case DailyTaskStatus.PROCESSING:
        // Process next batch of articles
        logInfo(`State: ${task.status} -> Processing next batch`);
        const batchSize = parseInt(env.TASK_BATCH_SIZE || '6', 10);
        const processResult = await executor.processNextBatch(taskDate, batchSize);

        logInfo('Batch processed', processResult);

        // Check if all articles are processed (no pending or processing articles)
        if (processResult.pending === 0 && processResult.processing === 0) {
          logInfo('All articles processed, transitioning to aggregating');
          await storage.updateTaskStatus(taskDate, DailyTaskStatus.AGGREGATING);
        }
        break;
      
      case DailyTaskStatus.AGGREGATING:
        // Aggregate results and publish
        logInfo('State: aggregating -> Aggregating and publishing');
        const aggregateResult = await executor.aggregateResults(taskDate);
        
        logInfo('Results aggregated', { 
          storyCount: aggregateResult.stories.length,
          markdownLength: aggregateResult.markdown.length 
        });
        
        // Publish results
        const publishResult = await executor.publishResults(taskDate, aggregateResult.markdown);
        logInfo('Results published', publishResult);
        break;
      
      case DailyTaskStatus.PUBLISHED:
        // Task already completed
        logInfo('Task already published for today');
        break;
      
      case DailyTaskStatus.ARCHIVED:
        logWarn('Task is archived, should have been reinitialized');
        break;
    }
    
    logInfo('=== Distributed Task Processing Completed ===');
  } catch (error) {
    logError('Distributed task processing failed', error);
    throw error;
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

    // Run export in background to avoid timeout
    ctx.waitUntil(
      handleDistributedExport(env)
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
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response('HackerNews Daily Export Worker (Distributed Mode)', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'X-Worker-Version': '5.0.0',
        },
      });
    }

    // Debug endpoint to check environment variables
    if (url.pathname === '/debug-env' && request.method === 'GET') {
      const debugInfo = {
        timestamp: new Date().toISOString(),
        crawler: {
          url: {
            configured: !!env.CRAWLER_API_URL,
            preview: env.CRAWLER_API_URL ? env.CRAWLER_API_URL.substring(0, 60) : 'NOT SET',
            length: env.CRAWLER_API_URL?.length || 0,
            hasQuotes: env.CRAWLER_API_URL?.includes('"') || false,
          },
          token: {
            configured: !!env.CRAWLER_API_TOKEN,
            preview: env.CRAWLER_API_TOKEN ? env.CRAWLER_API_TOKEN.substring(0, 10) + '...' : 'NOT SET',
            length: env.CRAWLER_API_TOKEN?.length || 0,
            hasQuotes: env.CRAWLER_API_TOKEN?.includes('"') || false,
          },
        },
      };
      
      return Response.json(debugInfo, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Manual trigger endpoint (async - returns immediately)
    if (url.pathname === '/trigger-export' && request.method === 'POST') {
      logInfo('Manual export triggered via HTTP');
      
      ctx.waitUntil(
        handleDistributedExport(env)
          .then(() => logInfo('Manual export completed'))
          .catch(error => logError('Manual export failed', error))
      );

      return Response.json({
        success: true,
        message: 'Distributed export started in background',
      });
    }

    // Manual trigger endpoint (sync - waits for completion)
    if (url.pathname === '/trigger-export-sync' && request.method === 'POST') {
      logInfo('Manual sync export triggered via HTTP');
      
      try {
        await handleDistributedExport(env);
        return Response.json({
          success: true,
          message: 'Distributed export completed',
        });
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    // Task status endpoint
    if (url.pathname === '/task-status' && request.method === 'GET') {
      try {
        if (!env.DB) {
          throw new Error('D1 database binding (DB) is required');
        }
        
        const executor = createTaskExecutor(env);
        const storage = executor['storage'];
        
        // Get today's task date
        const taskDate = formatDateForDisplay(new Date());
        
        // Get task and progress
        const task = await storage.getOrCreateTask(taskDate);
        const progress = await storage.getTaskProgress(taskDate);
        
        return Response.json({
          success: true,
          taskDate: task.task_date,
          status: task.status,
          totalArticles: task.total_articles,
          completedArticles: task.completed_articles,
          failedArticles: task.failed_articles,
          progress: progress ? {
            pendingCount: progress.pendingCount,
            processingCount: progress.processingCount,
          } : null,
          createdAt: new Date(task.created_at).toISOString(),
          updatedAt: new Date(task.updated_at).toISOString(),
          publishedAt: task.published_at ? new Date(task.published_at).toISOString() : null,
        });
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    // Retry failed articles endpoint
    if (url.pathname === '/retry-failed-tasks' && request.method === 'POST') {
      try {
        if (!env.DB) {
          throw new Error('D1 database binding (DB) is required');
        }
        
        const executor = createTaskExecutor(env);
        const taskDate = formatDateForDisplay(new Date());
        
        const maxRetries = parseInt(env.MAX_RETRY_COUNT || '3', 10);
        const retryCount = await executor.retryFailedArticles(taskDate, maxRetries);
        
        logInfo('Failed articles retry initiated', { taskDate, retryCount });
        
        return Response.json({
          success: true,
          message: `${retryCount} failed articles reset to pending`,
          taskDate,
          retryCount,
        });
      } catch (error) {
        return Response.json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
      }
    }

    // Force publish endpoint
    if (url.pathname === '/force-publish' && request.method === 'POST') {
      try {
        if (!env.DB) {
          throw new Error('D1 database binding (DB) is required');
        }
        
        const executor = createTaskExecutor(env);
        const taskDate = formatDateForDisplay(new Date());
        
        logInfo('Force publish initiated', { taskDate });
        
        const publishResult = await executor.forcePublish(taskDate);
        
        return Response.json({
          success: true,
          message: 'Force publish completed',
          taskDate,
          published: publishResult,
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
