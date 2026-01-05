import { HNStory } from '../../types/api';
import { CONTENT_FILTER_CONSTANTS, SensitivityLevel } from '../../config/constants';
import { LLMProvider, createLLMProvider, CreateProviderOptions } from '../llm';
import { classifyTitles } from './classifier';
import { buildClassificationPrompt } from './prompt';
import type { FilterClassification, ContentFilter } from '../../types/content';
import { getErrorMessage } from '../../worker/logger';

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

    // Extract titles for classification (no try-catch needed for synchronous map)
    const titles = stories.map(story => story.title);

    // Build classification prompt (pure function, no error expected)
    const prompt = buildClassificationPrompt(titles, this.sensitivity);

    // Classify titles using AI (may throw on network/LLM/parsing errors)
    let classifications: FilterClassification[];
    try {
      classifications = await classifyTitles(
        this.getProvider(),
        titles,
        prompt
      );
    } catch (error) {
      // Fallback: return all stories on error (fail-open behavior)
      if (this.fallbackOnError) {
        console.warn(
          'Content filter failed, allowing all stories through:',
          getErrorMessage(error)
        );
        return stories;
      } else {
        throw error;
      }
    }

    // Filter stories: keep only SAFE ones (no try-catch needed for synchronous filter)
    const filteredStories = stories.filter((_, index) => {
      const classification = classifications.find(c => c.index === index);
      return classification?.classification === 'SAFE';
    });

    // Log filtering statistics
    const filteredCount = stories.length - filteredStories.length;
    if (filteredCount > 0) {
      console.log(
        `Filtered ${filteredCount} stories based on content policy (AI)`
      );

      // Warn if more than 50% filtered
      if (filteredCount > stories.length * 0.5) {
        console.warn(
          'Over 50% of stories were filtered. Consider lowering sensitivity level.'
        );
      }
    }

    return filteredStories;
  }
}
