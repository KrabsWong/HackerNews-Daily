/**
 * Router Module
 * Simple HTTP router for Worker endpoints
 */

import type { Env } from '../../types/worker';
import type {
  CreateBookmarkResponse,
  BookmarkQueryResponse,
  BookmarkErrorResponse,
} from '../../types/bookmark';
import {
  createBookmarkStorage,
  validateCreateBookmarkRequest,
  validateUrlQueryParam,
} from '../../services/bookmark';

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
/**
 * CORS headers for cross-origin requests (Chrome extension support)
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Add CORS headers to a response
 */
function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Create a JSON response with CORS headers
 */
function jsonResponse<T>(data: T, status = 200): Response {
  return withCors(Response.json(data, { status }));
}

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
   * Register an OPTIONS route (for CORS preflight)
   */
  options(path: string, handler: RouteHandler): void {
    this.register('OPTIONS', path, handler);
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

  // ==================== Bookmark API Endpoints ====================

  // CORS preflight handler for /api/bookmarks
  router.options('/api/bookmarks', async () => {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  });

  // POST /api/bookmarks - Create a new bookmark
  router.post('/api/bookmarks', async (req, env) => {
    try {
      // Check database binding
      if (!env.DB) {
        const errorResponse: BookmarkErrorResponse = {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database not configured',
          },
        };
        return jsonResponse(errorResponse, 500);
      }

      // Parse request body
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        const errorResponse: BookmarkErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid JSON in request body',
          },
        };
        return jsonResponse(errorResponse, 400);
      }

      // Validate request
      const validation = validateCreateBookmarkRequest(body);
      if (!validation.valid || !validation.data) {
        const errorResponse: BookmarkErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.errors.map(e => e.message),
          },
        };
        return jsonResponse(errorResponse, 400);
      }

      const storage = createBookmarkStorage(env.DB);

      // Check for duplicate URL
      const existingId = await storage.checkDuplicate(validation.data.url);
      if (existingId !== null) {
        const errorResponse: BookmarkErrorResponse = {
          success: false,
          error: {
            code: 'DUPLICATE_URL',
            message: 'Bookmark with this URL already exists',
            existing_id: existingId,
          },
        };
        return jsonResponse(errorResponse, 409);
      }

      // Create bookmark
      const bookmark = await storage.createBookmark(validation.data);

      const successResponse: CreateBookmarkResponse = {
        success: true,
        data: {
          id: bookmark.id,
          url: bookmark.url,
          title: bookmark.title,
          description: bookmark.description,
          summary: bookmark.summary,
          summary_zh: bookmark.summary_zh,
          tags: bookmark.tags,
          created_at: bookmark.created_at,
        },
      };

      return jsonResponse(successResponse, 201);
    } catch (error) {
      console.error('Error creating bookmark:', error);
      const errorResponse: BookmarkErrorResponse = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown database error',
        },
      };
      return jsonResponse(errorResponse, 500);
    }
  });

  // GET /api/bookmarks - Query bookmark by URL
  router.get('/api/bookmarks', async (_req, env, url) => {
    try {
      // Check database binding
      if (!env.DB) {
        const errorResponse: BookmarkErrorResponse = {
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database not configured',
          },
        };
        return jsonResponse(errorResponse, 500);
      }

      // Get and validate URL parameter
      const urlParam = url.searchParams.get('url');
      const validation = validateUrlQueryParam(urlParam);
      if (!validation.valid) {
        const errorResponse: BookmarkErrorResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.errors[0]?.message || 'url query parameter is required',
          },
        };
        return jsonResponse(errorResponse, 400);
      }

      const storage = createBookmarkStorage(env.DB);

      // Query bookmark
      const bookmark = await storage.getBookmarkWithTags(urlParam!);

      if (!bookmark) {
        const errorResponse: BookmarkErrorResponse = {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No bookmark found for this URL',
          },
        };
        return jsonResponse(errorResponse, 404);
      }

      const successResponse: BookmarkQueryResponse = {
        success: true,
        data: bookmark,
      };

      return jsonResponse(successResponse, 200);
    } catch (error) {
      console.error('Error querying bookmark:', error);
      const errorResponse: BookmarkErrorResponse = {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: error instanceof Error ? error.message : 'Unknown database error',
        },
      };
      return jsonResponse(errorResponse, 500);
    }
  });

  return router;
}
