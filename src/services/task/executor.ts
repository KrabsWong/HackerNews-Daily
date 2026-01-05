/**
 * Distributed Task Executor
 * Orchestrates multi-stage article processing within Cloudflare Workers free tier limits
 */

import { fetchTopStoriesByScore, fetchCommentsBatchFromAlgolia } from '../../api';
import { translator } from '../translator';
import { buildProviderOptions } from '../llm';
import { fetchArticlesBatch } from '../articleFetcher';
import { AIContentFilter } from '../contentFilter';
import { generateMarkdownContent } from '../markdownExporter';
import { createTaskStorage, TaskStorage } from './storage';
import { logInfo, logError, logWarn } from '../../worker/logger';
import { getPreviousDayBoundaries, formatTimestamp } from '../../utils/date';
import { getContentFilterConfig, TASK_CONFIG } from '../../config/constants';
import type { Env } from '../../types/worker';
import type { ProcessedStory } from '../../types/shared';
import type { ArticleStatus, BatchStatus } from '../../types/database';
import { GitHubPublisher } from '../../worker/publishers/github';
import { TelegramPublisher } from '../../worker/publishers/telegram';
import { TerminalPublisher } from '../../worker/publishers/terminal';

/**
 * Task executor class that manages distributed article processing
 */
export class TaskExecutor {
  private storage: TaskStorage;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    if (!env.DB) {
      throw new Error('D1 database binding (DB) is required for distributed task processing');
    }
    this.storage = createTaskStorage(env.DB);
  }

  /**
   * Initialize daily task: fetch article list and store to D1
   * Returns task date and article count
   */
  async initializeTask(taskDate: string): Promise<{ taskDate: string; articleCount: number }> {
    logInfo('Initializing daily task', { taskDate });

    // Check if task already exists
    const existingTask = await this.storage.getOrCreateTask(taskDate);
    if (existingTask.status !== 'init') {
      logInfo('Task already initialized', { taskDate, status: existingTask.status });
      return { taskDate, articleCount: existingTask.total_articles };
    }

    // Calculate date range for article fetching
    const { start, end } = getPreviousDayBoundaries();
    const storyLimit = parseInt(this.env.HN_STORY_LIMIT || '30', 10);

    // Fetch top stories from HackerNews
    logInfo('Fetching stories from HackerNews API', { storyLimit, start, end });
    const stories = await fetchTopStoriesByScore(storyLimit, start, end);

    if (stories.length === 0) {
      logWarn('No stories found for date', { taskDate });
      throw new Error(`No stories found for ${taskDate}`);
    }

    logInfo('Stories fetched', { count: stories.length });

    // Apply content filter if enabled
    let filteredStories = stories;
    const contentFilterConfig = getContentFilterConfig(this.env);
    if (contentFilterConfig.enabled) {
      logInfo('Applying content filter');
      const providerOptions = buildProviderOptions(this.env);
      const contentFilter = new AIContentFilter(
        providerOptions,
        contentFilterConfig
      );
      filteredStories = await contentFilter.filterStories(stories);
      logInfo('Content filter applied', { original: stories.length, filtered: filteredStories.length });
    }

    // Insert articles into database
    await this.storage.insertArticles(
      taskDate,
      filteredStories.map((story, index) => ({
        storyId: story.id,
        rank: index + 1,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        titleEn: story.title,
        score: story.score,
        publishedTime: story.time * 1000, // Convert to milliseconds
      }))
    );

    // Update task status to list_fetched
    await this.storage.updateTaskStatus(taskDate, 'list_fetched', {
      totalArticles: filteredStories.length,
    });

    logInfo('Task initialization completed', { taskDate, articleCount: filteredStories.length });
    return { taskDate, articleCount: filteredStories.length };
  }

  /**
   * Process next batch of pending articles
   * Returns batch processing result
   */
  async processNextBatch(
    taskDate: string,
    batchSize?: number
  ): Promise<{ processed: number; failed: number; pending: number; processing: number }> {
    const actualBatchSize = batchSize || parseInt(this.env.TASK_BATCH_SIZE || String(TASK_CONFIG.DEFAULT_BATCH_SIZE), 10);
    const startTime = Date.now();

    logInfo('Processing next batch', { taskDate, batchSize: actualBatchSize });

    // Get pending articles
    const pendingArticles = await this.storage.getPendingArticles(taskDate, actualBatchSize);

    if (pendingArticles.length === 0) {
      logInfo('No pending articles to process', { taskDate });
      // Check if all articles are completed, transition to aggregating
      const progress = await this.storage.getTaskProgress(taskDate);
      const pending = progress?.pendingCount ?? 0;
      const processing = progress?.processingCount ?? 0;

      if (pending === 0 && processing === 0) {
        await this.storage.updateTaskStatus(taskDate, 'aggregating');
        logInfo('All articles processed, transitioned to aggregating', { taskDate });
      }

      return { processed: 0, failed: 0, pending, processing };
    }

    logInfo('Processing articles', { count: pendingArticles.length });

    // Mark articles as processing
    await this.storage.updateArticlesBatch(
      pendingArticles.map((article) => ({
        id: article.id,
        status: 'processing' as ArticleStatus,
      }))
    );

    // Update task status to processing if this is the first batch
    const task = await this.storage.getOrCreateTask(taskDate);
    if (task.status === 'list_fetched') {
      await this.storage.updateTaskStatus(taskDate, 'processing');
    }

    // Initialize translator
    const providerOptions = buildProviderOptions(this.env);
    translator.init(providerOptions);

    let subrequestCount = 0;
    let processedCount = 0;
    let failedCount = 0;

    try {
      // Step 1: Fetch article content
      logInfo('Fetching article content', { count: pendingArticles.length });
      const articleMetadata = await fetchArticlesBatch(
        pendingArticles.map((a) => a.url),
        this.env.CRAWLER_API_URL,
        this.env.CRAWLER_API_TOKEN
      );
      subrequestCount += pendingArticles.length; // Each article = 1 subrequest

      // Step 2: Fetch comments
      logInfo('Fetching comments', { count: pendingArticles.length });
      const storyObjects = pendingArticles.map((a) => ({
        id: a.story_id,
        title: a.title_en,
        url: a.url,
        score: a.score,
        time: Math.floor(a.published_time / 1000),
        type: 'story',
      }));
      const commentsBatch = await fetchCommentsBatchFromAlgolia(storyObjects, 3);
      subrequestCount += pendingArticles.length; // Each article = 1 subrequest

      // Step 3: Translate titles (batch)
      logInfo('Translating titles', { count: pendingArticles.length });
      const titlesBatch = await translator.translateTitlesBatch(pendingArticles.map((a) => a.title_en));
      subrequestCount += 1; // True batch = 1 subrequest

      // Step 4: Summarize content (pseudo-batch)
      logInfo('Summarizing content', { count: pendingArticles.length });
      const summaryMaxLength = parseInt(this.env.SUMMARY_MAX_LENGTH || '300', 10);
      const contentWithMetadata = articleMetadata.map((meta) => meta.fullContent);
      const contentSummaries = await translator.summarizeContentBatch(
        contentWithMetadata,
        summaryMaxLength
      );
      subrequestCount += pendingArticles.length; // Pseudo-batch = N subrequests

      // Step 5: Summarize comments (pseudo-batch)
      logInfo('Summarizing comments', { count: pendingArticles.length });
      const commentSummaries = await translator.summarizeCommentsBatch(commentsBatch, summaryMaxLength);
      subrequestCount += pendingArticles.length; // Pseudo-batch = N subrequests

      // Validate array lengths
      if (
        titlesBatch.length !== pendingArticles.length ||
        contentSummaries.length !== pendingArticles.length ||
        commentSummaries.length !== pendingArticles.length
      ) {
        throw new Error(
          `Array length mismatch: articles=${pendingArticles.length}, titles=${titlesBatch.length}, summaries=${contentSummaries.length}, comments=${commentSummaries.length}`
        );
      }

      // Step 6: Update articles with results
      const updates = pendingArticles.map((article, index) => {
        const titleZh = titlesBatch[index];
        const contentSummary = contentSummaries[index];
        const commentSummary = commentSummaries[index];
        const metadata = articleMetadata[index];

        // Determine final description
        let descriptionZh = contentSummary;
        if (!descriptionZh && metadata.description) {
          // Fallback to translated description
          descriptionZh = ''; // Will be handled in aggregation
        }

        // Determine final comment summary
        const finalCommentSummary = commentSummary || '暂无评论';

        const isSuccess = titleZh && descriptionZh;

        if (isSuccess) {
          processedCount++;
        } else {
          failedCount++;
        }

        return {
          id: article.id,
          status: isSuccess ? ('completed' as ArticleStatus) : ('failed' as ArticleStatus),
          titleZh: titleZh || '',
          contentSummaryZh: descriptionZh || '',
          commentSummaryZh: finalCommentSummary,
          errorMessage: isSuccess ? undefined : 'Translation failed: missing title or description',
        };
      });

      await this.storage.updateArticlesBatch(updates);

      await this.storage.incrementTaskCounters(taskDate, processedCount, failedCount);

      logInfo('Batch processing completed', {
        processed: processedCount,
        failed: failedCount,
        subrequests: subrequestCount,
      });
    } catch (error) {
      logError('Batch processing failed', { error: error instanceof Error ? error.message : String(error) });

      // Mark all articles as failed
      await this.storage.updateArticlesBatch(
        pendingArticles.map((article) => ({
          id: article.id,
          status: 'failed' as ArticleStatus,
          errorMessage: error instanceof Error ? error.message : String(error),
        }))
      );

      failedCount = pendingArticles.length;
      processedCount = 0;

      await this.storage.incrementTaskCounters(taskDate, 0, failedCount);
    }

    // Record batch statistics
    const durationMs = Date.now() - startTime;
    const task2 = await this.storage.getOrCreateTask(taskDate);
    const batchIndex = Math.ceil((task2.completed_articles + task2.failed_articles) / actualBatchSize);

    await this.storage.recordBatch(taskDate, batchIndex, {
      status: failedCount === 0 ? ('success' as BatchStatus) : failedCount === pendingArticles.length ? ('failed' as BatchStatus) : ('partial' as BatchStatus),
      articleCount: pendingArticles.length,
      subrequestCount,
      durationMs,
      errorMessage: failedCount > 0 ? `${failedCount} articles failed` : undefined,
    });

    // Log warning if subrequest count is high
    if (subrequestCount > 30) {
      logWarn('High subrequest count detected', {
        subrequests: subrequestCount,
        batchSize: actualBatchSize,
        recommendation: 'Consider reducing TASK_BATCH_SIZE',
      });
    }

      // Get progress statistics
      const progress = await this.storage.getTaskProgress(taskDate);
      const pending = progress ? progress.pendingCount : 0;
      const processing = progress ? progress.processingCount : 0;

      return { processed: processedCount, failed: failedCount, pending, processing };
    }

  /**
   * Aggregate completed articles and generate markdown content
   * Returns aggregated result
   */
  async aggregateResults(taskDate: string): Promise<{ stories: ProcessedStory[]; markdown: string }> {
    logInfo('Aggregating results', { taskDate });

    const completedArticles = await this.storage.getCompletedArticles(taskDate);

    if (completedArticles.length === 0) {
      logWarn('No completed articles to aggregate', { taskDate });
      throw new Error(`No completed articles for ${taskDate}`);
    }

    logInfo('Articles aggregated', { count: completedArticles.length });

    const stories = this.mapArticlesToStories(completedArticles);
    const dateObj = new Date(taskDate);
    const markdown = generateMarkdownContent(stories, dateObj);

    logInfo('Markdown generated', { length: markdown.length });

    return { stories, markdown };
  }

  /**
   * Publish results to GitHub and Telegram
   * Returns publication result
   */
  async publishResults(taskDate: string, markdown: string): Promise<{ github: boolean; telegram: boolean; terminal: boolean }> {
    logInfo('Publishing results', { taskDate });

    await this.validateForPublishing(taskDate);
    const publishContent = await this.preparePublishContent(taskDate, markdown);

    const localTestMode = this.env.LOCAL_TEST_MODE === 'true';
    const results: { github: boolean; telegram: boolean; terminal: boolean } = {
      github: false,
      telegram: false,
      terminal: false,
    };

    if (localTestMode) {
      results.terminal = await this.publishToTerminal(publishContent);
    } else {
      results.github = await this.publishToGitHub(publishContent);
      results.telegram = await this.publishToTelegram(publishContent);
    }

    await this.updatePublishedStatus(taskDate, results);

    return results;
  }

  private async validateForPublishing(taskDate: string): Promise<void> {
    const task = await this.storage.getOrCreateTask(taskDate);
    const totalProcessed = task.completed_articles + task.failed_articles;

    if (totalProcessed !== task.total_articles) {
      throw new Error(
        `Cannot publish: ${task.completed_articles} completed + ${task.failed_articles} failed (${totalProcessed}) != total_articles (${task.total_articles})`
      );
    }

    logInfo('All articles verified', { totalProcessed, totalArticles: task.total_articles });
  }

  private async preparePublishContent(taskDate: string, markdown: string) {
    const task = await this.storage.getOrCreateTask(taskDate);
    const completedArticles = await this.storage.getCompletedArticles(taskDate);
    const stories: ProcessedStory[] = this.mapArticlesToStories(completedArticles);

    return {
      markdown,
      dateStr: taskDate,
      stories,
      metadata: { taskDate, totalArticles: task.total_articles, completedArticles: task.completed_articles },
    };
  }

  private async publishToTerminal(publishContent: any): Promise<boolean> {
    try {
      logInfo('Local test mode: Outputting to terminal');
      const terminalPublisher = new TerminalPublisher();
      await terminalPublisher.publish(publishContent, {});
      logInfo('Terminal output completed');
      return true;
    } catch (error) {
      logError('Terminal publication failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private async publishToGitHub(publishContent: any): Promise<boolean> {
    const githubEnabled = this.env.GITHUB_ENABLED?.toLowerCase() !== 'false';

    if (!githubEnabled) {
      return false;
    }

    if (!this.env.GITHUB_TOKEN || !this.env.TARGET_REPO || !this.env.TARGET_BRANCH) {
      logWarn('GitHub publisher skipped: missing configuration', {
        hasToken: !!this.env.GITHUB_TOKEN,
        hasRepo: !!this.env.TARGET_REPO,
        hasBranch: !!this.env.TARGET_BRANCH,
      });
      return false;
    }

    try {
      logInfo('Publishing to GitHub');
      const githubPublisher = new GitHubPublisher();
      await githubPublisher.publish(publishContent, {
        GITHUB_TOKEN: this.env.GITHUB_TOKEN,
        TARGET_REPO: this.env.TARGET_REPO,
        TARGET_BRANCH: this.env.TARGET_BRANCH,
      });
      logInfo('GitHub publication succeeded');
      return true;
    } catch (error) {
      logError('GitHub publication failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private async publishToTelegram(publishContent: any): Promise<boolean> {
    const telegramEnabled = this.env.TELEGRAM_ENABLED?.toLowerCase() === 'true';

    if (!telegramEnabled) {
      return false;
    }

    if (!this.env.TELEGRAM_BOT_TOKEN || !this.env.TELEGRAM_CHANNEL_ID) {
      logWarn('Telegram publisher skipped: missing configuration', {
        hasToken: !!this.env.TELEGRAM_BOT_TOKEN,
        hasChannelId: !!this.env.TELEGRAM_CHANNEL_ID,
      });
      return false;
    }

    try {
      logInfo('Publishing to Telegram');
      const telegramPublisher = new TelegramPublisher();
      await telegramPublisher.publish(publishContent, {
        TELEGRAM_BOT_TOKEN: this.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHANNEL_ID: this.env.TELEGRAM_CHANNEL_ID,
      });
      logInfo('Telegram publication succeeded');
      return true;
    } catch (error) {
      logError('Telegram publication failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private async updatePublishedStatus(taskDate: string, results: { github: boolean; telegram: boolean; terminal: boolean }): Promise<void> {
    if (results.github || results.telegram || results.terminal) {
      await this.storage.updateTaskStatus(taskDate, 'published', {
        publishedAt: Date.now(),
      });
      logInfo('Task marked as published', { taskDate, results });
    } else {
      logWarn('No publishers succeeded', { taskDate });
    }
  }

  private mapArticlesToStories(completedArticles: any[]): ProcessedStory[] {
    return completedArticles.map((article) => ({
      rank: article.rank,
      storyId: article.story_id,
      titleEnglish: article.title_en,
      titleChinese: article.title_zh || article.title_en,
      url: article.url,
      score: article.score,
      time: formatTimestamp(article.published_time),
      timestamp: article.published_time,
      description: article.content_summary_zh || '暂无摘要',
      commentSummary: article.comment_summary_zh || null,
    }));
  }

  /**
   * Get current task progress
   * Returns progress information
   */
  async getTaskProgress(taskDate: string) {
    return this.storage.getTaskProgress(taskDate);
  }

  /**
   * Retry failed articles by resetting them to pending
   * Returns number of articles reset
   */
  async retryFailedArticles(taskDate: string, maxRetries: number = 3): Promise<number> {
    logInfo('Retrying failed articles', { taskDate, maxRetries });
    const count = await this.storage.retryFailedArticles(taskDate, maxRetries);
    logInfo('Failed articles reset to pending', { count });
    return count;
  }

  /**
   * Force publish partial results (skip failed articles)
   * Returns publication result
   */
  async forcePublish(taskDate: string): Promise<{ github: boolean; telegram: boolean }> {
    logInfo('Force publishing partial results', { taskDate });

    // Aggregate and publish whatever is completed
    const { markdown } = await this.aggregateResults(taskDate);
    const result = await this.publishResults(taskDate, markdown);

    // Get failed count for logging
    const failedArticles = await this.storage.getFailedArticles(taskDate);
    if (failedArticles.length > 0) {
      logWarn('Skipped failed articles in force publish', { count: failedArticles.length });
    }

    return result;
  }

  /**
   * Get batch statistics for a task
   * Returns array of batch records
   */
  async getBatchStatistics(taskDate: string) {
    return this.storage.getBatchStatistics(taskDate);
  }

  /**
   * Archive old tasks beyond retention period
   * Returns number of tasks archived
   */
  async archiveOldTasks(retentionDays: number = 30): Promise<number> {
    logInfo('Archiving old tasks', { retentionDays });
    const count = await this.storage.archiveOldTasks(retentionDays);
    logInfo('Old tasks archived', { count });
    return count;
  }
}

/**
 * Factory function to create TaskExecutor instance
 */
export function createTaskExecutor(env: Env): TaskExecutor {
  return new TaskExecutor(env);
}
