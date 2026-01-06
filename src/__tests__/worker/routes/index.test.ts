/**
 * Router Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Router, createRouter } from '../../../worker/routes/index';
import type { Env } from '../../../types/worker';
import * as taskModule from '../../../services/task';

describe('Router', () => {
  let router: Router;
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    router = new Router();
    mockEnv = {
      DB: {} as D1Database,
      LLM_PROVIDER: 'deepseek',
      LLM_DEEPSEEK_API_KEY: 'test-key',
      HN_STORY_LIMIT: '30',
      HN_TIME_WINDOW_HOURS: '24',
      SUMMARY_MAX_LENGTH: '300',
      ENABLE_CONTENT_FILTER: 'false',
      CONTENT_FILTER_SENSITIVITY: 'medium',
      CACHE_ENABLED: 'true',
      TARGET_BRANCH: 'main',
      LLM_BATCH_SIZE: '10',
    } as unknown as Env;

    // Mock task module
    const mockTaskExecutor = {
      initializeTask: vi.fn().mockResolvedValue({ success: true }),
      processNextBatch: vi.fn().mockResolvedValue({ processed: 6, pending: 0, processing: 0, failed: 0 }),
      aggregateResults: vi.fn().mockResolvedValue({ stories: [], markdown: '# Test' }),
      publishResults: vi.fn().mockResolvedValue({ success: true }),
      storage: {
        getOrCreateTask: vi.fn().mockResolvedValue({
          task_date: '2026-01-06',
          status: 'init',
          total_articles: 0,
          completed_articles: 0,
          failed_articles: 0,
        }),
        getTaskProgress: vi.fn().mockResolvedValue({
          status: 'init',
          total: 0,
          completed: 0,
          failed: 0,
          pending: 0,
          processing: 0,
        }),
      },
    };

    vi.spyOn(taskModule, 'createTaskExecutor').mockReturnValue(mockTaskExecutor as any);
  });

  describe('Route Registration', () => {
    it('should register a GET route', async () => {
      const handler = async () => new Response('OK');
      router.get('/test', handler);

      const request = new Request('https://example.com/test');
      const response = await router.handle(request, mockEnv);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    });

    it('should register a POST route', async () => {
      const handler = async () => new Response('OK');
      router.post('/test', handler);

      const request = new Request('https://example.com/test', {
        method: 'POST',
      });
      const response = await router.handle(request, mockEnv);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    });
  });

  describe('Route Matching', () => {
    it('should match route by method and path', async () => {
      const getHandler = async () => new Response('GET');
      const postHandler = async () => new Response('POST');

      router.get('/test', getHandler);
      router.post('/test', postHandler);

      const getRequest = new Request('https://example.com/test');
      const postRequest = new Request('https://example.com/test', {
        method: 'POST',
      });

      const getResponse = await router.handle(getRequest, mockEnv);
      const postResponse = await router.handle(postRequest, mockEnv);

      expect(await getResponse.text()).toBe('GET');
      expect(await postResponse.text()).toBe('POST');
    });

    it('should return 404 for non-existent routes', async () => {
      const request = new Request('https://example.com/not-found');
      const response = await router.handle(request, mockEnv);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe('Not Found');
    });
  });

  describe('createRouter', () => {
    it('should create router with default routes', async () => {
      const defaultRouter = createRouter();

      // Test health check endpoint
      const healthRequest = new Request('https://example.com/');
      const healthResponse = await defaultRouter.handle(healthRequest, mockEnv);

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.headers.get('X-Worker-Version')).toBe('5.0.0');

      // Test debug endpoint
      const debugRequest = new Request('https://example.com/debug-env');
      const debugResponse = await defaultRouter.handle(debugRequest, mockEnv);

      expect(debugResponse.status).toBe(200);
      expect(debugResponse.headers.get('Content-Type')).toBe('application/json');

      const debugData = await debugResponse.json() as any;
      expect(debugData.timestamp).toBeDefined();
      expect(debugData.crawler).toBeDefined();
    });

    it('should return success response for /trigger-export', async () => {
      const defaultRouter = createRouter();
      const request = new Request('https://example.com/trigger-export', {
        method: 'POST',
      });

      const response = await defaultRouter.handle(request, mockEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.message).toContain('started in background');
    });

    it('should return success response for /trigger-export-sync', async () => {
      const defaultRouter = createRouter();
      const request = new Request('https://example.com/trigger-export-sync', {
        method: 'POST',
      });

      const response = await defaultRouter.handle(request, mockEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.message).toContain('completed');
    });

    it('should return task status for /task-status', async () => {
      const defaultRouter = createRouter();
      const request = new Request('https://example.com/task-status', {
        method: 'GET',
      });

      const response = await defaultRouter.handle(request, mockEnv);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.taskDate).toBeDefined();
      expect(data.stats).toBeDefined();
    });
  });
});
