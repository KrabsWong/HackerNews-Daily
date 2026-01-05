import type { ArticleMetadata } from '../../types/content';
import { fetchWithCrawlerAPI } from './crawler';

/**
 * Fetch article metadata using Crawler API
 * Returns content and description extracted by the crawler service
 * @param url - Article URL to fetch
 * @param crawlerApiUrl - Crawler API base URL (from env.CRAWLER_API_URL)
 */
export async function fetchArticleMetadata(
  url: string,
  crawlerApiUrl?: string
): Promise<ArticleMetadata> {
  const { content, description } = await fetchWithCrawlerAPI(url, crawlerApiUrl);

  return {
    url,
    description,
    fullContent: content,
  };
}

/**
 * Fetch metadata for multiple articles SERIALLY (one at a time)
 * Serial processing avoids overwhelming the crawler service
 * All content is fetched via Crawler API for richer, more complete data
 * @param urls - Array of URLs to fetch
 * @param crawlerApiUrl - Crawler API base URL (from env.CRAWLER_API_URL)
 */
export async function fetchArticlesBatch(
  urls: string[],
  crawlerApiUrl?: string
): Promise<ArticleMetadata[]> {
  console.log(
    `🔍 CRAWLER_API_URL: ${
      crawlerApiUrl
        ? 'CONFIGURED: ' + crawlerApiUrl.substring(0, 30) + '...'
        : 'NOT CONFIGURED'
    }`
  );

  const results: ArticleMetadata[] = [];
  const total = urls.length;

  console.log(`\n📦 Fetching ${total} articles via Crawler API...\n`);

  let successCount = 0;
  let emptyCount = 0;

  for (let i = 0; i < total; i++) {
    const url = urls[i];
    const progress = `[${i + 1}/${total}]`;

    console.log(`${progress} ${url}`);

    if (crawlerApiUrl) {
      const result = await fetchArticleMetadata(url, crawlerApiUrl);
      results.push(result);

      if (result.fullContent) {
        successCount++;
        console.log(`${progress} ✅ Crawler API (${result.fullContent.length} chars)\n`);
      } else {
        emptyCount++;
        console.log(`${progress} ⚠️  No content\n`);
      }
    } else {
      // No crawler configured
      results.push({
        url,
        description: null,
        fullContent: null,
      });
      emptyCount++;
      console.log(`${progress} ⚠️  No content (crawler disabled)\n`);
    }
  }

  console.log(`\n✅ Completed ${total} articles`);
  console.log(`   📊 Results: ${successCount} success | ${emptyCount} empty\n`);

  return results;
}
