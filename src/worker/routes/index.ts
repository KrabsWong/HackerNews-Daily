/**
 * Router Module
 * Simple HTTP router for Worker endpoints
 */

import type { Env } from '../../types/worker';

/**
 * Route handler function type
 */
type RouteHandler = (
  request: Request,
  env: Env,
  url: URL
) => Promise<Response>;

/**
 * Route definition
 */
interface Route {
  method: string;
  path: string;
  handler: RouteHandler;
}

/**
 * HTTP Router
 */
export class Router {
  private routes: Route[] = [];

  /**
   * Register a route
   */
  register(method: string, path: string, handler: RouteHandler): void {
    this.routes.push({ method, path, handler });
  }

  /**
   * Register a GET route
   */
  get(path: string, handler: RouteHandler): void {
    this.register('GET', path, handler);
  }

  /**
   * Register a POST route
   */
  post(path: string, handler: RouteHandler): void {
    this.register('POST', path, handler);
  }

  /**
   * Match a route and execute its handler
   */
  async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Find matching route
    for (const route of this.routes) {
      if (route.method === request.method && route.path === url.pathname) {
        return route.handler(request, env, url);
      }
    }

    // No matching route
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

/**
 * Create default router with all routes
 */
export function createRouter(): Router {
  const router = new Router();

  // Health check endpoint
  router.get('/', async (_req, _env) => {
    return new Response('HackerNews Daily Export Worker (Distributed Mode)', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'X-Worker-Version': '5.0.0',
      },
    });
  });

  // Debug endpoint to check environment variables
  router.get('/debug-env', async (_req, env) => {
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
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });

  // Manual trigger endpoint (async - returns immediately)
  router.post('/trigger-export', async (req, env) => {
    const { logInfo, logError } = await import('../logger');
    const { executeStateMachine } = await import('../statemachine/index');

    logInfo('Manual export triggered via HTTP');

    // Note: This would use ctx.waitUntil() in the actual Worker
    // But since we don't have ctx here, we just log the start
    executeStateMachine(env)
      .then(() => logInfo('Manual export completed'))
      .catch(error => logError('Manual export failed', error));

    return Response.json({
      success: true,
      message: 'Distributed export started in background',
    });
  });

  // Manual trigger endpoint (sync - waits for completion)
  router.post('/trigger-export-sync', async (req, env) => {
    const { logInfo } = await import('../logger');
    const { executeStateMachine } = await import('../statemachine/index');

    logInfo('Manual sync export triggered via HTTP');

    try {
      await executeStateMachine(env);
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
  });

  // Task status endpoint
  router.get('/task-status', async (_req, env) => {
    const { formatDateForDisplay } = await import('../../utils/date');
    const { createTaskExecutor } = await import('../../services/task');

    try {
      if (!env.DB) {
        throw new Error('D1 database binding (DB) is required');
      }

      const executor = createTaskExecutor(env);
      const storage = executor['storage'];

      // Get today's task date
      const taskDate = formatDateForDisplay(new Date());

      // Get task progress
      const progress = await storage.getTaskProgress(taskDate);

      if (!progress) {
        return Response.json({
          success: true,
          exists: false,
          message: 'No task found for today',
        });
      }

      return Response.json({
        success: true,
        exists: true,
        taskDate,
        stats: progress,
      });
    } catch (error) {
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }, { status: 500 });
    }
  });

  return router;
}
