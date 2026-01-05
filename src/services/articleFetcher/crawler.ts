import { CONTENT_CONFIG } from '../../config/constants';
import { post, FetchError } from '../../utils/fetch';
import { truncateContent } from './truncation';

/**
 * Fetch article content using Crawler API
 * The crawler API uses headless browser technology to extract content
 * Returns markdown content or null if crawler fails
 * @param url - Article URL to fetch
 * @param crawlerApiUrl - Full crawler endpoint URL (from env.CRAWLER_API_URL, e.g., https://your-crawl-url)
 * @param crawlerApiToken - Optional Bearer token for authentication (from env.CRAWLER_API_TOKEN)
 */
export async function fetchWithCrawlerAPI(
  url: string,
  crawlerApiUrl?: string,
  crawlerApiToken?: string
): Promise<{ content: string | null; description: string | null }> {
  if (!crawlerApiUrl) {
    return { content: null, description: null };
  }

  let response;
  try {
    // Build headers with Authorization if token provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (crawlerApiToken) {
      headers['Authorization'] = `Bearer ${crawlerApiToken}`;
      console.log(`  🔐 Auth: Token present (${crawlerApiToken.substring(0, 8)}...)`);
    } else {
      console.log(`  ⚠️  Auth: No token provided`);
    }

    console.log(`  📤 Request: POST ${crawlerApiUrl}`);
    console.log(`  📋 Headers:`, Object.keys(headers).join(', '));

    response = await post<{
      success: boolean;
      markdown?: string;
      error?: string;
    }>(
      crawlerApiUrl,
      { url },
      {
        timeout: 10000, // 10 seconds timeout
        headers,
      }
    );
  } catch (error) {
    // Handle network/fetch errors specifically
    if (error instanceof FetchError) {
      if (error.message.includes('timeout')) {
        console.warn(`  ⏱️  Timeout`);
      } else {
        console.warn(`  ⚠️  Error: ${error.message}`);
        console.warn(`  🔍 Status: ${error.status}, StatusText: ${error.statusText}`);
      }
    } else {
      console.warn(`  ⚠️  Unknown error:`, error);
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
