import dotenv from 'dotenv';
import Table from 'cli-table3';
import { fetchTopStories, HNStory } from './api/hackerNews';
import { translator } from './services/translator';

// Load environment variables from .env file
dotenv.config();

interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
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
    
    // Process stories with translations
    const processedStories: ProcessedStory[] = stories.map((story, index) => ({
      rank: index + 1,
      titleChinese: translatedTitles[index],
      titleEnglish: story.title,
      score: story.score,
      url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
    }));
    
    // Display results
    console.log('\nRendering results...\n');
    displayTable(processedStories);
    
    console.log(`\n✅ Successfully fetched and translated ${stories.length} stories\n`);
  } catch (error) {
    handleError(error);
    process.exit(1);
  }
}

/**
 * Display stories in a formatted table
 */
function displayTable(stories: ProcessedStory[]): void {
  const table = new Table({
    head: ['Rank', 'Title (Chinese)', 'Title (English)', 'Score', 'URL'],
    colWidths: [6, 40, 40, 7, 50],
    wordWrap: true,
    style: {
      head: ['cyan', 'bold'],
      border: ['gray'],
    },
  });
  
  for (const story of stories) {
    table.push([
      story.rank.toString(),
      story.titleChinese,
      story.titleEnglish,
      story.score.toString(),
      story.url,
    ]);
  }
  
  console.log(table.toString());
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
