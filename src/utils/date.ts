/**
 * Shared date utility functions for CLI and Worker
 * Provides consistent date handling across all execution environments
 */

import type { DayBoundaries } from '../types/utils';

// Re-export type for backward compatibility
export type { DayBoundaries } from '../types/utils';

/**
 * Get the date boundaries for the previous calendar day (yesterday) in UTC
 * Returns start (00:00:00) and end (23:59:59) timestamps in Unix seconds
 * All calculations are done in UTC
 */
export function getPreviousDayBoundaries(): DayBoundaries {
  const now = new Date();
  
  // Create date for yesterday in UTC
  const yesterday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 1
  ));
  
  // Set to start of day (00:00:00) in UTC
  const startOfDay = new Date(Date.UTC(
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
    0, 0, 0, 0
  ));
  
  // Set to end of day (23:59:59.999) in UTC
  const endOfDay = new Date(Date.UTC(
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
    23, 59, 59, 999
  ));
  
  return {
    start: Math.floor(startOfDay.getTime() / 1000), // Unix timestamp in seconds
    end: Math.floor(endOfDay.getTime() / 1000),     // Unix timestamp in seconds
    date: yesterday // UTC date for display
  };
}

/**
 * Format Unix timestamp to UTC datetime string
 * @param unixTime - Unix timestamp in seconds (<10000000000) or milliseconds (>=10000000000)
 * @param includeSeconds - Whether to include seconds (default: false for backward compatibility)
 * @returns Formatted string like "2024-12-11 14:30" or "2024-12-11 14:30:00 UTC"
 */
export function formatTimestamp(unixTime: number, includeSeconds: boolean = false): string {
  // Auto-detect: if < 10000000000, treat as seconds (HackerNews API format)
  // Otherwise, treat as milliseconds (database storage format)
  const isSeconds = unixTime < 10000000000;
  const timeInMs = isSeconds ? unixTime * 1000 : unixTime;
  
  const date = new Date(timeInMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');

  if (includeSeconds) {
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
  }

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Format Date object for display (YYYY-MM-DD)
 * Uses UTC to ensure consistent formatting
 * @param date - Date object to format
 * @returns Formatted string like "2024-12-11"
 */
export function formatDateForDisplay(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Filter items by date range based on Unix timestamp
 * @param items - Array of items with timestamp property
 * @param startTime - Start timestamp (inclusive)
 * @param endTime - End timestamp (inclusive)
 * @returns Filtered array
 */
export function filterByDateRange<T extends { timestamp: number }>(
  items: T[],
  startTime: number,
  endTime: number
): T[] {
  return items.filter(item => item.timestamp >= startTime && item.timestamp <= endTime);
}
