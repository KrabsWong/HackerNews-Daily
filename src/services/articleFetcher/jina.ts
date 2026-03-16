import { JINA_API, CONTENT_CONFIG } from '../../config/constants';
import { truncateContent } from './truncation';

/**
 * Fetch article content using jina.ai Reader API
 * jina.ai provides zero-setup content extraction as an alternative to self-hosted crawler
 * Returns markdown content or null if extraction fails
 * @param url - Article URL to fetch
 * @returns Object containing content (markdown) and description (first paragraph)
 */
export async function fetchWithJinaAPI(
  url: string
): Promise<{ content: string | null; description: string | null }> {
  // Build jina.ai URL: https://r.jina.ai/https://example.com
  const jinaUrl = `${JINA_API.BASE_URL}/${encodeURIComponent(url)}`;

  console.log(`  📤 Request: GET ${jinaUrl.substring(0, 60)}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JINA_API.REQUEST_TIMEOUT);

  try {
    const response = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`  ⚠️  Rate limited by jina.ai (too many requests)`);
      } else {
        console.warn(`  ⚠️  jina.ai HTTP error: ${response.status} ${response.statusText}`);
      }
      return { content: null, description: null };
    }

    const content = await response.text();

    if (!content || content.trim().length === 0) {
      console.warn(`  ⚠️  Empty response from jina.ai`);
      return { content: null, description: null };
    }

    let trimmedContent = content.trim();

    // Check if content looks like an error message from jina.ai
    if (trimmedContent.startsWith('[') && trimmedContent.includes('Error:')) {
      console.warn(`  ⚠️  jina.ai returned error: ${trimmedContent.substring(0, 100)}`);
      return { content: null, description: null };
    }

    // Extract first paragraph as description (before truncation)
    const firstParagraph = trimmedContent.split('\n\n')[0]?.trim() || null;
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
      trimmedContent.length > CONTENT_CONFIG.MAX_CONTENT_LENGTH
    ) {
      trimmedContent = truncateContent(trimmedContent, CONTENT_CONFIG.MAX_CONTENT_LENGTH);
    }

    console.log(`  ✅ jina.ai success (${trimmedContent.length} chars)`);

    return { content: trimmedContent, description };
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn(`  ⏱️  Timeout from jina.ai`);
      } else if (error.message.includes('429')) {
        console.warn(`  ⚠️  Rate limited by jina.ai (too many requests)`);
      } else {
        console.warn(`  ⚠️  jina.ai error: ${error.message}`);
      }
    } else {
      console.warn(`  ⚠️  Unknown error from jina.ai:`, error);
    }
    return { content: null, description: null };
  }
}
