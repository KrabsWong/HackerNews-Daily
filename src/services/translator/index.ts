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
} from '../llm';
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
   * @param options - Provider options
   */
  init(options: CreateProviderOptions): void {
    if (this.initialized) {
      return;
    }

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
   * Summarize multiple contents using concurrent single-item processing
   * Returns array with empty strings for null/missing content (preserves indices)
   * Index-to-content alignment is guaranteed by code (not dependent on LLM response order)
   * @param concurrency - Number of concurrent LLM requests (default 10)
   */
  async summarizeContentBatch(
    contents: (string | null)[],
    maxLength: number,
    concurrency: number = 10
  ): Promise<string[]> {
    return summary.summarizeContentBatch(
      this.ensureProvider(),
      contents,
      maxLength,
      concurrency
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
   * Summarize comments with retry logic for reliability
   */
  async summarizeCommentsWithRetry(
    comments: HNComment[],
    maxRetries?: number
  ): Promise<string | null> {
    return summary.summarizeCommentsWithRetry(
      this.ensureProvider(),
      comments,
      maxRetries
    );
  }

  /**
   * Summarize comments for multiple stories using concurrent single-item processing
   * Returns array with empty strings for insufficient comments (preserves indices)
   * Index-to-content alignment is guaranteed by code (not dependent on LLM response order)
   * @param concurrency - Number of concurrent LLM requests (default 10)
   */
  async summarizeCommentsBatch(
    commentArrays: HNComment[][],
    concurrency: number = 10
  ): Promise<string[]> {
    return summary.summarizeCommentsBatch(
      this.ensureProvider(),
      commentArrays,
      concurrency
    );
  }
}

// Export singleton instance
export const translator = new TranslationService();

// Re-export types for convenience
export type { CreateProviderOptions } from '../llm';
