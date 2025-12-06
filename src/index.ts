import dotenv from 'dotenv';
import { fetchTopStories, HNStory, fetchCommentsBatch } from './api/hackerNews';
import { translator } from './services/translator';
import { fetchArticlesBatch } from './services/articleFetcher';
import { startWebServer, ProcessedStory as WebProcessedStory } from './server/app';
import { STORY_LIMITS, SUMMARY_CONFIG, ENV_DEFAULTS } from './config/constants';
import { checkCache, writeCache, isCacheEnabled, CachedStory } from './services/cache';

// Load environment variables from .env file
dotenv.config();

/**
 * Parse command-line arguments
 */
function parseArgs(): { webMode: boolean; noCache: boolean } {
  const args = process.argv.slice(2);
  return {
    webMode: args.includes('--web') || args.includes('-w'),
    noCache: args.includes('--no-cache') || args.includes('--refresh')
  };
}

interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
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
    const { webMode, noCache } = parseArgs();
    
    console.log('\n🔍 HackerNews Daily - Chinese Translation\n');
    
    if (webMode) {
      console.log('📺 Web mode enabled - will open in browser\n');
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
    if (webMode) {
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
  
  // Translate titles
  console.log('\nTranslating titles to Chinese...');
  const titles = stories.map(s => s.title);
  const translatedTitles = await translator.translateBatch(titles);
  
  // Fetch article details (includes full content extraction)
  console.log('\nFetching and extracting article content...');
  const urls = stories.map(s => s.url || `https://news.ycombinator.com/item?id=${s.id}`);
  const articleMetadata = await fetchArticlesBatch(urls);
  
  // Generate AI summaries or translate descriptions
  console.log('\nGenerating AI-powered summaries...');
  const fullContents = articleMetadata.map(meta => meta.fullContent);
  const metaDescriptions = articleMetadata.map(meta => meta.description);
  const summaries = await translator.summarizeBatch(fullContents, metaDescriptions, summaryMaxLength);
  
  // Fetch top comments for each story
  console.log('\nFetching top comments for each story...');
  const commentArrays = await fetchCommentsBatch(stories, 10);
  
  // Summarize comments
  console.log('\nSummarizing comments...');
  const commentSummaries = await translator.summarizeCommentsBatch(commentArrays);
  
  // Process stories with translations
  const processedStories: ProcessedStory[] = stories.map((story, index) => ({
    rank: index + 1,
    titleChinese: translatedTitles[index],
    titleEnglish: story.title,
    score: story.score,
    url: urls[index],
    time: formatTimestamp(story.time),
    description: summaries[index],
    commentSummary: commentSummaries[index],
  }));
  
  return processedStories;
}

/**
 * Format Unix timestamp to local datetime string (YYYY-MM-DD HH:mm)
 */
function formatTimestamp(unixTime: number): string {
  const date = new Date(unixTime * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Display stories in card-based format
 */
function displayCards(stories: ProcessedStory[]): void {
  const separator = '━'.repeat(60);
  
  for (const story of stories) {
    console.log(`#${story.rank} 【${story.titleChinese}】`);
    console.log(story.titleEnglish);
    console.log(`发布时间：${story.time}`);
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
    } else if (error.message.includes('Failed to fetch HackerNews')) {
      console.error('\n💡 Troubleshooting:');
      console.error('- Check your internet connection');
      console.error('- Verify that https://hacker-news.firebaseio.com is accessible');
      console.error('- Try again in a few moments\n');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Network error: Please check your internet connection\n');
    }
  } else {
    console.error('An unexpected error occurred');
    console.error(error);
  }
}

// Run the CLI
main();
