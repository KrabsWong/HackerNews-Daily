/**
 * Unified Error Handling Utilities
 * 
 * Provides standardized error handling, retry logic, and error logging
 * across the application.
 */

import {
  AppError,
  APIError,
  NetworkError,
  isRetryableError,
  toAppError,
} from '../types/errors';

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableCheck?: (error: unknown) => boolean;
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

/**
 * Context for error handling
 */
export interface ErrorContext {
  operation: string;
  service?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Unified error handler class
 */
export class ErrorHandler {
  /**
   * Handle an error and convert it to a standardized response
   */
  static handle(error: unknown, context: ErrorContext): ErrorResponse {
    const appError = toAppError(error);

    // Log the error with context
    this.logError(appError, context);

    return {
      success: false,
      error: {
        message: appError.message,
        code: appError.code,
        context: {
          ...appError.context,
          ...context.metadata,
          operation: context.operation,
          service: context.service,
        },
      },
    };
  }

  /**
   * Retry a function with exponential backoff
   * 
   * @param fn - The function to retry
   * @param config - Retry configuration
   * @returns The result of the function
   * @throws The last error if all retries fail
   */
  static async retry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const fullConfig: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    };

    let lastError: unknown;
    let attempt = 0;

    while (attempt <= fullConfig.maxRetries) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempt++;

        // Check if we should retry
        const shouldRetry =
          attempt <= fullConfig.maxRetries &&
          (fullConfig.retryableCheck
            ? fullConfig.retryableCheck(error)
            : isRetryableError(error));

        if (!shouldRetry) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          fullConfig.initialDelay * Math.pow(fullConfig.backoffFactor, attempt - 1),
          fullConfig.maxDelay
        );

        // Call onRetry callback if provided
        if (fullConfig.onRetry) {
          fullConfig.onRetry(error, attempt, delay);
        }

        // Wait before retrying
        await this.sleep(delay);
      }
    }

    // All retries failed
    throw lastError;
  }

  /**
   * Log an error with context information
   * 
   * This method should be integrated with the application's logging system.
   * Currently logs to console, but should be enhanced to use structured logging.
   */
  static logError(error: AppError, context: ErrorContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      error: {
        name: error.name,
        code: error.code,
        context: error.context,
        stack: error.stack,
      },
      operation: context.operation,
      service: context.service,
      metadata: context.metadata,
    };

    // In production, this should use a proper logging service
    console.error('[ErrorHandler]', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Wrap a function with error handling
   * 
   * @param fn - The function to wrap
   * @param context - Error context
   * @returns A wrapped function that handles errors
   */
  static wrap<T extends (...args: any[]) => any>(
    fn: T,
    context: ErrorContext
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      try {
        return await fn(...args) as Awaited<ReturnType<T>>;
      } catch (error) {
        const appError = toAppError(error);
        this.logError(appError, context);
        throw appError;
      }
    };
  }

  /**
   * Wrap a function with error handling and retry logic
   * 
   * @param fn - The function to wrap
   * @param context - Error context
   * @param retryConfig - Retry configuration
   * @returns A wrapped function with retry logic
   */
  static wrapWithRetry<T extends (...args: any[]) => any>(
    fn: T,
    context: ErrorContext,
    retryConfig: Partial<RetryConfig> = {}
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      return this.retry(
        async (): Promise<Awaited<ReturnType<T>>> => {
          try {
            return await fn(...args) as Awaited<ReturnType<T>>;
          } catch (error) {
            const appError = toAppError(error);
            this.logError(appError, context);
            throw appError;
          }
        },
        {
          ...retryConfig,
          onRetry: (error, attempt, delay) => {
            console.log(
              `[ErrorHandler] Retrying ${context.operation} (attempt ${attempt}/${retryConfig.maxRetries || DEFAULT_RETRY_CONFIG.maxRetries}) after ${delay}ms`
            );
            if (retryConfig.onRetry) {
              retryConfig.onRetry(error, attempt, delay);
            }
          },
        }
      );
    };
  }

  /**
   * Check if an error should trigger a fallback/degraded mode
   * 
   * @param error - The error to check
   * @returns True if fallback should be used
   */
  static shouldFallback(error: unknown): boolean {
    // Content fetch errors should use metadata fallback
    if (error instanceof AppError && error.code.startsWith('SERVICE_ERROR_CONTENT')) {
      return true;
    }

    // LLM parse errors should use original content
    if (error instanceof AppError && error.code.startsWith('SERVICE_ERROR_LLM')) {
      return true;
    }

    // API errors with 4xx (except 429) should not retry but may need fallback
    if (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for a given number of milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a retry configuration for API calls
 */
export function createAPIRetryConfig(
  provider: string,
  maxRetries: number = 3
): RetryConfig {
  return {
    maxRetries,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryableCheck: (error: unknown) => {
      if (error instanceof APIError) {
        return error.isRetryable();
      }
      if (error instanceof NetworkError) {
        return true;
      }
      return false;
    },
    onRetry: (error, attempt, delay) => {
      const appError = toAppError(error);
      console.log(
        `[${provider}] API call failed (attempt ${attempt}), retrying in ${delay}ms:`,
        appError.message
      );
    },
  };
}

/**
 * Create a retry configuration for LLM operations
 */
export function createLLMRetryConfig(
  provider: string,
  maxRetries: number = 2
): RetryConfig {
  return {
    maxRetries,
    initialDelay: 2000,
    maxDelay: 8000,
    backoffFactor: 2,
    retryableCheck: (error: unknown) => {
      // Retry on API errors and network errors
      if (error instanceof APIError) {
        return error.isRetryable();
      }
      if (error instanceof NetworkError) {
        return true;
      }
      // Don't retry on parse errors or validation errors
      return false;
    },
    onRetry: (error, attempt, delay) => {
      const appError = toAppError(error);
      console.log(
        `[${provider}] LLM operation failed (attempt ${attempt}), retrying in ${delay}ms:`,
        appError.message
      );
    },
  };
}

/**
 * Safely execute a function and return a Result type
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context: ErrorContext
): Promise<{ success: true; data: T } | ErrorResponse> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return ErrorHandler.handle(error, context);
  }
}
