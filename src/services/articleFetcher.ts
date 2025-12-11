import { CONTENT_CONFIG, CRAWLER_API } from '../config/constants';
import { post, FetchError } from '../utils/fetch';

export interface ArticleMetadata {
  url: string;
  description: string | null;
  fullContent: string | null;
}

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
 */
async function fetchWithCrawlerAPI(url: string): Promise<{ content: string | null; description: string | null }> {
  if (!CRAWLER_API.ENABLED) {
    return { content: null, description: null };
  }

  try {
    const response = await post<{ success: boolean; markdown?: string; error?: string }>(
      `${CRAWLER_API.BASE_URL}/crawl`,
      { url },
      {
        timeout: CRAWLER_API.REQUEST_TIMEOUT,
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
 */
export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  const { content, description } = await fetchWithCrawlerAPI(url);

  return {
    url,
    description,
    fullContent: content,
  };
}

/**
 * Fetch metadata for multiple articles SERIALLY (one at a time)
 * Serial processing avoids overwhelming the crawler service
 */
export async function fetchArticlesBatch(urls: string[]): Promise<ArticleMetadata[]> {
  if (!CRAWLER_API.ENABLED) {
    console.warn('\n⚠️  CRAWLER_API_URL not configured. Set it in .env file.\n');
    return urls.map(url => ({ url, description: null, fullContent: null }));
  }

  const results: ArticleMetadata[] = [];
  const total = urls.length;
  
  console.log(`\n📦 Processing ${total} articles serially...\n`);
  
  for (let i = 0; i < total; i++) {
    const url = urls[i];
    const progress = `[${i + 1}/${total}]`;
    
    console.log(`${progress} ${url}`);
    
    const result = await fetchArticleMetadata(url);
    results.push(result);
    
    if (result.fullContent) {
      console.log(`${progress} ✅ ${result.fullContent.length} chars\n`);
    } else {
      console.log(`${progress} ⚠️  No content\n`);
    }
  }
  
  console.log(`\n✅ Completed ${total} articles\n`);
  
  return results;
}
