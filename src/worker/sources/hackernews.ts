/**
 * HackerNews Content Source
 * Fetches and processes HackerNews stories for daily export
 */

import { fetchTopStoriesByScore, fetchCommentsBatchFromAlgolia } from '../../api';
import { translator } from '../../services/translator';
import { buildProviderOptions, CreateProviderOptions } from '../../services/llm';
import { fetchArticlesBatch, ArticleMetadata } from '../../services/articleFetcher';
import { AIContentFilter } from '../../services/contentFilter';
import { generateMarkdownContent } from '../../services/markdownExporter';
import { logInfo, logError, logWarn, logMetrics } from '../logger';
import { LLM_BATCH_CONFIG } from '../../config/constants';
import { ProcessedStory } from '../../types/shared';
import { getPreviousDayBoundaries, formatTimestamp, formatDateForDisplay } from '../../utils/date';
import type { Env } from '../index';
import type { ContentSource, SourceContent, SourceConfig } from '../../types/source';

/**
 * Parse LLM batch size from environment variable
 * Returns 0 for no batching (process all at once), or a valid batch size
 */
function parseLLMBatchSize(envValue: string | undefined): number {
  const parsed = parseInt(envValue || String(LLM_BATCH_CONFIG.DEFAULT_BATCH_SIZE), 10);
  
  // 0 means no batching - process all items at once
  if (parsed === 0) {
    return 0;
  }
  
  // Apply min/max constraints only when they are set (> 0)
  let batchSize = parsed;
  if (LLM_BATCH_CONFIG.MIN_BATCH_SIZE > 0) {
    batchSize = Math.max(LLM_BATCH_CONFIG.MIN_BATCH_SIZE, batchSize);
  }
  if (LLM_BATCH_CONFIG.MAX_BATCH_SIZE > 0) {
    batchSize = Math.min(LLM_BATCH_CONFIG.MAX_BATCH_SIZE, batchSize);
  }
  
  return batchSize;
}

/**
 * Initialize translator service with LLM provider options from environment
 */
function initializeTranslator(env: Env): void {
  const providerOptions = buildProviderOptions(env);
  translator.init(providerOptions);
}

/**
 * Run the daily export pipeline
 * Returns the generated Markdown content and processed stories
 */
export async function runDailyExport(env: Env): Promise<{ markdown: string; dateStr: string; stories: ProcessedStory[] }> {
  const startTime = Date.now();
  const apiCalls: Record<string, number> = {};

  try {
    // Calculate previous day date range (UTC)
    const { start, end, date } = getPreviousDayBoundaries();
    const dateStr = formatDateForDisplay(date);
    
    logInfo('Daily export started', { date: dateStr, startTime: start, endTime: end });

    // Initialize translator with LLM provider options
    initializeTranslator(env);
    
    // Parse configuration
    const storyLimit = parseInt(env.HN_STORY_LIMIT || '30', 10);
    const summaryMaxLength = parseInt(env.SUMMARY_MAX_LENGTH || '300', 10);
    const enableContentFilter = env.ENABLE_CONTENT_FILTER === 'true';
    const llmBatchSize = parseLLMBatchSize(env.LLM_BATCH_SIZE);
    
    logInfo('Configuration loaded', { 
      storyLimit,
      summaryMaxLength,
      enableContentFilter,
      filterSensitivity: env.CONTENT_FILTER_SENSITIVITY,
      llmBatchSize
    });

    // Step 1: Fetch stories from HackerNews (best stories filtered by date and score)
    logInfo('Fetching stories from HackerNews API');
    apiCalls['hn_api'] = (apiCalls['hn_api'] || 0) + 1;
    
    const stories = await fetchTopStoriesByScore(storyLimit, start, end);
    
    if (stories.length === 0) {
      logWarn('No stories found for date', { date: dateStr });
      throw new Error(`No stories found for ${dateStr}`);
    }
    
    logInfo('Stories fetched', { count: stories.length });

    // Step 2: Apply content filter if enabled
    let filteredStories = stories;
    if (enableContentFilter) {
      logInfo('Applying content filter');
      
      // Create content filter with the same provider options as translator
      const contentFilterOptions = buildProviderOptions(env);
      const contentFilter = new AIContentFilter(contentFilterOptions);
      
      apiCalls['llm_filter'] = (apiCalls['llm_filter'] || 0) + 1;
      filteredStories = await contentFilter.filterStories(stories);
      
      const removedCount = stories.length - filteredStories.length;
      logInfo('Content filter applied', { 
        original: stories.length, 
        filtered: filteredStories.length,
        removed: removedCount
      });
    }

    // Step 3: Fetch article content via Crawler API
    logInfo('Fetching article content via Crawler API');
    const urls = filteredStories.map(story => story.url).filter((url): url is string => !!url);
    
    const articleMetadata = await fetchArticlesBatch(urls);
    
    // Count crawler API calls
    const crawlerCalls = articleMetadata.filter(m => m.fullContent !== null).length;
    apiCalls['crawler_api'] = (apiCalls['crawler_api'] || 0) + crawlerCalls;
    
    // Create metadata map for quick lookup
    const metadataMap = new Map<string, ArticleMetadata>();
    articleMetadata.forEach(meta => {
      metadataMap.set(meta.url, meta);
    });

    // Step 4: Fetch comments for all stories using Algolia (optimized)
    logInfo('Fetching comments from Algolia');
    apiCalls['algolia_comments'] = (apiCalls['algolia_comments'] || 0) + filteredStories.length;
    const commentsArrays = await fetchCommentsBatchFromAlgolia(filteredStories, 10);

    // Step 5: Process stories with AI (OPTIMIZED with batch processing)
    logInfo('Processing stories with AI (batch mode)');
    const processedStories: ProcessedStory[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
      // Phase 1: Collect all data for batch processing
      logInfo('Phase 1: Collecting data for batch processing');
      const titles: string[] = [];
      const contents: (string | null)[] = [];
      const metaDescriptions: (string | null)[] = [];
      
      for (let i = 0; i < filteredStories.length; i++) {
        const story = filteredStories[i];
        const metadata = story.url ? metadataMap.get(story.url) : null;
        
        titles.push(story.title);
        contents.push(metadata?.fullContent || null);
        metaDescriptions.push(metadata?.description || null);
      }

      // Phase 2: Batch translate/summarize everything
      logInfo('Phase 2: Batch AI processing');
      
      // Batch translate titles (30 titles -> 3 requests instead of 30)
      logInfo('Batch translating titles');
      apiCalls['deepseek_translate'] = (apiCalls['deepseek_translate'] || 0) + Math.ceil(titles.length / llmBatchSize);
      const translatedTitles = await translator.translateTitlesBatch(titles, llmBatchSize);
      
      // Batch summarize contents (30 contents -> 3 requests instead of 30)
      logInfo('Batch summarizing contents');
      apiCalls['deepseek_summarize'] = (apiCalls['deepseek_summarize'] || 0) + Math.ceil(contents.filter(c => c).length / llmBatchSize);
      const contentSummaries = await translator.summarizeContentBatch(contents, summaryMaxLength, llmBatchSize);
      
      // For stories without content, translate meta descriptions
      logInfo('Processing descriptions');
      const descriptions: string[] = [];
      for (let i = 0; i < filteredStories.length; i++) {
        if (contentSummaries[i]) {
          descriptions.push(contentSummaries[i]);
        } else {
          const translated = await translator.translateDescription(metaDescriptions[i]);
          descriptions.push(translated);
        }
      }
      
      // Batch summarize comments (30 comment arrays -> 3 requests instead of 30)
      logInfo('Batch summarizing comments');
      apiCalls['deepseek_comments'] = (apiCalls['deepseek_comments'] || 0) + Math.ceil(commentsArrays.filter(c => c.length >= 3).length / llmBatchSize);
      const commentSummaries = await translator.summarizeCommentsBatch(commentsArrays, llmBatchSize);

      // Phase 3: Assemble processed stories
      logInfo('Phase 3: Assembling results');
      for (let i = 0; i < filteredStories.length; i++) {
        const story = filteredStories[i];
        
        try {
          processedStories.push({
            rank: i + 1,
            titleChinese: translatedTitles[i] ?? story.title,
            titleEnglish: story.title,
            score: story.score,
            url: story.url ?? '',
            time: formatTimestamp(story.time, true),
            timestamp: story.time,
            description: descriptions[i] || '暂无描述',
            commentSummary: commentSummaries[i] || '暂无评论',
          });
          
          successCount++;
        } catch (error) {
          failCount++;
          logError(`Failed to assemble story ${story.id}`, error, { 
            storyId: story.id,
            title: story.title 
          });
          // Continue with other stories (graceful degradation)
        }
      }
    } catch (error) {
      // If batch processing fails entirely, log the error
      logError('Batch processing failed', error);
      failCount = filteredStories.length;
    }

    logInfo('Story processing completed', { 
      success: successCount, 
      failed: failCount,
      total: filteredStories.length 
    });

    if (processedStories.length === 0) {
      throw new Error('All stories failed processing');
    }

    // Step 6: Generate Markdown file
    logInfo('Generating Markdown content');
    const markdown = generateMarkdownContent(processedStories, date);

    // Log metrics
    const duration = Date.now() - startTime;
    logMetrics({
      storiesFetched: stories.length,
      storiesProcessed: successCount,
      storiesFailed: failCount,
      duration,
      apiCalls,
    });

    logInfo('Daily export completed successfully', { 
      storiesExported: processedStories.length,
      duration: `${(duration / 1000).toFixed(1)}s`
    });

    return { markdown, dateStr, stories: processedStories };
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Daily export failed', error, { duration });
    
    logMetrics({
      storiesFetched: 0,
      storiesProcessed: 0,
      storiesFailed: 0,
      duration,
      apiCalls,
    });

    throw error;
  }
}

/**
 * HackerNews ContentSource implementation
 * Implements the ContentSource interface for extensibility
 */
export class HackerNewsSource implements ContentSource {
  readonly name = 'hackernews';
  
  /**
   * Fetch HackerNews content for a specific date
   * @param date - Target date (typically previous day)
   * @param config - Configuration from Env
   */
  async fetchContent(date: Date, config: SourceConfig): Promise<SourceContent> {
    const env = config as Env;
    const result = await runDailyExport(env);
    
    return {
      markdown: result.markdown,
      dateStr: result.dateStr,
      stories: result.stories,
      metadata: {
        source: 'hackernews',
        date: result.dateStr,
      },
    };
  }
}
