/**
 * Array and async utility functions
 * Common helpers for batch processing and async operations
 */

import { Result, Ok, Err } from './result';

/**
 * Safe preview of content for logging
 * Truncates long content and escapes special characters
 */
function getContentPreview(content: string, maxLength: number = 200): string {
  const preview = content.substring(0, maxLength);
  return preview.length < content.length ? `${preview}...` : preview;
}

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
  
  // Validate that chunking preserves array integrity
  if (chunks.length > 0) {
    const reconstructed = chunks.flat();
    if (reconstructed.length !== arr.length) {
      console.warn(`chunk: Array length mismatch after chunking. Original: ${arr.length}, Reconstructed: ${reconstructed.length}`);
    }
  }
  
  return chunks;
}

/**
 * Parse JSON array from LLM response with robust error handling
 * Handles markdown code blocks, whitespace, and various formatting issues
 * @param content - Raw LLM response content
 * @param expectedLength - Expected array length for validation (logs warning if mismatch)
 * @returns Result with parsed array or error
 */
export function parseJsonArray<T>(
  content: string,
  expectedLength?: number
): Result<T[]> {
  if (!content || content.trim().length === 0) {
    console.error('parseJsonArray: Empty or null content received');
    return Err(new Error('Empty content'));
  }

  // Step 1: Remove markdown code blocks (multiple formats)
  let cleanContent = content
    .replace(/```json\s*/g, '')
    .replace(/```javascript\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  // Step 2: Try to extract JSON array if surrounded by text
  const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    cleanContent = arrayMatch[0];
  }

  // Step 3: Clean up common formatting issues
  cleanContent = cleanContent
    .replace(/^\s*[\r\n]+/gm, '') // Remove empty lines
    .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
    .trim();

  // Step 4: Attempt to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanContent);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('parseJsonArray: Failed to parse JSON', {
      error: errorMsg,
      contentPreview: getContentPreview(cleanContent),
      contentLength: cleanContent.length,
    });
    
    // Try to provide helpful error context
    if (cleanContent.includes('{') && cleanContent.includes('}')) {
      console.error('parseJsonArray: Content appears to contain JSON but parsing failed');
    }
    
    return Err(new Error(`Failed to parse JSON: ${errorMsg}`));
  }

  // Step 5: Validate it's an array
  if (!Array.isArray(parsed)) {
    console.error('parseJsonArray: Response is not an array', {
      type: typeof parsed,
      value: parsed,
    });
    return Err(new Error('Response is not an array'));
  }

  // Step 6: Validate length if expected
  if (expectedLength !== undefined && parsed.length !== expectedLength) {
    console.warn(
      `parseJsonArray: Expected ${expectedLength} items, got ${parsed.length}. Continuing with available items.`
    );
  }

  console.log(`parseJsonArray: Successfully parsed ${parsed.length} items`);
  return Ok(parsed as T[]);
}
