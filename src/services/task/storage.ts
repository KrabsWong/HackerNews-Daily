/**
 * D1 Task Storage Service
 * 
 * Provides CRUD operations for distributed task processing:
 * - DailyTask management (create, update, query)
 * - Article management (insert, update, query)
 * - Batch recording (performance tracking)
 * - Retry logic (failure recovery)
 * - Cleanup (archival)
 */

import {
  DailyTask,
  DailyTaskStatus,
  Article,
  ArticleStatus,
  TaskProgress,
  BatchProcessingResult,
  BatchStatus,
} from '../../types/database';

export class TaskStorage {
  constructor(private db: D1Database) {}

  // ==================== DailyTask Operations ====================

  /**
   * Create a new daily task record
   */
  async createDailyTask(taskDate: string): Promise<DailyTask> {
    const now = Date.now();
    const stmt = this.db.prepare(
      `INSERT INTO daily_tasks (task_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       RETURNING *`
    );
    
    const result = await stmt.bind(taskDate, DailyTaskStatus.INIT, now, now).first<DailyTask>();
    
    if (!result) {
      throw new Error(`Failed to create daily task for ${taskDate}`);
    }
    
    return result;
  }

  /**
   * Get existing task or create new one (idempotent)
   */
  async getOrCreateTask(taskDate: string): Promise<DailyTask> {
    // Try to get existing task
    const existing = await this.db
      .prepare('SELECT * FROM daily_tasks WHERE task_date = ?')
      .bind(taskDate)
      .first<DailyTask>();

    if (existing) {
      return existing;
    }

    // Create new task if not exists
    return this.createDailyTask(taskDate);
  }

  /**
   * Update task status with progress counters
   */
  async updateTaskStatus(
    taskDate: string,
    status: DailyTaskStatus,
    updates?: {
      totalArticles?: number;
      completedArticles?: number;
      failedArticles?: number;
      publishedAt?: number;
    }
  ): Promise<void> {
    const now = Date.now();
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const binds: (string | number)[] = [status, now];

    if (updates) {
      if (updates.totalArticles !== undefined) {
        sets.push('total_articles = ?');
        binds.push(updates.totalArticles);
      }
      if (updates.completedArticles !== undefined) {
        sets.push('completed_articles = ?');
        binds.push(updates.completedArticles);
      }
      if (updates.failedArticles !== undefined) {
        sets.push('failed_articles = ?');
        binds.push(updates.failedArticles);
      }
      if (updates.publishedAt !== undefined) {
        sets.push('published_at = ?');
        binds.push(updates.publishedAt);
      }
    }

    binds.push(taskDate); // WHERE clause

    const stmt = this.db.prepare(
      `UPDATE daily_tasks SET ${sets.join(', ')} WHERE task_date = ?`
    );

    await stmt.bind(...binds).run();
  }

  /**
   * Increment task progress counters
   */
  async incrementTaskCounters(
    taskDate: string,
    completedDelta: number,
    failedDelta: number
  ): Promise<void> {
    const now = Date.now();
    const stmt = this.db.prepare(
      `UPDATE daily_tasks 
       SET completed_articles = completed_articles + ?,
           failed_articles = failed_articles + ?,
           updated_at = ?
       WHERE task_date = ?`
    );

    await stmt.bind(completedDelta, failedDelta, now, taskDate).run();
  }

  /**
   * Get task progress (for monitoring)
   */
  async getTaskProgress(taskDate: string): Promise<TaskProgress | null> {
    const task = await this.db
      .prepare('SELECT * FROM daily_tasks WHERE task_date = ?')
      .bind(taskDate)
      .first<DailyTask>();

    if (!task) {
      return null;
    }

    const pendingCount = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM articles WHERE task_date = ? AND status = ${ArticleStatus.PENDING}`
      )
      .bind(taskDate)
      .first<{ count: number }>();

    const processingCount = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM articles WHERE task_date = ? AND status = ${ArticleStatus.PROCESSING}`
      )
      .bind(taskDate)
      .first<{ count: number }>();

    return {
      task,
      pendingCount: pendingCount?.count ?? 0,
      processingCount: processingCount?.count ?? 0,
    };
  }

  // ==================== Article Operations ====================

  /**
   * Insert multiple articles (called after fetching HN list)
   */
  async insertArticles(
    taskDate: string,
    articles: Array<{
      storyId: number;
      rank: number;
      url: string;
      titleEn: string;
      score: number;
      publishedTime: number;
    }>
  ): Promise<void> {
    if (articles.length === 0) return;

    const now = Date.now();

    // Use transaction for atomicity
    await this.db.batch(
      articles.map((article) =>
        this.db
          .prepare(
            `INSERT INTO articles (
              task_date, story_id, rank, url, title_en, score, 
              published_time, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ${ArticleStatus.PENDING}, ?, ?)`
          )
          .bind(
            taskDate,
            article.storyId,
            article.rank,
            article.url,
            article.titleEn,
            article.score,
            article.publishedTime,
            now,
            now
          )
      )
    );
  }

  /**
   * Get pending articles for batch processing
   */
  async getPendingArticles(
    taskDate: string,
    limit: number
  ): Promise<Article[]> {
    const stmt = this.db.prepare(
      `SELECT * FROM articles 
       WHERE task_date = ? AND status = ${ArticleStatus.PENDING}
       ORDER BY rank ASC
       LIMIT ?`
    );

    const result = await stmt.bind(taskDate, limit).all<Article>();
    return result.results ?? [];
  }

  /**
   * Update article status after processing
   */
  async updateArticleStatus(
    articleId: number,
    status: ArticleStatus,
    updates?: {
      titleZh?: string;
      contentSummaryZh?: string;
      commentSummaryZh?: string;
      errorMessage?: string;
      retryCount?: number;
    }
  ): Promise<void> {
    const now = Date.now();
    const sets: string[] = ['status = ?', 'updated_at = ?'];
    const binds: (string | number)[] = [status, now];

    if (updates) {
      if (updates.titleZh !== undefined) {
        sets.push('title_zh = ?');
        binds.push(updates.titleZh);
      }
      if (updates.contentSummaryZh !== undefined) {
        sets.push('content_summary_zh = ?');
        binds.push(updates.contentSummaryZh);
      }
      if (updates.commentSummaryZh !== undefined) {
        sets.push('comment_summary_zh = ?');
        binds.push(updates.commentSummaryZh);
      }
      if (updates.errorMessage !== undefined) {
        sets.push('error_message = ?');
        binds.push(updates.errorMessage);
      }
      if (updates.retryCount !== undefined) {
        sets.push('retry_count = ?');
        binds.push(updates.retryCount);
      }
    }

    binds.push(articleId); // WHERE clause

    const stmt = this.db.prepare(
      `UPDATE articles SET ${sets.join(', ')} WHERE id = ?`
    );

    await stmt.bind(...binds).run();
  }

  /**
   * Bulk update article statuses (for batch operations)
   */
  async updateArticlesBatch(
    updates: Array<{
      id: number;
      status: ArticleStatus;
      titleZh?: string;
      contentSummaryZh?: string;
      commentSummaryZh?: string;
      errorMessage?: string;
      retryCount?: number;
    }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const now = Date.now();

    await this.db.batch(
      updates.map((update) => {
        const sets: string[] = ['status = ?', 'updated_at = ?'];
        const binds: (string | number)[] = [update.status, now];

        if (update.titleZh !== undefined) {
          sets.push('title_zh = ?');
          binds.push(update.titleZh);
        }
        if (update.contentSummaryZh !== undefined) {
          sets.push('content_summary_zh = ?');
          binds.push(update.contentSummaryZh);
        }
        if (update.commentSummaryZh !== undefined) {
          sets.push('comment_summary_zh = ?');
          binds.push(update.commentSummaryZh);
        }
        if (update.errorMessage !== undefined) {
          sets.push('error_message = ?');
          binds.push(update.errorMessage);
        }
        if (update.retryCount !== undefined) {
          sets.push('retry_count = ?');
          binds.push(update.retryCount);
        }

        binds.push(update.id);

        return this.db
          .prepare(`UPDATE articles SET ${sets.join(', ')} WHERE id = ?`)
          .bind(...binds);
      })
    );
  }

  /**
   * Get all completed articles for aggregation
   */
  async getCompletedArticles(taskDate: string): Promise<Article[]> {
    const stmt = this.db.prepare(
      `SELECT * FROM articles 
       WHERE task_date = ? AND status = ${ArticleStatus.COMPLETED}
       ORDER BY rank ASC`
    );

    const result = await stmt.bind(taskDate).all<Article>();
    return result.results ?? [];
  }

  /**
   * Get failed articles for retry or manual review
   */
  async getFailedArticles(taskDate: string): Promise<Article[]> {
    const stmt = this.db.prepare(
      `SELECT * FROM articles 
       WHERE task_date = ? AND status = ${ArticleStatus.FAILED}
       ORDER BY rank ASC`
    );

    const result = await stmt.bind(taskDate).all<Article>();
    return result.results ?? [];
  }

  // ==================== Batch Recording Operations ====================

  /**
   * Record batch execution metrics
   */
  async recordBatch(
    taskDate: string,
    batchIndex: number,
    result: BatchProcessingResult
  ): Promise<void> {
    const now = Date.now();
    const stmt = this.db.prepare(
      `INSERT INTO task_batches (
        task_date, batch_index, article_count, subrequest_count,
        duration_ms, status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    await stmt
      .bind(
        taskDate,
        batchIndex,
        result.articleCount,
        result.subrequestCount,
        result.durationMs,
        result.status,
        result.errorMessage ?? null,
        now
      )
      .run();
  }

  /**
   * Get batch statistics for monitoring
   */
  async getBatchStatistics(taskDate: string): Promise<{
    totalBatches: number;
    successBatches: number;
    partialBatches: number;
    failedBatches: number;
    avgDurationMs: number;
    totalSubrequests: number;
  }> {
    const stats = await this.db
      .prepare(
        `SELECT 
          COUNT(*) as total_batches,
          SUM(CASE WHEN status = ${BatchStatus.SUCCESS} THEN 1 ELSE 0 END) as success_batches,
          SUM(CASE WHEN status = ${BatchStatus.PARTIAL} THEN 1 ELSE 0 END) as partial_batches,
          SUM(CASE WHEN status = ${BatchStatus.FAILED} THEN 1 ELSE 0 END) as failed_batches,
          AVG(duration_ms) as avg_duration_ms,
          SUM(subrequest_count) as total_subrequests
         FROM task_batches
         WHERE task_date = ?`
      )
      .bind(taskDate)
      .first<{
        total_batches: number;
        success_batches: number;
        partial_batches: number;
        failed_batches: number;
        avg_duration_ms: number;
        total_subrequests: number;
      }>();

    return {
      totalBatches: stats?.total_batches ?? 0,
      successBatches: stats?.success_batches ?? 0,
      partialBatches: stats?.partial_batches ?? 0,
      failedBatches: stats?.failed_batches ?? 0,
      avgDurationMs: stats?.avg_duration_ms ?? 0,
      totalSubrequests: stats?.total_subrequests ?? 0,
    };
  }

  // ==================== Retry Logic ====================

  /**
   * Retry failed articles (reset to pending)
   */
  async retryFailedArticles(
    taskDate: string,
    maxRetries: number
  ): Promise<number> {
    const now = Date.now();
    const stmt = this.db.prepare(
      `UPDATE articles 
       SET status = ${ArticleStatus.PENDING}, updated_at = ?
       WHERE task_date = ? AND status = ${ArticleStatus.FAILED} AND retry_count < ?`
    );

    const result = await stmt.bind(now, taskDate, maxRetries).run();
    return result.meta.changes;
  }

  /**
   * Mark article as permanently failed (exceeded max retries)
   */
  async markArticleFailed(
    articleId: number,
    errorMessage: string
  ): Promise<void> {
    await this.updateArticleStatus(articleId, ArticleStatus.FAILED, {
      errorMessage,
    });
  }

  /**
   * Increment retry count for an article
   */
  async incrementRetryCount(articleId: number): Promise<number> {
    const article = await this.db
      .prepare('SELECT retry_count FROM articles WHERE id = ?')
      .bind(articleId)
      .first<{ retry_count: number }>();

    const newRetryCount = (article?.retry_count ?? 0) + 1;

    await this.updateArticleStatus(articleId, ArticleStatus.PENDING, {
      retryCount: newRetryCount,
    });

    return newRetryCount;
  }

  // ==================== Cleanup Operations ====================

  /**
   * Archive old tasks (delete after retention period)
   */
  async archiveOldTasks(retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // Delete articles first (foreign key constraint)
    await this.db
      .prepare('DELETE FROM articles WHERE task_date < ?')
      .bind(cutoffDateStr)
      .run();

    // Delete task_batches
    await this.db
      .prepare('DELETE FROM task_batches WHERE task_date < ?')
      .bind(cutoffDateStr)
      .run();

    // Delete daily_tasks and return count
    const result = await this.db
      .prepare('DELETE FROM daily_tasks WHERE task_date < ?')
      .bind(cutoffDateStr)
      .run();

    return result.meta.changes;
  }

  /**
   * Mark task as archived (soft delete alternative)
   */
  async markTaskArchived(taskDate: string): Promise<void> {
    await this.updateTaskStatus(taskDate, DailyTaskStatus.ARCHIVED);
  }

  // ==================== Utility Methods ====================

  /**
   * Check if D1 database is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.prepare('SELECT 1').first();
      return true;
    } catch (error) {
      console.error('D1 health check failed:', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalTasks: number;
    totalArticles: number;
    totalBatches: number;
  }> {
    const [tasks, articles, batches] = await Promise.all([
      this.db.prepare('SELECT COUNT(*) as count FROM daily_tasks').first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM articles').first<{ count: number }>(),
      this.db.prepare('SELECT COUNT(*) as count FROM task_batches').first<{ count: number }>(),
    ]);

    return {
      totalTasks: tasks?.count ?? 0,
      totalArticles: articles?.count ?? 0,
      totalBatches: batches?.count ?? 0,
    };
  }
}

/**
 * Factory function to create TaskStorage instance
 */
export function createTaskStorage(db: D1Database): TaskStorage {
  return new TaskStorage(db);
}
