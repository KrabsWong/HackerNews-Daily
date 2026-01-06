/**
 * State Machine Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { executeStateMachine } from '../../../worker/statemachine/index';
import { DailyTaskStatus } from '../../../types/database';
import type { Env } from '../../../types/worker';
import * as taskModule from '../../../services/task';

describe('State Machine', () => {
  let mockEnv: Env;
  let mockTaskExecutor: any;

  beforeEach(() => {
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
      TASK_BATCH_SIZE: '6',
    } as unknown as Env;

    // Mock task executor
    mockTaskExecutor = {
      initializeTask: vi.fn().mockResolvedValue({ success: true }),
      processNextBatch: vi.fn().mockResolvedValue({
        processed: 6,
        pending: 0,
        processing: 0,
        failed: 0,
      }),
      aggregateResults: vi.fn().mockResolvedValue({
        stories: [],
        markdown: '# Test',
      }),
      publishResults: vi.fn().mockResolvedValue({ success: true }),
      storage: {
        getOrCreateTask: vi.fn(),
        updateTaskStatus: vi.fn(),
      },
    };

    vi.spyOn(taskModule, 'createTaskExecutor').mockReturnValue(mockTaskExecutor);
  });

  describe('executeStateMachine', () => {
    it('should handle INIT state', async () => {
      mockTaskExecutor.storage.getOrCreateTask.mockResolvedValue({
        task_date: '2026-01-06',
        status: DailyTaskStatus.INIT,
        total_articles: 0,
        completed_articles: 0,
        failed_articles: 0,
      });

      await expect(executeStateMachine(mockEnv)).resolves.not.toThrow();
      expect(mockTaskExecutor.initializeTask).toHaveBeenCalled();
    });

    it('should handle LIST_FETCHED state', async () => {
      mockTaskExecutor.storage.getOrCreateTask.mockResolvedValue({
        task_date: '2026-01-06',
        status: DailyTaskStatus.LIST_FETCHED,
        total_articles: 30,
        completed_articles: 0,
        failed_articles: 0,
      });

      await expect(executeStateMachine(mockEnv)).resolves.not.toThrow();
      expect(mockTaskExecutor.processNextBatch).toHaveBeenCalledWith('2026-01-06', 6);
    });

    it('should handle PROCESSING state', async () => {
      mockTaskExecutor.storage.getOrCreateTask.mockResolvedValue({
        task_date: '2026-01-06',
        status: DailyTaskStatus.PROCESSING,
        total_articles: 30,
        completed_articles: 10,
        failed_articles: 0,
      });

      await expect(executeStateMachine(mockEnv)).resolves.not.toThrow();
      expect(mockTaskExecutor.processNextBatch).toHaveBeenCalled();
    });

    it('should handle AGGREGATING state', async () => {
      mockTaskExecutor.storage.getOrCreateTask.mockResolvedValue({
        task_date: '2026-01-06',
        status: DailyTaskStatus.AGGREGATING,
        total_articles: 30,
        completed_articles: 30,
        failed_articles: 0,
      });

      await expect(executeStateMachine(mockEnv)).resolves.not.toThrow();
      expect(mockTaskExecutor.aggregateResults).toHaveBeenCalled();
      expect(mockTaskExecutor.publishResults).toHaveBeenCalled();
    });

    it('should handle PUBLISHED state', async () => {
      mockTaskExecutor.storage.getOrCreateTask.mockResolvedValue({
        task_date: '2026-01-06',
        status: DailyTaskStatus.PUBLISHED,
        total_articles: 30,
        completed_articles: 30,
        failed_articles: 0,
      });

      await expect(executeStateMachine(mockEnv)).resolves.not.toThrow();
      expect(mockTaskExecutor.initializeTask).not.toHaveBeenCalled();
    });

    it('should handle ARCHIVED state', async () => {
      mockTaskExecutor.storage.getOrCreateTask.mockResolvedValue({
        task_date: '2026-01-06',
        status: DailyTaskStatus.ARCHIVED,
        total_articles: 30,
        completed_articles: 30,
        failed_articles: 0,
      });

      await expect(executeStateMachine(mockEnv)).resolves.not.toThrow();
    });

    it('should transition to AGGREGATING when all articles processed', async () => {
      mockTaskExecutor.storage.getOrCreateTask.mockResolvedValue({
        task_date: '2026-01-06',
        status: DailyTaskStatus.PROCESSING,
        total_articles: 30,
        completed_articles: 0,
        failed_articles: 0,
      });

      mockTaskExecutor.processNextBatch.mockResolvedValue({
        processed: 6,
        pending: 0,
        processing: 0,
        failed: 0,
      });

      await expect(executeStateMachine(mockEnv)).resolves.not.toThrow();
      expect(mockTaskExecutor.storage.updateTaskStatus).toHaveBeenCalledWith(
        '2026-01-06',
        DailyTaskStatus.AGGREGATING
      );
    });

    it('should throw error on unknown status', async () => {
      mockTaskExecutor.storage.getOrCreateTask.mockResolvedValue({
        task_date: '2026-01-06',
        status: 'unknown' as any,
        total_articles: 30,
        completed_articles: 0,
        failed_articles: 0,
      });

      await expect(executeStateMachine(mockEnv)).rejects.toThrow('Unknown task status');
    });
  });

  describe('Error Handling', () => {
    it('should log and rethrow errors', async () => {
      const error = new Error('Test error');
      mockTaskExecutor.storage.getOrCreateTask.mockRejectedValue(error);

      await expect(executeStateMachine(mockEnv)).rejects.toThrow('Test error');
    });
  });
});
