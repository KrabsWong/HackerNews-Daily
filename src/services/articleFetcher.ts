import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';

const FETCH_TIMEOUT = 5000; // 5 seconds
const USER_AGENT = 'Mozilla/5.0 (compatible; HackerNewsDaily/1.0)';

export interface ArticleMetadata {
  url: string;
  description: string | null;
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
      };
    }
  });
}
