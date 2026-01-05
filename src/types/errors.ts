/**
 * Error Type Hierarchy
 * 
 * Provides a standardized error classification system for the application.
 * All custom errors should extend from these base classes.
 */

/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Errors related to external API calls (HackerNews, Algolia, etc.)
 */
export class APIError extends AppError {
  public readonly statusCode: number;
  public readonly provider: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    provider: string,
    context?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message, `API_ERROR_${statusCode}`, {
      ...context,
      provider,
      statusCode,
      requestId,
    });
    this.statusCode = statusCode;
    this.provider = provider;
    this.requestId = requestId;
  }

  /**
   * Determines if the error is retryable based on status code
   */
  isRetryable(): boolean {
    // Retry on server errors (5xx) and rate limiting (429)
    return this.statusCode === 429 || this.statusCode >= 500;
  }

  /**
   * Gets recommended retry delay in milliseconds
   */
  getRetryDelay(): number {
    if (this.statusCode === 429) {
      // Rate limiting - use exponential backoff
      return 2000;
    }
    if (this.statusCode >= 500) {
      // Server errors - shorter delay
      return 1000;
    }
    return 0;
  }
}

/**
 * Errors related to internal services (LLM, ArticleFetcher, TaskExecutor, etc.)
 */
export class ServiceError extends AppError {
  public readonly service: string;
  public readonly operation: string;

  constructor(
    message: string,
    service: string,
    operation: string,
    context?: Record<string, unknown>
  ) {
    super(message, `SERVICE_ERROR_${service.toUpperCase()}`, {
      ...context,
      service,
      operation,
    });
    this.service = service;
    this.operation = operation;
  }
}

/**
 * Errors related to configuration validation
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', {
      ...context,
      field,
      value,
    });
    this.field = field;
    this.value = value;
  }
}

/**
 * Errors related to database operations
 */
export class DatabaseError extends AppError {
  public readonly operation: string;
  public readonly query?: string;

  constructor(
    message: string,
    operation: string,
    query?: string,
    context?: Record<string, unknown>
  ) {
    super(message, `DATABASE_ERROR_${operation.toUpperCase()}`, {
      ...context,
      operation,
      query,
    });
    this.operation = operation;
    this.query = query;
  }
}

/**
 * Errors related to LLM operations (parsing, API calls, etc.)
 */
export class LLMError extends ServiceError {
  public readonly provider: string;
  public readonly model?: string;

  constructor(
    message: string,
    operation: string,
    provider: string,
    model?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'llm', operation, {
      ...context,
      provider,
      model,
    });
    this.provider = provider;
    this.model = model;
  }
}

/**
 * Errors related to content fetching and processing
 */
export class ContentError extends ServiceError {
  public readonly url?: string;
  public readonly contentType?: string;

  constructor(
    message: string,
    operation: string,
    url?: string,
    contentType?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'content', operation, {
      ...context,
      url,
      contentType,
    });
    this.url = url;
    this.contentType = contentType;
  }
}

/**
 * Errors related to publishing operations
 */
export class PublisherError extends ServiceError {
  public readonly publisher: string;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    publisher: string,
    operation: string,
    recoverable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message, 'publisher', operation, {
      ...context,
      publisher,
      recoverable,
    });
    this.publisher = publisher;
    this.recoverable = recoverable;
  }
}

/**
 * Errors related to network operations (timeouts, connection failures, etc.)
 */
export class NetworkError extends AppError {
  public readonly url?: string;
  public readonly timeout?: number;

  constructor(
    message: string,
    url?: string,
    timeout?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'NETWORK_ERROR', {
      ...context,
      url,
      timeout,
    });
    this.url = url;
    this.timeout = timeout;
  }

  isTimeout(): boolean {
    return this.timeout !== undefined;
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is an APIError
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

/**
 * Type guard to check if error is a ServiceError
 */
export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

/**
 * Type guard to check if error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isAPIError(error)) {
    return error.isRetryable();
  }
  if (isNetworkError(error)) {
    return true; // Network errors are generally retryable
  }
  return false;
}

/**
 * Convert unknown error to AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new AppError(
    String(error),
    'UNKNOWN_ERROR',
    { originalValue: error }
  );
}
