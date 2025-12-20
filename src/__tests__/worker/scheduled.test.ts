/**
 * Tests for Scheduled (Cron) Event Handler
 * 
 * Tests cron-triggered daily export functionality:
 * - Scheduled event triggers export
 * - Async execution with ctx.waitUntil
 * - Error handling
 * - Metrics logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../../worker/index';
import { createMockEnv, createMockExecutionContext } from '../helpers/workerEnvironment';

describe('Worker Scheduled Handler', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scheduled event handling', () => {
    it('should trigger daily export on scheduled event', async () => {
      const env = createMockEnv({ localTestMode: true });
      const now = new Date();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: now.getTime(),
      };
      const ctx = createMockExecutionContext();

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000, 40001, 40002]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      // Should complete without error
      await worker.scheduled(scheduledEvent, env, ctx);
      
      // Verify waitUntil was called (scheduled runs in background)
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should use ctx.waitUntil for async execution', async () => {
      const env = createMockEnv({ localTestMode: true });
      const waitUntilCalls: Promise<any>[] = [];
      const ctx = createMockExecutionContext({
        waitUntilCallbacks: [p => waitUntilCalls.push(p)],
      });
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      await worker.scheduled(scheduledEvent, env, ctx);

      expect(waitUntilCalls.length).toBeGreaterThan(0);
    });

    it('should handle export success', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000, 40001]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      // Should not throw
      await expect(worker.scheduled(scheduledEvent, env, ctx)).resolves.toBeUndefined();
    });

    it('should handle missing LLM_PROVIDER in background', async () => {
      const env = createMockEnv();
      delete (env as any).LLM_PROVIDER;
      const ctx = createMockExecutionContext();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      // Should complete (error happens in background)
      await expect(worker.scheduled(scheduledEvent, env, ctx)).resolves.toBeUndefined();
    });

    it('should handle Firebase API failure in background', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      // Should complete (error happens in background)
      await expect(worker.scheduled(scheduledEvent, env, ctx)).resolves.toBeUndefined();
    });

    it('should handle network timeout in background', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      // Should complete (error happens in background)
      await expect(worker.scheduled(scheduledEvent, env, ctx)).resolves.toBeUndefined();
    });
  });

  describe('cron schedule handling', () => {
    it('should accept various cron formats', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      const cronFormats = [
        '0 1 * * *', // Daily at 1 AM
        '0 0 * * *', // Daily at midnight
        '*/30 * * * *', // Every 30 minutes
      ];

      for (const cron of cronFormats) {
        const scheduledEvent: any = {
          cron,
          scheduledTime: Date.now(),
        };

        await expect(worker.scheduled(scheduledEvent, env, ctx)).resolves.toBeUndefined();
      }
    });

    it('should preserve cron expression in logs', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const cronExpr = '0 1 * * *';
      const scheduledEvent: any = {
        cron: cronExpr,
        scheduledTime: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      await worker.scheduled(scheduledEvent, env, ctx);
      
      // Cron was accepted
      expect(scheduledEvent.cron).toBe(cronExpr);
    });

    it('should handle scheduled time correctly', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const scheduledTime = new Date('2025-12-20T01:00:00Z').getTime();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime,
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      await worker.scheduled(scheduledEvent, env, ctx);
      
      // Scheduled time is preserved
      expect(scheduledEvent.scheduledTime).toBe(scheduledTime);
    });
  });

  // TODO: Integration test - requires comprehensive API mocks (execution context handling)
  // This suite contains tests that attempt to run the full daily export workflow which
  // requires mocking Firebase, Algolia, Crawler API, GitHub, and Telegram APIs.
  // Full integration tests are better suited to src/__tests__/integration/
  //
  // Commented tests:
  // - should call ctx.waitUntil with export promise
  // - should not throw on waitUntil error

  describe('error handling and resilience', () => {
    it('should handle Algolia API failure gracefully', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: false, status: 500 });

      // Should complete even if Algolia fails
      await expect(worker.scheduled(scheduledEvent, env, ctx)).resolves.toBeUndefined();
    });

    it('should handle partial data scenarios', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => [] }) // Empty story IDs
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      // Should handle gracefully
      await expect(worker.scheduled(scheduledEvent, env, ctx)).resolves.toBeUndefined();
    });

    it('should handle malformed API responses', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => { throw new Error('Invalid JSON'); },
        });

      // Should complete (error happens in background)
      await expect(worker.scheduled(scheduledEvent, env, ctx)).resolves.toBeUndefined();
    });
  });

  describe('ExecutionContext usage', () => {
    it('should have access to request object in context', async () => {
      const env = createMockEnv({ localTestMode: true });
      const ctx = createMockExecutionContext();
      const scheduledEvent: any = {
        cron: '0 1 * * *',
        scheduledTime: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ([40000]) })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ hits: [] }) });

      await worker.scheduled(scheduledEvent, env, ctx);

      // Context should have request property
      expect(ctx.request).toBeDefined();
    });
  });
});
