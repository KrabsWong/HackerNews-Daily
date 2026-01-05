import type { FilterClassification } from '../../types/content';

/**
 * Parse AI classification response
 * @param response - Raw response from AI
 * @returns Array of classification results
 * @throws Error if response is invalid or malformed
 */
export function parseClassificationResponse(
  response: string
): FilterClassification[] {
  // Extract JSON from response (handles markdown code blocks like ```json ... ```)
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array found in response');
  }

  // Parse JSON (may throw SyntaxError)
  let classifications: unknown;
  try {
    classifications = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
  }

  // Validate structure
  if (!Array.isArray(classifications)) {
    throw new Error('Response is not an array');
  }

  // Validate each classification
  for (const item of classifications) {
    if (typeof item.index !== 'number') {
      throw new Error(`Invalid classification: missing or invalid index`);
    }
    if (!['SAFE', 'SENSITIVE'].includes(item.classification)) {
      throw new Error(`Invalid classification value: ${item.classification}`);
    }
  }

  return classifications as FilterClassification[];
}
