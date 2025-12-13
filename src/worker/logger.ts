/**
 * Structured logging utility for Cloudflare Workers
 * Logs are output as JSON for easy parsing in Cloudflare dashboard
 */

import type { LogContext, ExportMetrics } from '../types/logger';

// Re-export types for backward compatibility
export type { LogContext, ExportMetrics } from '../types/logger';

/**
 * Safely format an error for logging
 * Handles Error objects, plain objects, and primitives
 */
export function formatError(error: unknown): { name?: string; message: string; stack?: string; raw?: unknown } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  if (error && typeof error === 'object') {
    // Try to extract message from object
    const obj = error as Record<string, unknown>;
    const message = obj.message || obj.error || obj.msg;
    
    if (typeof message === 'string') {
      return { message };
    }
    
    // Fallback to JSON serialization
    try {
      return { message: JSON.stringify(error), raw: error };
    } catch {
      return { message: '[Unserializable object]', raw: error };
    }
  }
  
  return { message: String(error) };
}

/**
 * Get error message string from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const message = obj.message || obj.error || obj.msg;
    
    if (typeof message === 'string') {
      return message;
    }
    
    try {
      return JSON.stringify(error);
    } catch {
      return '[Unserializable object]';
    }
  }
  
  return String(error);
}

export function logInfo(message: string, context?: LogContext): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...context,
  }));
}

export function logWarn(message: string, context?: LogContext): void {
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    ...context,
  }));
}

export function logError(message: string, error: Error | unknown, context?: LogContext): void {
  const errorInfo = formatError(error);

  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    error: errorInfo,
    ...context,
  }));
}

export function logMetrics(metrics: ExportMetrics): void {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'metrics',
    ...metrics,
  }));
}
