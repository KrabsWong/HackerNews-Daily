import type { FilterClassification } from '../../types/content';
import type { LLMProvider } from '../llm';
import { parseClassificationResponse } from './parser';

/**
 * Classify story titles using AI
 * @param provider - LLM provider instance
 * @param titles - Array of story titles to classify
 * @param prompt - The classification prompt
 * @returns Array of classification results
 * @throws Error if classification fails
 */
export async function classifyTitles(
  provider: LLMProvider,
  titles: string[],
  prompt: string
): Promise<FilterClassification[]> {
  // Send classification request via LLM provider (may throw on network errors)
  const response = await sendClassificationRequest(provider, prompt);

  // Parse and validate response (may throw on invalid format)
  const classifications = parseClassificationResponse(response);

  // Validate we got classifications for all titles
  if (classifications.length !== titles.length) {
    throw new Error(
      `Expected ${titles.length} classifications, got ${classifications.length}`
    );
  }

  return classifications;
}

/**
 * Send classification request to LLM provider
 * @param provider - LLM provider instance
 * @param prompt - The classification prompt
 * @returns The AI's response content
 * @throws Error if LLM request fails
 */
export async function sendClassificationRequest(
  provider: LLMProvider,
  prompt: string
): Promise<string> {
  const response = await provider.chatCompletion({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1, // Low temperature for consistent classification
  });

  return response.content;
}

