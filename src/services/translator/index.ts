/**
 * Translation Service
 *
 * Main entry point for translation and summarization operations.
 * Delegates to specialized modules for actual implementation.
 */

import { HNComment } from '../../types/api';
import {
  LLMProvider,
  createLLMProvider,
  CreateProviderOptions,
} from '../llmProvider';
import * as title from './title';
import * as summary from './summary';

/**
 * TranslationService class
 * Provides a unified interface for all translation and summarization operations.
 * Uses singleton pattern - access via exported `translator` instance.
 */
class TranslationService {
  private provider: LLMProvider | null = null;
  private initialized = false;

  /**
   * Initialize the translation service with LLM provider
   * @param apiKeyOrOptions - API key string (for backward compatibility) or provider options
   */
  init(apiKeyOrOptions?: string | CreateProviderOptions): void {
    if (this.initialized) {
      return;
    }

    // Handle backward compatibility: if a string is passed, treat it as deepseekApiKey
    const options: CreateProviderOptions =
      typeof apiKeyOrOptions === 'string'
        ? { deepseekApiKey: apiKeyOrOptions }
        : apiKeyOrOptions || {};

    this.provider = createLLMProvider(options);
    this.initialized = true;

    console.log(
      `Translation service initialized with ${this.provider.getName()} provider (model: ${this.provider.getModel()})`
    );
  }

  /**
   * Get the current provider (for testing or advanced usage)
   */
  getProvider(): LLMProvider | null {
    return this.provider;
  }

  /**
   * Ensure provider is initialized
   */
  private ensureProvider(): LLMProvider {
    if (!this.provider) {
      throw new Error('Translation service not initialized');
    }
    return this.provider;
  }

  // ============================================
  // Title Translation Methods
  // ============================================

  /**
   * Translate a single title to Chinese
   */
  async translateTitle(titleText: string): Promise<string> {
    return title.translateTitle(this.ensureProvider(), titleText);
  }

  /**
   * Translate multiple titles sequentially
   */
  async translateBatch(titles: string[]): Promise<string[]> {
    return title.translateBatchSequential(this.ensureProvider(), titles);
  }

  /**
   * Batch translate multiple titles in a single API call (optimized)
   */
  async translateTitlesBatch(
    titles: string[],
    batchSize: number = 10
  ): Promise<string[]> {
    return title.translateTitlesBatch(this.ensureProvider(), titles, batchSize);
  }

  // ============================================
  // Description Translation Methods
  // ============================================

  /**
   * Translate a single description to Chinese
   */
  async translateDescription(description: string | null): Promise<string> {
    return title.translateDescription(this.ensureProvider(), description);
  }

  /**
   * Translate multiple descriptions sequentially
   */
  async translateDescriptionsBatch(
    descriptions: (string | null)[]
  ): Promise<string[]> {
    return title.translateDescriptionsBatch(this.ensureProvider(), descriptions);
  }

  // ============================================
  // Content Summarization Methods
  // ============================================

  /**
   * Summarize article content in Chinese
   */
  async summarizeContent(
    content: string,
    maxLength: number
  ): Promise<string | null> {
    return summary.summarizeContent(this.ensureProvider(), content, maxLength);
  }

  /**
   * Summarize multiple contents sequentially with fallback
   */
  async summarizeBatch(
    contents: (string | null)[],
    fallbackDescriptions: (string | null)[],
    maxLength: number
  ): Promise<string[]> {
    return summary.summarizeBatchSequential(
      this.ensureProvider(),
      contents,
      fallbackDescriptions,
      maxLength
    );
  }

  /**
   * Batch summarize multiple contents in single API calls (optimized)
   */
  async summarizeContentBatch(
    contents: (string | null)[],
    maxLength: number,
    batchSize: number = 10
  ): Promise<(string | null)[]> {
    return summary.summarizeContentBatch(
      this.ensureProvider(),
      contents,
      maxLength,
      batchSize
    );
  }

  // ============================================
  // Comment Summarization Methods
  // ============================================

  /**
   * Summarize comments for a single story
   */
  async summarizeComments(comments: HNComment[]): Promise<string | null> {
    return summary.summarizeComments(this.ensureProvider(), comments);
  }

  /**
   * Batch summarize comments for multiple stories (optimized)
   */
  async summarizeCommentsBatch(
    commentArrays: HNComment[][],
    batchSize: number = 10
  ): Promise<(string | null)[]> {
    return summary.summarizeCommentsBatch(
      this.ensureProvider(),
      commentArrays,
      batchSize
    );
  }
}

// Export singleton instance
export const translator = new TranslationService();

// Re-export types for convenience
export { CreateProviderOptions } from '../llmProvider';
