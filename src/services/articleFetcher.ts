import { CONTENT_CONFIG } from '../config/constants';
import { post, FetchError } from '../utils/fetch';
import type { ArticleMetadata } from '../types/content';

// Re-export type for backward compatibility
export type { ArticleMetadata } from '../types/content';

/**
 * Truncate content to prevent API token limit issues
 * Ensures truncation doesn't cut mid-word
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Fetch article content using Crawler API
 * The crawler API uses headless browser technology to extract content
 * Returns markdown content or null if crawler fails
 * @param url - Article URL to fetch
 * @param crawlerApiUrl - Crawler API base URL (from env.CRAWLER_API_URL)
 */
async function fetchWithCrawlerAPI(url: string, crawlerApiUrl?: string): Promise<{ content: string | null; description: string | null }> {
  if (!crawlerApiUrl) {
    return { content: null, description: null };
  }

  try {
    const response = await post<{ success: boolean; markdown?: string; error?: string }>(
      `${crawlerApiUrl}/crawl`,
      { url },
      {
        timeout: 10000, // 10 seconds timeout
      }
    );

    if (response.data) {
      const { success, markdown, error } = response.data;

      if (success && markdown && markdown.trim().length > 0) {
        let content = markdown.trim();

        // Extract first paragraph as description (before truncation)
        const firstParagraph = content.split('\n\n')[0]?.trim() || null;
        let description: string | null = null;
        if (firstParagraph && firstParagraph.length > 0) {
          description = firstParagraph.length > CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH
            ? firstParagraph.substring(0, CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH - 3) + '...'
            : firstParagraph;
        }

        // Truncate content only if MAX_CONTENT_LENGTH is set (> 0)
        if (CONTENT_CONFIG.MAX_CONTENT_LENGTH > 0 && content.length > CONTENT_CONFIG.MAX_CONTENT_LENGTH) {
          content = truncateContent(content, CONTENT_CONFIG.MAX_CONTENT_LENGTH);
        }

        return { content, description };
      } else {
        console.warn(`  ⚠️  Crawler failed: ${error || 'No content'}`);
        return { content: null, description: null };
      }
    }

    console.warn(`  ⚠️  No response data`);
    return { content: null, description: null };
  } catch (error) {
    if (error instanceof FetchError) {
      if (error.message.includes('timeout')) {
        console.warn(`  ⏱️  Timeout`);
      } else {
        console.warn(`  ⚠️  Error: ${error.message}`);
      }
    } else {
      console.warn(`  ⚠️  Unknown error`);
    }
    return { content: null, description: null };
  }
}

/**
 * Fetch article metadata using Crawler API
 * Returns content and description extracted by the crawler service
 * @param url - Article URL to fetch
 * @param crawlerApiUrl - Crawler API base URL (from env.CRAWLER_API_URL)
 */
export async function fetchArticleMetadata(url: string, crawlerApiUrl?: string): Promise<ArticleMetadata> {
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
export async function fetchArticlesBatch(urls: string[], crawlerApiUrl?: string): Promise<ArticleMetadata[]> {
  console.log(`🔍 CRAWLER_API_URL: ${crawlerApiUrl ? 'CONFIGURED: ' + crawlerApiUrl.substring(0, 30) + '...' : 'NOT CONFIGURED'}`);

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
