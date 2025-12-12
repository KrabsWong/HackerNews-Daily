/**
 * Array and async utility functions
 * Common helpers for batch processing and async operations
 */

import { Result, Ok, Err } from './result';

/** Maximum number of retry attempts for rate-limited requests */
export const MAX_RETRIES = 2;

/** Delay helper for retry logic */
export const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Split array into chunks for batch processing
 * @param arr - Array to split
 * @param size - Chunk size (0 or >= arr.length returns single chunk)
 * @returns Array of chunks
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size === 0 || size >= arr.length) {
    return [arr];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Parse JSON array from LLM response
 * Handles markdown code blocks and validates array structure
 * @param content - Raw LLM response content
 * @param expectedLength - Expected array length for validation
 * @returns Result with parsed array or error
 */
export function parseJsonArray<T>(
  content: string,
  expectedLength?: number
): Result<T[]> {
  // Remove markdown code blocks if present
  const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanContent);
  } catch {
    return Err(new Error('Failed to parse JSON'));
  }

  if (!Array.isArray(parsed)) {
    return Err(new Error('Response is not an array'));
  }

  if (expectedLength !== undefined && parsed.length !== expectedLength) {
    return Err(new Error(`Expected ${expectedLength} items, got ${parsed.length}`));
  }

  return Ok(parsed as T[]);
}
