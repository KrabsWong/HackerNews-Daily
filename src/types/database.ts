/**
 * D1 Database types for distributed task processing
 * These types match the schema defined in migrations/0001_create_tables.sql
 */

/**
 * Daily task metadata stored in D1
 */
export interface DailyTask {
  id: number;
  task_date: string; // YYYY-MM-DD format
  status: DailyTaskStatus;
  total_articles: number;
  completed_articles: number;
  failed_articles: number;
  created_at: number; // Unix timestamp (milliseconds)
  updated_at: number; // Unix timestamp (milliseconds)
  published_at: number | null; // Unix timestamp (milliseconds) when published
}

/**
 * Task status enum
 */
export type DailyTaskStatus =
  | 'init'          // Task created, not yet started
  | 'list_fetched'  // Article list fetched from HN API
  | 'processing'    // Processing batches of articles
  | 'aggregating'   // All articles processed, aggregating results
  | 'published'     // Content published to GitHub/Telegram
  | 'archived';     // Task archived (old task)

/**
 * Article record stored in D1
 */
export interface Article {
  id: number;
  task_date: string; // YYYY-MM-DD format
  story_id: number; // HackerNews story ID
  rank: number; // Ranking 1-30
  url: string;
  title_en: string; // English title
  title_zh: string | null; // Chinese title (filled after translation)
  score: number; // HN score
  published_time: number; // Article publish time (Unix timestamp milliseconds)
  content_summary_zh: string | null; // Content summary (Chinese)
  comment_summary_zh: string | null; // Comment summary (Chinese)
  status: ArticleStatus;
  error_message: string | null; // Error message (if failed)
  retry_count: number; // Retry attempt count
  created_at: number; // Creation time
  updated_at: number; // Update time
}

/**
 * Article status enum
 */
export type ArticleStatus =
  | 'pending'     // Waiting to be processed
  | 'processing'  // Currently being processed
  | 'completed'   // Processing completed successfully
  | 'failed';     // Processing failed

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
 * Batch status enum
 */
export type BatchStatus =
  | 'success'  // All articles processed successfully
  | 'partial'  // Some articles failed
  | 'failed';  // Entire batch failed

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
