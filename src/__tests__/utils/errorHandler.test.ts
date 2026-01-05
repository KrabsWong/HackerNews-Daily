import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorHandler,
  RetryConfig,
  createAPIRetryConfig,
  createLLMRetryConfig,
  safeExecute,
  DEFAULT_RETRY_CONFIG,
} from '../../utils/errorHandler';
import {
  AppError,
  APIError,
  NetworkError,
  ValidationError,
  ContentError,
  LLMError,
} from '../../types/errors';

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handle', () => {
    it('should convert error to standardized response', () => {
      const error = new AppError('Test error', 'TEST_ERROR', { key: 'value' });
      const result = ErrorHandler.handle(error, {
        operation: 'test',
        service: 'test-service',
      });

      expect(result).toEqual({
        success: false,
        error: {
          message: 'Test error',
          code: 'TEST_ERROR',
          context: {
            key: 'value',
            operation: 'test',
            service: 'test-service',
          },
        },
      });
    });

    it('should handle standard Error objects', () => {
      const error = new Error('Standard error');
      const result = ErrorHandler.handle(error, { operation: 'test' });

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Standard error');
      expect(result.error.code).toBe('UNKNOWN_ERROR');
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await ErrorHandler.retry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new APIError('Error', 500, 'Test'))
        .mockResolvedValue('success');

      const result = await ErrorHandler.retry(fn, { maxRetries: 1, initialDelay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      const fn = vi.fn().mockRejectedValue(new APIError('Error', 400, 'Test'));

      await expect(
        ErrorHandler.retry(fn, { maxRetries: 3, initialDelay: 10 })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries', async () => {
      const fn = vi.fn().mockRejectedValue(new APIError('Error', 500, 'Test'));

      await expect(
        ErrorHandler.retry(fn, { maxRetries: 2, initialDelay: 10 })
      ).rejects.toThrow();

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      const fn = vi.fn().mockRejectedValue(new APIError('Error', 500, 'Test'));
      const delays: number[] = [];
      const onRetry = vi.fn((_, __, delay) => delays.push(delay));

      await expect(
        ErrorHandler.retry(fn, {
          maxRetries: 3,
          initialDelay: 100,
          backoffFactor: 2,
          onRetry,
        })
      ).rejects.toThrow();

      expect(delays).toHaveLength(3);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);
    });

    it('should respect maxDelay', async () => {
      const fn = vi.fn().mockRejectedValue(new APIError('Error', 500, 'Test'));
      const delays: number[] = [];
      const onRetry = vi.fn((_, __, delay) => delays.push(delay));

      await expect(
        ErrorHandler.retry(fn, {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 150,
          backoffFactor: 2,
          onRetry,
        })
      ).rejects.toThrow();

      expect(delays).toHaveLength(3);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(150); // capped at maxDelay
      expect(delays[2]).toBe(150); // capped at maxDelay
    });

    it('should use custom retryableCheck', async () => {
      const fn = vi.fn().mockRejectedValue(new ValidationError('Invalid'));
      const retryableCheck = vi.fn().mockReturnValue(true);

      await expect(
        ErrorHandler.retry(fn, {
          maxRetries: 1,
          initialDelay: 10,
          retryableCheck,
        })
      ).rejects.toThrow();

      expect(retryableCheck).toHaveBeenCalled();
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new APIError('Error', 500, 'Test'))
        .mockResolvedValue('success');
      const onRetry = vi.fn();

      await ErrorHandler.retry(fn, {
        maxRetries: 1,
        initialDelay: 10,
        onRetry,
      });

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.any(APIError),
        1,
        expect.any(Number)
      );
    });
  });

  describe('logError', () => {
    it('should log error with structured context', () => {
      const error = new AppError('Test error', 'TEST', { key: 'value' });
      const context = {
        operation: 'test-operation',
        service: 'test-service',
        metadata: { meta: 'data' },
      };

      // Should not throw
      expect(() => ErrorHandler.logError(error, context)).not.toThrow();
    });
  });

  describe('wrap', () => {
    it('should wrap function and handle success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const wrapped = ErrorHandler.wrap(fn, { operation: 'test' });

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should wrap function and handle errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      const wrapped = ErrorHandler.wrap(fn, { operation: 'test' });

      await expect(wrapped()).rejects.toThrow(AppError);
    });

    it('should preserve AppError', async () => {
      const originalError = new APIError('API failed', 500, 'Test');
      const fn = vi.fn().mockRejectedValue(originalError);
      const wrapped = ErrorHandler.wrap(fn, { operation: 'test' });

      await expect(wrapped()).rejects.toThrow(originalError);
    });
  });

  describe('wrapWithRetry', () => {
    it('should wrap function with retry logic', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new APIError('Error', 500, 'Test'))
        .mockResolvedValue('success');

      const wrapped = ErrorHandler.wrapWithRetry(
        fn,
        { operation: 'test' },
        { maxRetries: 1, initialDelay: 10 }
      );

      const result = await wrapped();

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('shouldFallback', () => {
    it('should suggest fallback for content errors', () => {
      const error = new ContentError('Fetch failed', 'fetch', 'https://example.com');

      expect(ErrorHandler.shouldFallback(error)).toBe(true);
    });

    it('should suggest fallback for LLM errors', () => {
      const error = new LLMError('Parse failed', 'parse', 'openai');

      expect(ErrorHandler.shouldFallback(error)).toBe(true);
    });

    it('should suggest fallback for API 4xx errors (except 429)', () => {
      const error400 = new APIError('Bad request', 400, 'Test');
      const error404 = new APIError('Not found', 404, 'Test');
      const error429 = new APIError('Rate limit', 429, 'Test');

      expect(ErrorHandler.shouldFallback(error400)).toBe(true);
      expect(ErrorHandler.shouldFallback(error404)).toBe(true);
      expect(ErrorHandler.shouldFallback(error429)).toBe(false);
    });

    it('should not suggest fallback for other errors', () => {
      const error = new ValidationError('Invalid');

      expect(ErrorHandler.shouldFallback(error)).toBe(false);
    });
  });
});

describe('createAPIRetryConfig', () => {
  it('should create config with default maxRetries', () => {
    const config = createAPIRetryConfig('test-provider');

    expect(config.maxRetries).toBe(3);
    expect(config.initialDelay).toBe(1000);
    expect(config.maxDelay).toBe(10000);
    expect(config.backoffFactor).toBe(2);
  });

  it('should create config with custom maxRetries', () => {
    const config = createAPIRetryConfig('test-provider', 5);

    expect(config.maxRetries).toBe(5);
  });

  it('should retry on APIError with retryable status', () => {
    const config = createAPIRetryConfig('test');
    const error500 = new APIError('Server error', 500, 'Test');
    const error429 = new APIError('Rate limit', 429, 'Test');
    const error400 = new APIError('Bad request', 400, 'Test');

    expect(config.retryableCheck!(error500)).toBe(true);
    expect(config.retryableCheck!(error429)).toBe(true);
    expect(config.retryableCheck!(error400)).toBe(false);
  });

  it('should retry on NetworkError', () => {
    const config = createAPIRetryConfig('test');
    const error = new NetworkError('Timeout');

    expect(config.retryableCheck!(error)).toBe(true);
  });
});

describe('createLLMRetryConfig', () => {
  it('should create config with default maxRetries', () => {
    const config = createLLMRetryConfig('test-provider');

    expect(config.maxRetries).toBe(2);
    expect(config.initialDelay).toBe(2000);
  });

  it('should not retry on parse errors', () => {
    const config = createLLMRetryConfig('test');
    const parseError = new LLMError('Parse failed', 'parse', 'test');

    expect(config.retryableCheck!(parseError)).toBe(false);
  });

  it('should retry on API errors', () => {
    const config = createLLMRetryConfig('test');
    const apiError = new APIError('Server error', 500, 'LLM');

    expect(config.retryableCheck!(apiError)).toBe(true);
  });
});

describe('safeExecute', () => {
  it('should return success result', async () => {
    const fn = vi.fn().mockResolvedValue('data');
    const result = await safeExecute(fn, { operation: 'test' });

    expect(result).toEqual({
      success: true,
      data: 'data',
    });
  });

  it('should return error response on failure', async () => {
    const fn = vi.fn().mockRejectedValue(new AppError('Failed', 'TEST_ERROR'));
    const result = await safeExecute(fn, { operation: 'test' });

    expect(result).toMatchObject({
      success: false,
      error: {
        message: 'Failed',
        code: 'TEST_ERROR',
      },
    });
  });
});

describe('DEFAULT_RETRY_CONFIG', () => {
  it('should have expected defaults', () => {
    expect(DEFAULT_RETRY_CONFIG).toEqual({
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
    });
  });
});
