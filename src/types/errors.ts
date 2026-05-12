/**
 * Error Type Hierarchy
 * 
 * Provides a standardized error classification system for the application.
 * Only includes error types that are actually used in production code.
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
 * Errors related to external API calls (HackerNews, Algolia, LLM APIs, etc.)
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

  isRetryable(): boolean {
    return this.statusCode === 429 || this.statusCode >= 500;
  }

  getRetryDelay(): number {
    if (this.statusCode === 429) return 2000;
    if (this.statusCode >= 500) return 1000;
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

// =============================================================================
// Type Guards
// =============================================================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isRetryableError(error: unknown): boolean {
  if (isAPIError(error)) {
    return error.isRetryable();
  }
  if (isNetworkError(error)) {
    return true;
  }
  return false;
}

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

  return new AppError(String(error), 'UNKNOWN_ERROR', { originalValue: error });
}
