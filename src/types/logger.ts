/**
 * Logger-related type definitions
 * 
 * Types for structured logging in Cloudflare Workers
 */

/**
 * Context object for structured logging
 * Allows arbitrary key-value pairs for log metadata
 */
export interface LogContext {
  [key: string]: any;
}

/**
 * Metrics collected during export operation
 */
export interface ExportMetrics {
  storiesFetched: number;
  storiesProcessed: number;
  storiesFailed: number;
  duration: number;
  apiCalls: Record<string, number>;
}
