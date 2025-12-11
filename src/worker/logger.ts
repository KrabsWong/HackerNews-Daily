/**
 * Structured logging utility for Cloudflare Workers
 * Logs are output as JSON for easy parsing in Cloudflare dashboard
 */

export interface LogContext {
  [key: string]: any;
}

export interface ExportMetrics {
  storiesFetched: number;
  storiesProcessed: number;
  storiesFailed: number;
  duration: number;
  apiCalls: Record<string, number>;
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
  const errorInfo = error instanceof Error
    ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    : { error: String(error) };

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
