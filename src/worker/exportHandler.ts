/**
 * Export handler for Cloudflare Worker
 * Orchestrates the daily HackerNews export pipeline
 */

import { fetchTopStoriesByScore, fetchCommentsBatch, HNStory } from '../api/hackerNews';
import { translator } from '../services/translator';
import { fetchArticlesBatch, ArticleMetadata } from '../services/articleFetcher';
import { AIContentFilter } from '../services/contentFilter';
import { generateMarkdownContent, generateFilename, formatDateForDisplay } from '../services/markdownExporter';
import { logInfo, logError, logWarn, logMetrics } from './logger';
import type { Env } from './index';

interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
  timestamp: number;
  description: string;
  commentSummary: string | null;
}

/**
 * Get the date boundaries for the previous calendar day (yesterday) in UTC
 */
function getPreviousDayBoundaries(): { start: number; end: number; date: Date } {
  const now = new Date();
  
  // Create date for yesterday in UTC
  const yesterday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 1
  ));
  
  // Set to start of day (00:00:00) in UTC
  const startOfDay = new Date(Date.UTC(
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
    0, 0, 0, 0
  ));
  
  // Set to end of day (23:59:59.999) in UTC
  const endOfDay = new Date(Date.UTC(
    yesterday.getUTCFullYear(),
    yesterday.getUTCMonth(),
    yesterday.getUTCDate(),
    23, 59, 59, 999
  ));
  
  return {
    start: Math.floor(startOfDay.getTime() / 1000), // Unix timestamp in seconds
    end: Math.floor(endOfDay.getTime() / 1000),     // Unix timestamp in seconds
    date: yesterday // UTC date for display
  };
}

/**
 * Format timestamp as human-readable date
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toISOString().replace('T', ' ').split('.')[0] + ' UTC';
}

/**
 * Initialize translator service with API key from environment
 */
function initializeTranslator(apiKey: string): void {
  translator.init(apiKey);
}

/**
 * Run the daily export pipeline
 * Returns the generated Markdown content
 */
export async function runDailyExport(env: Env): Promise<{ markdown: string; dateStr: string }> {
  const startTime = Date.now();
  const apiCalls: Record<string, number> = {};

  try {
    // Calculate previous day date range (UTC)
    const { start, end, date } = getPreviousDayBoundaries();
    const dateStr = formatDateForDisplay(date);
    
    logInfo('Daily export started', { date: dateStr, startTime: start, endTime: end });

    // Initialize translator with API key
    initializeTranslator(env.DEEPSEEK_API_KEY);
    
    // Parse configuration
    const storyLimit = parseInt(env.HN_STORY_LIMIT || '30', 10);
    const summaryMaxLength = parseInt(env.SUMMARY_MAX_LENGTH || '300', 10);
    const enableContentFilter = env.ENABLE_CONTENT_FILTER === 'true';
    
    logInfo('Configuration loaded', { 
      storyLimit,
      summaryMaxLength,
      enableContentFilter,
      filterSensitivity: env.CONTENT_FILTER_SENSITIVITY 
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
      
      const contentFilter = new AIContentFilter(translator, env.DEEPSEEK_API_KEY);
      
      apiCalls['deepseek_filter'] = (apiCalls['deepseek_filter'] || 0) + 1;
      filteredStories = await contentFilter.filterStories(stories);
      
      const removedCount = stories.length - filteredStories.length;
      logInfo('Content filter applied', { 
        original: stories.length, 
        filtered: filteredStories.length,
        removed: removedCount
      });
    }

    // Step 3: Fetch article content
    logInfo('Fetching article content');
    const urls = filteredStories.map(story => story.url).filter((url): url is string => !!url);
    
    apiCalls['crawler_api'] = (apiCalls['crawler_api'] || 0) + urls.length;
    const articleMetadata = await fetchArticlesBatch(urls);
    
    // Create metadata map for quick lookup
    const metadataMap = new Map<string, ArticleMetadata>();
    articleMetadata.forEach(meta => {
      metadataMap.set(meta.url, meta);
    });

    // Step 4: Fetch comments for all stories
    logInfo('Fetching comments');
    apiCalls['hn_comments'] = (apiCalls['hn_comments'] || 0) + filteredStories.length;
    const commentsArrays = await fetchCommentsBatch(filteredStories, 10);

    // Step 5: Process stories (translate, summarize)
    logInfo('Processing stories with AI');
    const processedStories: ProcessedStory[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < filteredStories.length; i++) {
      const story = filteredStories[i];
      const comments = commentsArrays[i] || [];
      
      try {
        // Get metadata
        const metadata = story.url ? metadataMap.get(story.url) : null;
        const fullContent = metadata?.fullContent || null;
        const metaDescription = metadata?.description || null;

        // Translate title
        apiCalls['deepseek_translate'] = (apiCalls['deepseek_translate'] || 0) + 1;
        const translatedTitle = await translator.translateTitle(story.title);

        // Generate/translate summary
        let description: string;
        if (fullContent) {
          apiCalls['deepseek_summarize'] = (apiCalls['deepseek_summarize'] || 0) + 1;
          const aiSummary = await translator.summarizeContent(fullContent, summaryMaxLength);
          description = aiSummary || await translator.translateDescription(metaDescription);
        } else {
          description = await translator.translateDescription(metaDescription);
        }

        // Summarize comments (if available)
        let commentSummary: string | null = null;
        if (comments.length >= 3) {
          apiCalls['deepseek_comments'] = (apiCalls['deepseek_comments'] || 0) + 1;
          commentSummary = await translator.summarizeComments(comments);
        }

        processedStories.push({
          rank: i + 1,
          titleChinese: translatedTitle,
          titleEnglish: story.title,
          score: story.score,
          url: story.url || '',
          time: formatTimestamp(story.time),
          timestamp: story.time,
          description,
          commentSummary,
        });

        successCount++;
      } catch (error) {
        failCount++;
        logError(`Failed to process story ${story.id}`, error, { 
          storyId: story.id,
          title: story.title 
        });
        // Continue with other stories (graceful degradation)
      }
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

    return { markdown, dateStr };
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
