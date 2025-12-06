import dotenv from 'dotenv';
import { fetchTopStories, HNStory } from './api/hackerNews';
import { translator } from './services/translator';
import { fetchArticlesBatch } from './services/articleFetcher';

// Load environment variables from .env file
dotenv.config();

interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
  description: string;
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  try {
    console.log('\n🔍 HackerNews Daily - Chinese Translation\n');
    
    // Validate configuration
    console.log('Validating configuration...');
    translator.init();
    
    // Get configuration from environment
    const storyLimit = parseInt(process.env.HN_STORY_LIMIT || '30', 10);
    const timeWindowHours = parseInt(process.env.HN_TIME_WINDOW_HOURS || '24', 10);
    
    // Fetch stories from HackerNews
    const stories = await fetchTopStories(storyLimit, timeWindowHours);
    
    if (stories.length === 0) {
      console.log('\n⚠️  No stories found in the specified time window.');
      console.log('Try increasing HN_TIME_WINDOW_HOURS or HN_STORY_LIMIT in your .env file.');
      return;
    }
    
    // Translate titles
    console.log('\nTranslating titles to Chinese...');
    const titles = stories.map(s => s.title);
    const translatedTitles = await translator.translateBatch(titles);
    
    // Fetch article descriptions
    console.log('\nFetching article details...');
    const urls = stories.map(s => s.url || `https://news.ycombinator.com/item?id=${s.id}`);
    const articleMetadata = await fetchArticlesBatch(urls);
    
    // Translate descriptions
    console.log('\nTranslating descriptions to Chinese...');
    const descriptions = articleMetadata.map(meta => meta.description);
    const translatedDescriptions = await translator.translateDescriptionsBatch(descriptions);
    
    // Process stories with translations
    const processedStories: ProcessedStory[] = stories.map((story, index) => ({
      rank: index + 1,
      titleChinese: translatedTitles[index],
      titleEnglish: story.title,
      score: story.score,
      url: urls[index],
      time: formatTimestamp(story.time),
      description: translatedDescriptions[index],
    }));
    
    // Display results
    console.log('\nRendering results...\n');
    displayCards(processedStories);
    
    console.log(`\n✅ Successfully fetched and translated ${stories.length} stories\n`);
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
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
