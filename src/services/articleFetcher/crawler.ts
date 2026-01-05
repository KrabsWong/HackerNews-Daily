import { CONTENT_CONFIG } from '../../config/constants';
import { post, FetchError } from '../../utils/fetch';
import { truncateContent } from './truncation';

/**
 * Fetch article content using Crawler API
 * The crawler API uses headless browser technology to extract content
 * Returns markdown content or null if crawler fails
 * @param url - Article URL to fetch
 * @param crawlerApiUrl - Crawler API base URL (from env.CRAWLER_API_URL)
 */
export async function fetchWithCrawlerAPI(
  url: string,
  crawlerApiUrl?: string
): Promise<{ content: string | null; description: string | null }> {
  if (!crawlerApiUrl) {
    return { content: null, description: null };
  }

  let response;
  try {
    response = await post<{
      success: boolean;
      markdown?: string;
      error?: string;
    }>(
      `${crawlerApiUrl}/crawl`,
      { url },
      {
        timeout: 10000, // 10 seconds timeout
      }
    );
  } catch (error) {
    // Handle network/fetch errors specifically
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

  // Process response data (no try-catch needed for synchronous logic)
  if (!response.data) {
    console.warn(`  ⚠️  No response data`);
    return { content: null, description: null };
  }

  const { success, markdown, error } = response.data;

  if (!success || !markdown || markdown.trim().length === 0) {
    console.warn(`  ⚠️  Crawler failed: ${error || 'No content'}`);
    return { content: null, description: null };
  }

  let content = markdown.trim();

  // Extract first paragraph as description (before truncation)
  const firstParagraph = content.split('\n\n')[0]?.trim() || null;
  let description: string | null = null;
  if (firstParagraph && firstParagraph.length > 0) {
    description =
      firstParagraph.length > CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH
        ? firstParagraph.substring(0, CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH - 3) + '...'
        : firstParagraph;
  }

  // Truncate content only if MAX_CONTENT_LENGTH is set (> 0)
  if (
    CONTENT_CONFIG.MAX_CONTENT_LENGTH > 0 &&
    content.length > CONTENT_CONFIG.MAX_CONTENT_LENGTH
  ) {
    content = truncateContent(content, CONTENT_CONFIG.MAX_CONTENT_LENGTH);
  }

  return { content, description };
}
