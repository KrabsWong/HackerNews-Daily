/**
 * Utility type definitions
 * 
 * Types for utility functions (fetch, date, etc.)
 */

/**
 * Options for fetch requests
 */
export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  retries?: number; // Number of retry attempts for transient errors (default: 0)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
}

/**
 * Date boundaries for a day in UTC
 */
export interface DayBoundaries {
  /** Start of day timestamp in Unix seconds */
  start: number;
  /** End of day timestamp in Unix seconds */
  end: number;
  /** Date object for the day (in UTC) */
  date: Date;
}
