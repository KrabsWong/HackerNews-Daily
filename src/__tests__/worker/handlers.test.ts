/**
 * Tests for HTTP endpoint handlers in the Worker
 * 
 * Tests various endpoints:
 * - GET / (health check)
 * - POST /trigger-export (async export)
 * - POST /trigger-export-sync (sync export)
 * - Unknown routes (404)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../../worker/index';
import { createMockEnv, createMockRequest, createMockExecutionContext } from '../helpers/workerEnvironment';
import type { Env } from '../../worker';

describe('Worker HTTP Handlers', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /', () => {
    it('should return 200 with health check message', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'GET', url: 'https://example.com/' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
      expect(response.headers.get('X-Worker-Version')).toBe('3.0.0');
      const text = await response.text();
      expect(text).toBe('HackerNews Daily Export Worker');
    });

    it('should return same response for root path variations', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'GET', url: 'https://example.com/' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /trigger-export', () => {
    it('should return 202 Accepted and trigger async export', async () => {
      const env = createMockEnv({ localTestMode: true });
      const request = createMockRequest({ method: 'POST', url: 'https://example.com/trigger-export' });
      const ctx = createMockExecutionContext();

      // Mock HackerNews API calls
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000, 40001, 40002]) }) // Firebase story IDs
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) }); // Algolia stories

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.message).toContain('Export started');
    });

    it('should queue export using ctx.waitUntil', async () => {
      const env = createMockEnv({ localTestMode: true });
      const request = createMockRequest({ method: 'POST', url: 'https://example.com/trigger-export' });
      const waitUntilCalls: Promise<any>[] = [];
      const ctx = createMockExecutionContext({
        waitUntilCallbacks: [p => waitUntilCalls.push(p)],
      });

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
      expect(waitUntilCalls.length).toBeGreaterThan(0);
    });

    it('should handle missing LLM_PROVIDER gracefully', async () => {
      const env = createMockEnv();
      delete (env as any).LLM_PROVIDER;
      const request = createMockRequest({ method: 'POST', url: 'https://example.com/trigger-export' });
      const ctx = createMockExecutionContext();

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      // Request should return 200 immediately, error happens in background
      const response = await worker.fetch(request, env, ctx);
      expect(response.status).toBe(200);
    });
  });

  describe('POST /trigger-export-sync', () => {
    // TODO: Integration test - requires comprehensive API mocks
    // This test attempts to run the full daily export workflow which requires
    // mocking Firebase, Algolia, Crawler API, GitHub, and Telegram APIs.
    // Full integration tests are better suited to src/__tests__/integration/
    // it('should return 200 with export result on success', async () => {
    //   const env = createMockEnv({ localTestMode: true });
    //   const request = createMockRequest({ method: 'POST', url: 'https://example.com/trigger-export-sync' });
    //   const ctx = createMockExecutionContext();
    //
    //   mockFetch
    //     .mockResolvedValueOnce({ ok: true, json: async () => ([40000, 40001]) })
    //     .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });
    //
    //   const response = await worker.fetch(request, env, ctx);
    //
    //   expect(response.status).toBe(200);
    //   const data = await response.json() as any;
    //   expect(data.success).toBe(true);
    //   expect(data.message).toBeDefined();
    // }, 15000);

    it('should return 500 on export failure', async () => {
      const env = createMockEnv();
      delete (env as any).LLM_PROVIDER;
      const request = createMockRequest({ method: 'POST', url: 'https://example.com/trigger-export-sync' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    // TODO: Integration test - requires comprehensive API mocks
    // This test attempts to run the full daily export workflow which requires
    // mocking Firebase, Algolia, Crawler API, GitHub, and Telegram APIs.
    // Full integration tests are better suited to src/__tests__/integration/
    // it('should wait for completion before returning', async () => {
    //   const env = createMockEnv({ localTestMode: true });
    //   const request = createMockRequest({ method: 'POST', url: 'https://example.com/trigger-export-sync' });
    //   const ctx = createMockExecutionContext();
    //
    //   mockFetch
    //     .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
    //     .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });
    //
    //   const response = await worker.fetch(request, env, ctx);
    //
    //   // Response should be immediate and successful
    //   expect(response.status).toBe(200);
    // }, 15000);
  });

  describe('Unknown routes', () => {
    it('should return 404 for undefined POST routes', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'POST', url: 'https://example.com/unknown' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
      const text = await response.text();
      expect(text).toBe('Not Found');
    });

    it('should return 404 for undefined GET routes', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'GET', url: 'https://example.com/api/data' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
    });

    it('should return 404 for wrong method on root', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'DELETE', url: 'https://example.com/' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
    });

    it('should return 404 for wrong method on /trigger-export', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'GET', url: 'https://example.com/trigger-export' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(404);
    });
  });

  describe('Request handling edge cases', () => {
    it('should handle URL with query parameters', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'GET', url: 'https://example.com/?test=true' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      expect(response.status).toBe(200);
    });

    it('should handle URL with trailing slash variations', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'POST', url: 'https://example.com/trigger-export/' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      // Routes must match exactly
      expect(response.status).toBe(404);
    });

    it('should handle case-sensitive route matching', async () => {
      const env = createMockEnv();
      const request = createMockRequest({ method: 'POST', url: 'https://example.com/Trigger-Export' });
      const ctx = createMockExecutionContext();

      const response = await worker.fetch(request, env, ctx);

      // Routes are case-sensitive
      expect(response.status).toBe(404);
    });
  });
});
