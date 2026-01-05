/**
 * D1 Database types for distributed task processing
 * These types match the schema defined in migrations/0001_create_tables.sql
 */

/**
 * Daily task status enum (for database storage)
 * Using enum for better type safety and autocomplete
 */
export enum DailyTaskStatus {
  INIT = 'init',                      // Task created, not yet started
  LIST_FETCHED = 'list_fetched',        // Article list fetched from HN API
  PROCESSING = 'processing',              // Processing batches of articles
  AGGREGATING = 'aggregating',          // All articles processed, aggregating results
  PUBLISHED = 'published',                // Content published to GitHub/Telegram
  ARCHIVED = 'archived'                  // Task archived (old task)
}

/**
 * Article status enum (for database storage)
 * Using enum for better type safety and autocomplete
 */
export enum ArticleStatus {
  PENDING = 'pending',                  // Waiting to be processed
  PROCESSING = 'processing',              // Currently being processed
  COMPLETED = 'completed',                // Processing completed successfully
  FAILED = 'failed',                      // Processing failed
}

/**
 * Batch status enum (for database storage)
 * Using enum for better type safety and autocomplete
 */
export enum BatchStatus {
  SUCCESS = 'success',                    // All articles processed successfully
  PARTIAL = 'partial',                    // Some articles failed
  FAILED = 'failed',                      // Entire batch failed
}

/**
 * Base daily task interface
 */
interface DailyTaskBase {
  id: number;
  task_date: string; // YYYY-MM-DD format
  total_articles: number;
  completed_articles: number;
  failed_articles: number;
  created_at: number; // Unix timestamp (milliseconds)
  updated_at: number; // Unix timestamp (milliseconds)
}

/**
 * Discriminated union types for daily tasks based on status
 * This provides type-safe access to status-specific fields
 */
export type DailyTask =
  | (DailyTaskBase & {
      status: DailyTaskStatus.INIT;
      published_at: null;
    })
  | (DailyTaskBase & {
      status: DailyTaskStatus.LIST_FETCHED;
      published_at: null;
    })
  | (DailyTaskBase & {
      status: DailyTaskStatus.PROCESSING;
      published_at: null;
    })
  | (DailyTaskBase & {
      status: DailyTaskStatus.AGGREGATING;
      published_at: null;
    })
  | (DailyTaskBase & {
      status: DailyTaskStatus.PUBLISHED;
      published_at: number; // Required when published
    })
  | (DailyTaskBase & {
      status: DailyTaskStatus.ARCHIVED;
      published_at: number | null;
    });


/**
 * Base article interface
 */
interface ArticleBase {
  id: number;
  task_date: string; // YYYY-MM-DD format
  story_id: number; // HackerNews story ID
  rank: number; // Ranking 1-30
  url: string;
  title_en: string; // English title
  score: number; // HN score
  published_time: number; // Article publish time (Unix timestamp milliseconds)
  retry_count: number; // Retry attempt count
  created_at: number; // Creation time
  updated_at: number; // Update time
}

/**
 * Discriminated union types for articles based on status
 * This provides type-safe access to status-specific fields
 */
export type Article =
  | (ArticleBase & {
      status: ArticleStatus.PENDING;
      title_zh: null;
      content_summary_zh: null;
      comment_summary_zh: null;
      error_message: null;
    })
  | (ArticleBase & {
      status: ArticleStatus.PROCESSING;
      title_zh: string | null;
      content_summary_zh: string | null;
      comment_summary_zh: string | null;
      error_message: null;
    })
  | (ArticleBase & {
      status: ArticleStatus.COMPLETED;
      title_zh: string;
      content_summary_zh: string;
      comment_summary_zh: string;
      error_message: null;
    })
  | (ArticleBase & {
      status: ArticleStatus.FAILED;
      title_zh: string | null;
      content_summary_zh: string | null;
      comment_summary_zh: string | null;
      error_message: string; // Required when failed
    });

/**
 * Batch execution record for observability
 */
export interface TaskBatch {
  id: number;
  task_date: string; // YYYY-MM-DD format
  batch_index: number; // Batch index (1, 2, 3...)
  article_count: number; // Number of articles in this batch
  subrequest_count: number; // Subrequest count consumed by this batch
  duration_ms: number; // Execution duration (milliseconds)
  status: BatchStatus;
  error_message: string | null; // Error message (if failed)
  created_at: number; // Batch start time
}


/**
 * Task progress statistics
 */
export interface TaskProgress {
  task: DailyTask;
  pendingCount: number;
  processingCount: number;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
  status: BatchStatus;
  articleCount: number;
  subrequestCount: number;
  durationMs: number;
  errorMessage?: string;
}
