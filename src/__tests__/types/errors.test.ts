import { describe, it, expect } from 'vitest';
import {
  AppError,
  APIError,
  ServiceError,
  ValidationError,
  DatabaseError,
  LLMError,
  ContentError,
  PublisherError,
  NetworkError,
  isAppError,
  isAPIError,
  isServiceError,
  isNetworkError,
  isRetryableError,
  toAppError,
} from '../../types/errors';
import { PublisherType } from '../../types/publisher';

describe('Error Types', () => {
  describe('AppError', () => {
    it('should create error with message, code, and context', () => {
      const error = new AppError('Test error', 'TEST_ERROR', { key: 'value' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.context).toEqual({ key: 'value' });
      expect(error.timestamp).toBeTypeOf('number');
      expect(error.name).toBe('AppError');
    });

    it('should serialize to JSON', () => {
      const error = new AppError('Test error', 'TEST_ERROR', { key: 'value' });
      const json = error.toJSON();

      expect(json).toHaveProperty('name', 'AppError');
      expect(json).toHaveProperty('message', 'Test error');
      expect(json).toHaveProperty('code', 'TEST_ERROR');
      expect(json).toHaveProperty('context');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('stack');
    });
  });

  describe('APIError', () => {
    it('should create API error with status code and provider', () => {
      const error = new APIError('API failed', 500, 'HackerNews');

      expect(error.message).toBe('API failed');
      expect(error.statusCode).toBe(500);
      expect(error.provider).toBe('HackerNews');
      expect(error.code).toBe('API_ERROR_500');
    });

    it('should include request ID if provided', () => {
      const error = new APIError(
        'API failed',
        429,
        'OpenAI',
        {},
        'req_123'
      );

      expect(error.requestId).toBe('req_123');
    });

    it('should identify retryable errors (5xx)', () => {
      const error500 = new APIError('Server error', 500, 'Test');
      const error503 = new APIError('Service unavailable', 503, 'Test');

      expect(error500.isRetryable()).toBe(true);
      expect(error503.isRetryable()).toBe(true);
    });

    it('should identify retryable errors (429)', () => {
      const error = new APIError('Rate limited', 429, 'Test');

      expect(error.isRetryable()).toBe(true);
    });

    it('should identify non-retryable errors (4xx)', () => {
      const error400 = new APIError('Bad request', 400, 'Test');
      const error404 = new APIError('Not found', 404, 'Test');

      expect(error400.isRetryable()).toBe(false);
      expect(error404.isRetryable()).toBe(false);
    });

    it('should provide retry delay for rate limiting', () => {
      const error429 = new APIError('Rate limited', 429, 'Test');

      expect(error429.getRetryDelay()).toBe(2000);
    });

    it('should provide retry delay for server errors', () => {
      const error500 = new APIError('Server error', 500, 'Test');

      expect(error500.getRetryDelay()).toBe(1000);
    });

    it('should provide no retry delay for non-retryable errors', () => {
      const error400 = new APIError('Bad request', 400, 'Test');

      expect(error400.getRetryDelay()).toBe(0);
    });
  });

  describe('ServiceError', () => {
    it('should create service error with service and operation', () => {
      const error = new ServiceError(
        'Service failed',
        'llm',
        'chatCompletion'
      );

      expect(error.message).toBe('Service failed');
      expect(error.service).toBe('llm');
      expect(error.operation).toBe('chatCompletion');
      expect(error.code).toBe('SERVICE_ERROR_LLM');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with field and value', () => {
      const error = new ValidationError(
        'Invalid value',
        'email',
        'not-an-email'
      );

      expect(error.message).toBe('Invalid value');
      expect(error.field).toBe('email');
      expect(error.value).toBe('not-an-email');
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should work without field and value', () => {
      const error = new ValidationError('Invalid config');

      expect(error.field).toBeUndefined();
      expect(error.value).toBeUndefined();
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with operation and query', () => {
      const error = new DatabaseError(
        'Query failed',
        'select',
        'SELECT * FROM tasks'
      );

      expect(error.message).toBe('Query failed');
      expect(error.operation).toBe('select');
      expect(error.query).toBe('SELECT * FROM tasks');
      expect(error.code).toBe('DATABASE_ERROR_SELECT');
    });
  });

  describe('LLMError', () => {
    it('should create LLM error with provider and model', () => {
      const error = new LLMError(
        'LLM failed',
        'chatCompletion',
        'openai',
        'gpt-4'
      );

      expect(error.message).toBe('LLM failed');
      expect(error.operation).toBe('chatCompletion');
      expect(error.provider).toBe('openai');
      expect(error.model).toBe('gpt-4');
      expect(error.service).toBe('llm');
    });
  });

  describe('ContentError', () => {
    it('should create content error with URL and content type', () => {
      const error = new ContentError(
        'Failed to fetch',
        'fetch',
        'https://example.com',
        'text/html'
      );

      expect(error.message).toBe('Failed to fetch');
      expect(error.operation).toBe('fetch');
      expect(error.url).toBe('https://example.com');
      expect(error.contentType).toBe('text/html');
      expect(error.service).toBe('content');
    });
  });

  describe('PublisherError', () => {
    it('should create publisher error with recoverable flag', () => {
      const error = new PublisherError(
        'Publish failed',
        PublisherType.GITHUB,
        'publish',
        true
      );

      expect(error.message).toBe('Publish failed');
      expect(error.publisher).toBe(PublisherType.GITHUB);
      expect(error.operation).toBe('publish');
      expect(error.recoverable).toBe(true);
      expect(error.service).toBe('publisher');
    });

    it('should default to recoverable=true', () => {
      const error = new PublisherError(
        'Publish failed',
        PublisherType.TELEGRAM,
        'sendMessage'
      );

      expect(error.recoverable).toBe(true);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with URL and timeout', () => {
      const error = new NetworkError(
        'Request timeout',
        'https://example.com',
        5000
      );

      expect(error.message).toBe('Request timeout');
      expect(error.url).toBe('https://example.com');
      expect(error.timeout).toBe(5000);
      expect(error.code).toBe('NETWORK_ERROR');
    });

    it('should identify timeout errors', () => {
      const timeoutError = new NetworkError(
        'Timeout',
        'https://example.com',
        5000
      );
      const connectionError = new NetworkError('Connection failed');

      expect(timeoutError.isTimeout()).toBe(true);
      expect(connectionError.isTimeout()).toBe(false);
    });
  });

  describe('Type guards', () => {
    it('isAppError should identify AppError instances', () => {
      const appError = new AppError('Test', 'TEST');
      const serviceError = new ServiceError('Test', 'service', 'op');
      const stdError = new Error('Test');

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(serviceError)).toBe(true); // ServiceError extends AppError
      expect(isAppError(stdError)).toBe(false);
      expect(isAppError('string')).toBe(false);
    });

    it('isAPIError should identify APIError instances', () => {
      const apiError = new APIError('Test', 500, 'Provider');
      const appError = new AppError('Test', 'TEST');

      expect(isAPIError(apiError)).toBe(true);
      expect(isAPIError(appError)).toBe(false);
    });

    it('isServiceError should identify ServiceError instances', () => {
      const serviceError = new ServiceError('Test', 'service', 'op');
      const llmError = new LLMError('Test', 'op', 'provider');
      const appError = new AppError('Test', 'TEST');

      expect(isServiceError(serviceError)).toBe(true);
      expect(isServiceError(llmError)).toBe(true); // LLMError extends ServiceError
      expect(isServiceError(appError)).toBe(false);
    });

    it('isNetworkError should identify NetworkError instances', () => {
      const networkError = new NetworkError('Test');
      const appError = new AppError('Test', 'TEST');

      expect(isNetworkError(networkError)).toBe(true);
      expect(isNetworkError(appError)).toBe(false);
    });

    it('isRetryableError should identify retryable errors', () => {
      const apiError429 = new APIError('Rate limit', 429, 'Test');
      const apiError500 = new APIError('Server error', 500, 'Test');
      const apiError400 = new APIError('Bad request', 400, 'Test');
      const networkError = new NetworkError('Timeout');
      const serviceError = new ServiceError('Test', 'service', 'op');

      expect(isRetryableError(apiError429)).toBe(true);
      expect(isRetryableError(apiError500)).toBe(true);
      expect(isRetryableError(apiError400)).toBe(false);
      expect(isRetryableError(networkError)).toBe(true);
      expect(isRetryableError(serviceError)).toBe(false);
    });
  });

  describe('toAppError', () => {
    it('should return AppError as-is', () => {
      const error = new AppError('Test', 'TEST');
      const result = toAppError(error);

      expect(result).toBe(error);
    });

    it('should convert standard Error to AppError', () => {
      const error = new Error('Standard error');
      const result = toAppError(error);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Standard error');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.context).toHaveProperty('originalError', 'Error');
    });

    it('should convert string to AppError', () => {
      const result = toAppError('String error');

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('String error');
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should convert other values to AppError', () => {
      const result = toAppError(42);

      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('42');
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.context).toHaveProperty('originalValue', 42);
    });
  });
});
