import type { ArticleMetadata } from '../../types/content';
import { CrawlerProviderType } from '../../config/constants';
import { fetchWithCrawlerAPI } from './crawler';
import { fetchWithJinaAPI } from './jina';

/**
 * Fetch article metadata using configured crawler provider
 * Returns content and description extracted by the selected service
 * @param url - Article URL to fetch
 * @param provider - Crawler provider to use ('crawler' or 'jina')
 * @param crawlerApiUrl - Full crawler endpoint URL (required when provider='crawler')
 * @param crawlerApiToken - Optional Bearer token for authentication (used when provider='crawler')
 */
export async function fetchArticleMetadata(
  url: string,
  provider: CrawlerProviderType,
  crawlerApiUrl?: string,
  crawlerApiToken?: string
): Promise<ArticleMetadata> {
  let content: string | null = null;
  let description: string | null = null;

  if (provider === CrawlerProviderType.JINA) {
    const result = await fetchWithJinaAPI(url);
    content = result.content;
    description = result.description;
  } else {
    // Default to crawler API
    const result = await fetchWithCrawlerAPI(url, crawlerApiUrl, crawlerApiToken);
    content = result.content;
    description = result.description;
  }

  return {
    url,
    description,
    fullContent: content,
  };
}

/**
 * Fetch metadata for multiple articles SERIALLY (one at a time)
 * Serial processing avoids overwhelming the crawler service
 * @param urls - Array of URLs to fetch
 * @param provider - Crawler provider to use ('crawler' or 'jina')
 * @param crawlerApiUrl - Full crawler endpoint URL (required when provider='crawler')
 * @param crawlerApiToken - Optional Bearer token for authentication (used when provider='crawler')
 */
export async function fetchArticlesBatch(
  urls: string[],
  provider: CrawlerProviderType,
  crawlerApiUrl?: string,
  crawlerApiToken?: string
): Promise<ArticleMetadata[]> {
  const isJina = provider === CrawlerProviderType.JINA;
  const providerName = isJina ? 'jina.ai' : 'Crawler API';

  if (isJina) {
    console.log(`🔍 Using jina.ai Reader API (zero-setup crawler)`);
  } else {
    console.log(
      `🔍 CRAWLER_API_URL: ${
        crawlerApiUrl
          ? 'CONFIGURED: ' + crawlerApiUrl.substring(0, 30) + '...'
          : 'NOT CONFIGURED'
      }`
    );
  }

  const results: ArticleMetadata[] = [];
  const total = urls.length;

  console.log(`\n📦 Fetching ${total} articles via ${providerName}...\n`);

  let successCount = 0;
  let emptyCount = 0;

  for (let i = 0; i < total; i++) {
    const url = urls[i];
    const progress = `[${i + 1}/${total}]`;

    console.log(`${progress} ${url}`);

    if (isJina || crawlerApiUrl) {
      const result = await fetchArticleMetadata(url, provider, crawlerApiUrl, crawlerApiToken);
      results.push(result);

      if (result.fullContent) {
        successCount++;
        console.log(`${progress} ✅ ${providerName} (${result.fullContent.length} chars)\n`);
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
