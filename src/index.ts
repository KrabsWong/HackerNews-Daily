import dotenv from 'dotenv';

// Load environment variables FIRST before importing anything that uses them
dotenv.config();

import { fetchTopStories, HNStory, fetchCommentsBatch } from './api/hackerNews';
import { translator } from './services/translator';
import { fetchArticlesBatch } from './services/articleFetcher';
import { startWebServer, ProcessedStory as WebProcessedStory } from './server/app';
import { STORY_LIMITS, SUMMARY_CONFIG, ENV_DEFAULTS, CONTENT_FILTER } from './config/constants';
import { checkCache, writeCache, isCacheEnabled, CachedStory } from './services/cache';
import { AIContentFilter } from './services/contentFilter';
import {
  generateMarkdownContent,
  ensureDirectoryExists,
  generateFilename,
  formatDateForDisplay,
  writeMarkdownFile
} from './services/markdownExporter';

/**
 * Beijing timezone offset in hours (UTC+8)
 */
const BEIJING_TIMEZONE_OFFSET = 8;

/**
 * Convert a Date object to Beijing timezone
 * @param date - Date object in any timezone
 * @returns New Date object adjusted to Beijing time
 */
function toBeijingTime(date: Date): Date {
  // Get UTC time in milliseconds
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  // Add Beijing offset (UTC+8)
  return new Date(utcTime + (3600000 * BEIJING_TIMEZONE_OFFSET));
}

/**
 * Get current time in Beijing timezone
 * @returns Date object representing current Beijing time
 */
function getBeijingNow(): Date {
  return toBeijingTime(new Date());
}

/**
 * Convert Unix timestamp to Beijing time string
 * @param unixTime - Unix timestamp in seconds
 * @returns Formatted string in Beijing time (YYYY-MM-DD HH:mm)
 */
function formatTimestampBeijing(unixTime: number): string {
  const date = new Date(unixTime * 1000);
  const beijingDate = toBeijingTime(date);
  
  const year = beijingDate.getFullYear();
  const month = String(beijingDate.getMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getDate()).padStart(2, '0');
  const hours = String(beijingDate.getHours()).padStart(2, '0');
  const minutes = String(beijingDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Parse command-line arguments
 */
function parseArgs(): { webMode: boolean; noCache: boolean; exportDailyMode: boolean } {
  const args = process.argv.slice(2);
  return {
    webMode: args.includes('--web') || args.includes('-w'),
    noCache: args.includes('--no-cache') || args.includes('--refresh'),
    exportDailyMode: args.includes('--export-daily')
  };
}

/**
 * Get the date boundaries for the previous calendar day (yesterday) in Beijing timezone
 * Returns start (00:00:00) and end (23:59:59) timestamps in Unix seconds
 * All calculations are done in Beijing time (UTC+8)
 */
function getPreviousDayBoundaries(): { start: number; end: number; date: Date } {
  // Get current Beijing time
  const nowBeijing = getBeijingNow();
  
  // Create date for yesterday in Beijing timezone
  const yesterdayBeijing = new Date(nowBeijing);
  yesterdayBeijing.setDate(yesterdayBeijing.getDate() - 1);
  
  // Set to start of day (00:00:00) in Beijing time
  const startOfDay = new Date(yesterdayBeijing);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Set to end of day (23:59:59.999) in Beijing time
  const endOfDay = new Date(yesterdayBeijing);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Convert Beijing time back to UTC for Unix timestamps
  // Subtract 8 hours to get UTC time
  const startUTC = startOfDay.getTime() - (BEIJING_TIMEZONE_OFFSET * 3600000);
  const endUTC = endOfDay.getTime() - (BEIJING_TIMEZONE_OFFSET * 3600000);
  
  return {
    start: Math.floor(startUTC / 1000), // Unix timestamp in seconds (UTC)
    end: Math.floor(endUTC / 1000),     // Unix timestamp in seconds (UTC)
    date: yesterdayBeijing // Beijing date for display
  };
}

/**
 * Filter stories by date range (Unix timestamps)
 */
function filterStoriesByDateRange(stories: ProcessedStory[], startTime: number, endTime: number): ProcessedStory[] {
  return stories.filter(story => story.timestamp >= startTime && story.timestamp <= endTime);
}

interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
  timestamp: number; // Unix timestamp for filtering and sorting
  description: string;
  commentSummary: string | null; // AI summary of top comments
}

/**
 * Validate and cap the story limit to prevent performance issues
 * @param requested - The requested story limit from environment variable
 * @returns The validated limit (capped at MAX_STORY_LIMIT if necessary)
 */
function validateStoryLimit(requested: number): number {
  // Handle invalid inputs (NaN, negative, zero)
  if (isNaN(requested) || requested <= 0) {
    console.warn(`⚠️  Invalid story limit (${requested}). Using default of ${STORY_LIMITS.MAX_STORY_LIMIT} stories.`);
    return STORY_LIMITS.MAX_STORY_LIMIT;
  }
  
  // Check if requested limit exceeds warning threshold
  if (requested >= STORY_LIMITS.WARN_THRESHOLD) {
    console.warn(`⚠️  Requested story limit (${requested}) exceeds maximum supported limit. Using ${STORY_LIMITS.MAX_STORY_LIMIT} stories instead.`);
    return STORY_LIMITS.MAX_STORY_LIMIT;
  }
  
  // Accept limit if within safe range
  return requested;
}

/**
 * Validate and cap the summary length to ensure quality summaries
 * @param requested - The requested summary length from environment variable
 * @returns The validated length (capped within MIN_SUMMARY_LENGTH and MAX_SUMMARY_LENGTH)
 */
function validateSummaryLength(requested: number): number {
  // Handle invalid inputs (NaN, negative, zero)
  if (isNaN(requested) || requested <= 0) {
    console.warn(`⚠️  Invalid SUMMARY_MAX_LENGTH (${requested}). Using default of ${SUMMARY_CONFIG.DEFAULT_LENGTH} characters.`);
    return SUMMARY_CONFIG.DEFAULT_LENGTH;
  }
  
  // Check if too short
  if (requested < SUMMARY_CONFIG.MIN_LENGTH) {
    console.warn(`⚠️  SUMMARY_MAX_LENGTH too short (${requested}). Using minimum of ${SUMMARY_CONFIG.MIN_LENGTH} characters.`);
    return SUMMARY_CONFIG.MIN_LENGTH;
  }
  
  // Check if too long
  if (requested > SUMMARY_CONFIG.MAX_LENGTH) {
    console.warn(`⚠️  SUMMARY_MAX_LENGTH too large (${requested}). Capping at ${SUMMARY_CONFIG.MAX_LENGTH} characters.`);
    return SUMMARY_CONFIG.MAX_LENGTH;
  }
  
  // Accept length if within valid range
  return requested;
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    // Parse command-line arguments
    const { webMode, noCache, exportDailyMode } = parseArgs();
    
    console.log('\n🔍 HackerNews Daily - Chinese Translation\n');
    
    if (webMode) {
      console.log('📺 Web mode enabled - will open in browser\n');
    }
    
    if (exportDailyMode) {
      console.log('📄 Export mode enabled - exporting yesterday\'s articles\n');
    }
    
    // Get configuration from environment
    const requestedLimit = parseInt(process.env.HN_STORY_LIMIT || String(ENV_DEFAULTS.HN_STORY_LIMIT), 10);
    const storyLimit = validateStoryLimit(requestedLimit);
    const timeWindowHours = parseInt(process.env.HN_TIME_WINDOW_HOURS || String(ENV_DEFAULTS.HN_TIME_WINDOW_HOURS), 10);
    const requestedSummaryLength = parseInt(process.env.SUMMARY_MAX_LENGTH || String(ENV_DEFAULTS.SUMMARY_MAX_LENGTH), 10);
    const summaryMaxLength = validateSummaryLength(requestedSummaryLength);
    
    // Cache configuration
    const cacheConfig = {
      storyLimit,
      timeWindowHours,
      summaryMaxLength,
      contentFilterEnabled: CONTENT_FILTER.ENABLED,
      contentFilterSensitivity: CONTENT_FILTER.SENSITIVITY,
    };
    
    // Check cache first (unless --no-cache flag is set)
    let processedStories: ProcessedStory[];
    
    if (!noCache && isCacheEnabled()) {
      const cacheResult = checkCache(cacheConfig);
      
      if (cacheResult.hit && cacheResult.stories) {
        // Use cached data
        processedStories = cacheResult.stories;
      } else {
        // Cache miss - fetch fresh data
        if (cacheResult.reason) {
          console.log(`📭 ${cacheResult.reason}`);
        }
        processedStories = await fetchFreshData(storyLimit, timeWindowHours, summaryMaxLength);
        
        // Save to cache
        writeCache(processedStories, cacheConfig);
      }
    } else {
      // Cache disabled or --no-cache flag
      if (noCache) {
        console.log('🔄 Cache bypassed (--no-cache flag)\n');
      }
      processedStories = await fetchFreshData(storyLimit, timeWindowHours, summaryMaxLength);
      
      // Save to cache (if enabled)
      if (isCacheEnabled()) {
        writeCache(processedStories, cacheConfig);
      }
    }
    
    // Display results based on mode
    if (exportDailyMode) {
      // Export mode - filter by previous calendar day and export to markdown
      const { start, end, date } = getPreviousDayBoundaries();
      const filteredStories = filterStoriesByDateRange(processedStories, start, end);
      
      if (filteredStories.length === 0) {
        const dateStr = formatDateForDisplay(date);
        console.log(`\n⚠️  No stories found for ${dateStr}\n`);
        return;
      }
      
      // Sort by timestamp descending (newest first)
      const sortedStories = [...filteredStories].sort((a, b) => b.timestamp - a.timestamp);
      
      // Re-rank after filtering and sorting
      const rerankedStories = sortedStories.map((story, index) => ({
        ...story,
        rank: index + 1
      }));
      
      // Generate markdown content
      const markdownContent = generateMarkdownContent(rerankedStories, date);
      
      // Ensure directory exists
      const exportDir = 'hacknews-export';
      await ensureDirectoryExists(exportDir);
      
      // Generate filename
      const filename = generateFilename(date);
      
      // Write to file
      await writeMarkdownFile(markdownContent, filename, exportDir);
      
      const filePath = `${exportDir}/${filename}`;
      console.log(`\n✅ Successfully exported ${rerankedStories.length} stories to ${filePath}\n`);
    } else if (webMode) {
      console.log('\nStarting web server...\n');
      await startWebServer(processedStories);
      // Keep process alive for web server
      console.log('Press Ctrl+C to stop the server');
    } else {
      // CLI mode - display in terminal
      console.log('\nRendering results...\n');
      displayCards(processedStories);
      console.log(`\n✅ Successfully displayed ${processedStories.length} stories\n`);
    }
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}

/**
 * Fetch fresh data from APIs (HackerNews + DeepSeek)
 */
async function fetchFreshData(
  storyLimit: number,
  timeWindowHours: number,
  summaryMaxLength: number
): Promise<ProcessedStory[]> {
  // Validate configuration
  console.log('Validating configuration...');
  translator.init();
  
  // Initialize content filter
  const contentFilter = new AIContentFilter(translator);
  
  // Display fetch parameters
  console.log(`Fetching up to ${storyLimit} stories from the past ${timeWindowHours} hours...`);
  
  // Fetch stories from HackerNews
  const stories = await fetchTopStories(storyLimit, timeWindowHours);
  
  if (stories.length === 0) {
    console.log('\n⚠️  No stories found in the specified time window.');
    console.log('Try increasing HN_TIME_WINDOW_HOURS or HN_STORY_LIMIT in your .env file.');
    return [];
  }
  
  // Check if result count is significantly lower than requested
  if (stories.length < storyLimit * 0.5) {
    console.log(`\n⚠️  Only ${stories.length} stories found (requested ${storyLimit}).`);
    console.log(`Try increasing HN_TIME_WINDOW_HOURS in your .env file for more results.\n`);
  }
  
  // Apply content filter (if enabled)
  let filteredStories = stories;
  if (contentFilter.isEnabled()) {
    console.log('\nApplying AI content filter...');
    filteredStories = await contentFilter.filterStories(stories);
    
    const filteredCount = stories.length - filteredStories.length;
    if (filteredCount > 0) {
      console.log(`Filtered ${filteredCount} stories based on content policy`);
    }
  }
  
  // Use filtered stories for all downstream processing
  const storiesToProcess = filteredStories;
  
  // Translate titles
  console.log('\nTranslating titles to Chinese...');
  const titles = storiesToProcess.map(s => s.title);
  const translatedTitles = await translator.translateBatch(titles);
  
  // Fetch article details (includes full content extraction)
  console.log('\nFetching and extracting article content...');
  const urls = storiesToProcess.map(s => s.url || `https://news.ycombinator.com/item?id=${s.id}`);
  const articleMetadata = await fetchArticlesBatch(urls);
  
  // Generate AI summaries or translate descriptions
  console.log('\nGenerating AI-powered summaries...');
  const fullContents = articleMetadata.map(meta => meta.fullContent);
  const metaDescriptions = articleMetadata.map(meta => meta.description);
  const summaries = await translator.summarizeBatch(fullContents, metaDescriptions, summaryMaxLength);
  
  // Fetch top comments for each story
  console.log('\nFetching top comments for each story...');
  const commentArrays = await fetchCommentsBatch(storiesToProcess, 10);
  
  // Summarize comments
  console.log('\nSummarizing comments...');
  const commentSummaries = await translator.summarizeCommentsBatch(commentArrays);
  
  // Process stories with translations
  const processedStories: ProcessedStory[] = storiesToProcess.map((story, index) => ({
    rank: index + 1,
    titleChinese: translatedTitles[index],
    titleEnglish: story.title,
    score: story.score,
    url: urls[index],
    time: formatTimestamp(story.time),
    timestamp: story.time, // Add Unix timestamp for filtering and sorting
    description: summaries[index],
    commentSummary: commentSummaries[index],
  }));
  
  return processedStories;
}

/**
 * Format Unix timestamp to Beijing time string (YYYY-MM-DD HH:mm)
 * @param unixTime - Unix timestamp in seconds
 * @returns Formatted string in Beijing timezone
 */
function formatTimestamp(unixTime: number): string {
  return formatTimestampBeijing(unixTime);
}

/**
 * Display stories in card-based format
 */
function displayCards(stories: ProcessedStory[]): void {
  const separator = '━'.repeat(60);
  
  for (const story of stories) {
    console.log(`#${story.rank} 【${story.titleChinese}】`);
    console.log(story.titleEnglish);
    console.log(`发布时间：${story.time}  |  评分：${story.score}`);
    console.log(`链接：${story.url}`);
    console.log(`描述：${story.description}`);
    
    // Display comment summary if available
    if (story.commentSummary) {
      console.log(`评论要点：${story.commentSummary}`);
    }
    
    console.log(separator);
  }
}

/**
 * Handle and display errors with helpful messages
 */
function handleError(error: unknown): void {
  console.error('\n❌ Error occurred:\n');
  
  if (error instanceof Error) {
    console.error(error.message);
    
    // Provide helpful hints for common errors
    if (error.message.includes('DEEPSEEK_API_KEY')) {
      console.error('\n💡 Setup instructions:');
      console.error('1. Copy .env.example to .env: cp .env.example .env');
      console.error('2. Get your API key from https://platform.deepseek.com/');
      console.error('3. Add your key to .env: DEEPSEEK_API_KEY=your_key_here\n');
    } else if (error.message.includes('Failed to fetch') && error.message.includes('Algolia')) {
      console.error('\n💡 Troubleshooting:');
      console.error('- Check your internet connection');
      console.error('- Verify that https://hn.algolia.com is accessible');
      console.error('- Try again in a few moments\n');
    } else if (error.message.includes('rate limit')) {
      console.error('\n💡 API Rate Limit:');
      console.error('- Algolia API rate limit exceeded');
      console.error('- Wait a few minutes before trying again');
      console.error('- Consider reducing HN_STORY_LIMIT in your .env file\n');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Network error: Please check your internet connection\n');
    } else if (error.message.includes('Permission denied') || error.message.includes('EACCES')) {
      console.error('\n💡 Export error troubleshooting:');
      console.error('- Check directory write permissions');
      console.error('- Ensure hacknews-export/ directory is not write-protected');
      console.error('- Try running with appropriate permissions\n');
    } else if (error.message.includes('No space left') || error.message.includes('ENOSPC')) {
      console.error('\n💡 Disk space error:');
      console.error('- Free up disk space');
      console.error('- Check available storage on your device\n');
    } else if (error.message.includes('Failed to create directory') || error.message.includes('Failed to write file')) {
      console.error('\n💡 File system error:');
      console.error('- Verify you have write permissions');
      console.error('- Check that the path is valid');
      console.error('- Ensure sufficient disk space is available\n');
    }
  } else {
    console.error('An unexpected error occurred');
    console.error(error);
  }
}

// Run the CLI
main();
