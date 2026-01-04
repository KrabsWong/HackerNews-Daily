/**
 * AI-based content filter using LLM for classification
 * Supports multiple LLM providers (DeepSeek, OpenRouter)
 */

import { HNStory } from '../types/api';
import { CONTENT_FILTER_CONSTANTS, SensitivityLevel } from '../config/constants';
import { LLMProvider, createLLMProvider, CreateProviderOptions } from './llm';
import type { FilterClassification, ContentFilter } from '../types/content';
import { getErrorMessage } from '../worker/logger';

// Re-export types for backward compatibility
export type { FilterClassification, ContentFilter } from '../types/content';

/**
 * AI-based content filter using LLM for classification
 * Supports multiple LLM providers (DeepSeek, OpenRouter)
 */
export class AIContentFilter implements ContentFilter {
  private provider: LLMProvider | null = null;
  private providerOptions: CreateProviderOptions;
  private enabled: boolean;
  private sensitivity: SensitivityLevel;
  private fallbackOnError: boolean;

  /**
   * Create a new AI content filter
   * @param providerOptions - Options to create LLM provider
   * @param config - Content filter configuration (optional)
   */
  constructor(
    providerOptions: CreateProviderOptions,
    config?: { enabled?: boolean; sensitivity?: SensitivityLevel }
  ) {
    // Use provided config or defaults
    this.enabled = config?.enabled ?? false;
    this.sensitivity = config?.sensitivity ?? 'medium';
    this.fallbackOnError = CONTENT_FILTER_CONSTANTS.FALLBACK_ON_ERROR;
    this.providerOptions = providerOptions;
  }

  /**
   * Get or create LLM provider
   */
  private getProvider(): LLMProvider {
    if (!this.provider) {
      this.provider = createLLMProvider(this.providerOptions);
    }
    return this.provider;
  }

  /**
   * Check if content filtering is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current sensitivity level
   */
  getSensitivityLevel(): SensitivityLevel {
    return this.sensitivity;
  }

  /**
   * Filter stories using AI classification
   * Returns all stories if filter is disabled or if classification fails
   */
  async filterStories(stories: HNStory[]): Promise<HNStory[]> {
    // Early return if filter is disabled
    if (!this.enabled) {
      return stories;
    }

    // Early return for empty array
    if (stories.length === 0) {
      return stories;
    }

    try {
      // Extract titles for classification
      const titles = stories.map(story => story.title);

      // Classify titles using AI
      const classifications = await this.classifyTitles(titles);

      // Filter stories: keep only SAFE ones
      const filteredStories = stories.filter((_, index) => {
        const classification = classifications.find(c => c.index === index);
        return classification?.classification === 'SAFE';
      });

      // Log filtering statistics
      const filteredCount = stories.length - filteredStories.length;
      if (filteredCount > 0) {
        console.log(`Filtered ${filteredCount} stories based on content policy (AI)`);

        // Warn if more than 50% filtered
        if (filteredCount > stories.length * 0.5) {
          console.warn(`Over 50% of stories were filtered. Consider lowering sensitivity level.`);
        }
      }

      return filteredStories;
    } catch (error) {
      // Fallback: return all stories on error (fail-open behavior)
      if (this.fallbackOnError) {
      console.warn('Content filter failed, allowing all stories through:',
        getErrorMessage(error));
        return stories;
      } else {
        throw error;
      }
    }
  }

  /**
   * Classify story titles using AI
   * @param titles - Array of story titles to classify
   * @returns Array of classification results
   * @throws Error if classification fails and FALLBACK_ON_ERROR is false
   */
  private async classifyTitles(titles: string[]): Promise<FilterClassification[]> {
    // Build classification prompt
    const prompt = this.buildClassificationPrompt(titles);

    try {
      // Send classification request via LLM provider
      const response = await this.sendClassificationRequest(prompt);

      // Parse and validate response
      const classifications = this.parseClassificationResponse(response);

      // Validate we got classifications for all titles
      if (classifications.length !== titles.length) {
        throw new Error(`Expected ${titles.length} classifications, got ${classifications.length}`);
      }

      return classifications;
    } catch (error) {
      console.error('AI classification failed:',
        getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Send classification request to LLM provider
   * @param prompt - The classification prompt
   * @returns The AI's response content
   */
  private async sendClassificationRequest(prompt: string): Promise<string> {
    const provider = this.getProvider();

    const response = await provider.chatCompletion({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent classification
    });

    return response.content;
  }

  /**
   * Build AI prompt for content classification
   * @param titles - Array of titles to classify
   * @returns Formatted prompt string
   */
  private buildClassificationPrompt(titles: string[]): string {
    // Define sensitivity guidelines based on level
    const sensitivityGuidelines: Record<SensitivityLevel, string> = {
      low: `Only classify as SENSITIVE if content:
- Explicitly violates Chinese law
- Contains explicit adult or violent content
- Promotes illegal activities`,

      medium: `Classify as SENSITIVE if the content:
- Relates to Chinese political controversies
- Discusses topics restricted in mainland China
- Contains explicit adult or violent content
- Promotes illegal activities or hate speech`,

      high: `Classify as SENSITIVE if the content:
- Relates to any Chinese political topics
- Discusses censorship or internet freedom
- Contains controversial social or political content
- Contains adult, violent, or offensive content
- Discusses topics that may be sensitive in China`
    };

    // Build prompt
    const prompt = `You are a content moderator for a Chinese news aggregator.
Your task is to classify news titles as either "SAFE" or "SENSITIVE".

Sensitivity Level: ${this.sensitivity}
${sensitivityGuidelines[this.sensitivity]}

IMPORTANT:
- Focus on the title content only
- Consider the context (e.g., historical discussion vs current politics)
- When in doubt at the boundary, classify as SAFE

Respond ONLY with a valid JSON array in this exact format:
[{"index": 0, "classification": "SAFE"}, {"index": 1, "classification": "SENSITIVE"}, ...]

Titles to classify:
${titles.map((title, i) => `${i}. ${title}`).join('\n')}

JSON Response:`;

    return prompt;
  }

  /**
   * Parse AI classification response
   * @param response - Raw response from AI
   * @returns Array of classification results
   * @throws Error if response is invalid or malformed
   */
  private parseClassificationResponse(response: string): FilterClassification[] {
    try {
      // Extract JSON from response (handles markdown code blocks like ```json ... ```)
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      // Parse JSON
      const classifications = JSON.parse(jsonMatch[0]) as FilterClassification[];

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

      return classifications;
    } catch (error) {
      console.error('Failed to parse AI classification response:',
        getErrorMessage(error));
      throw new Error('Invalid classification response format');
    }
  }
}
