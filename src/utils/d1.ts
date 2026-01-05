/**
 * D1 Database Query Result Types
 * 
 * Provides type-safe query result handling with explicit null/undefined checks
 */

/**
 * D1 query result that may or may not return data
 * Cloudflare D1 API returns { results, meta } structure
 */
export interface D1QueryResult<T> {
  results: T[];
  meta: {
    duration: number;
    last_row_id: number | null;
    changes: number;
    served_by: string;
  };
}

/**
 * Type guard to check if D1 query returned results
 */
export function hasResults<T>(result: D1QueryResult<T>): boolean {
  return result.results && result.results.length > 0;
}

/**
 * Extract first result from D1 query (returns null if no results)
 */
export function firstResult<T>(result: D1QueryResult<T>): T | null {
  return result.results[0] ?? null;
}

/**
 * Extract all results from D1 query (returns empty array if no results)
 */
export function allResults<T>(result: D1QueryResult<T>): T[] {
  return result.results ?? [];
}

/**
 * Get number of results from D1 query
 */
export function countResults<T>(result: D1QueryResult<T>): number {
  return result.results?.length ?? 0;
}
