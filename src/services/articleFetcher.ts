import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const FETCH_TIMEOUT = 5000; // 5 seconds
const USER_AGENT = 'Mozilla/5.0 (compatible; HackerNewsDaily/1.0)';
const MAX_CONTENT_LENGTH = 4000; // Maximum characters before truncation for AI summarization

export interface ArticleMetadata {
  url: string;
  description: string | null; // Meta description from HTML tags
  fullContent: string | null; // Extracted article body content for AI summarization
}

/**
 * Truncate content to prevent API token limit issues
 * Ensures truncation doesn't cut mid-word
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }
  
  // Find last space before maxLength to avoid cutting mid-word
  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Extract main article content from HTML using Readability algorithm
 * Returns null if extraction fails
 */
function extractArticleContent(html: string, url: string): string | null {
  try {
    // Parse HTML with JSDOM (required by Readability)
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Apply Readability algorithm to extract main content
    const reader = new Readability(document);
    const article = reader.parse();
    
    if (!article || !article.textContent) {
      return null;
    }
    
    // Clean up the text content
    let content = article.textContent
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n'); // Replace multiple newlines with single newline
    
    // Truncate if too long
    if (content.length > MAX_CONTENT_LENGTH) {
      content = truncateContent(content, MAX_CONTENT_LENGTH);
    }
    
    return content;
  } catch (error) {
    // Log error but don't throw - graceful degradation to meta description
    console.warn(`Content extraction failed for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Fetch article metadata (description) from a given URL
 * Returns null for description if fetch fails or no description found
 */
export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  try {
    const response = await axios.get(url, {
      timeout: FETCH_TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
      },
      maxRedirects: 3,
    });

    const html = response.data;
    
    // Extract full article content using Readability
    const fullContent = extractArticleContent(html, url);
    
    // Also extract meta description as fallback
    const $ = cheerio.load(html);

    // Try various meta description tags
    let description = 
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      null;

    // Trim and limit description length to 200 characters
    if (description) {
      description = description.trim();
      if (description.length > 200) {
        description = description.substring(0, 197) + '...';
      }
    }

    return {
      url,
      description,
      fullContent,
    };
  } catch (error) {
    // Log warning but don't throw - graceful degradation
    if (error instanceof AxiosError) {
      console.warn(`Failed to fetch article ${url}: ${error.message}`);
    } else {
      console.warn(`Failed to fetch article ${url}: Unknown error`);
    }

    return {
      url,
      description: null,
      fullContent: null,
    };
  }
}

/**
 * Fetch metadata for multiple articles in parallel
 * Uses Promise.allSettled to ensure failures don't block other fetches
 */
export async function fetchArticlesBatch(urls: string[]): Promise<ArticleMetadata[]> {
  const fetchPromises = urls.map(url => fetchArticleMetadata(url));
  const results = await Promise.allSettled(fetchPromises);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // This shouldn't happen since fetchArticleMetadata catches errors,
      // but handle it just in case
      console.warn(`Unexpected error fetching ${urls[index]}`);
      return {
        url: urls[index],
        description: null,
        fullContent: null,
      };
    }
  });
}
