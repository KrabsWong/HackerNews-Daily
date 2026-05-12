/**
 * Article Fetcher Service
 * Fetches article content using configured crawler provider (Crawler API or jina.ai)
 */

import type { ArticleMetadata } from '../../types/content';
import { CrawlerProviderType, CRAWLER_API, CONTENT_CONFIG, JINA_API } from '../../config/constants';
import { post, FetchError } from '../../utils/fetch';

// =============================================================================
// Helper Functions
// =============================================================================

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

// =============================================================================
// Jina AI Reader API
// =============================================================================

/**
 * Counter for key rotation strategy
 * Used to alternate between API key and free tier requests
 */
let jinaRequestCounter = 0;

/**
 * Configuration for jina.ai API calls
 */
interface JinaConfig {
  apiKey?: string;
  useKeyRotation: boolean;
}

let globalJinaConfig: JinaConfig = { useKeyRotation: false };

/**
 * Set the global jina.ai configuration
 * Called during application initialization
 */
export function setJinaConfig(config: JinaConfig): void {
  globalJinaConfig = config;
}

/**
 * Determine whether to use API key for the current request
 */
function shouldUseJinaApiKey(): boolean {
  const { apiKey, useKeyRotation } = globalJinaConfig;

  if (!apiKey) return false;
  if (!useKeyRotation) return true;

  // Rotation: alternate between key and no-key
  const useKey = jinaRequestCounter % 2 === 0;
  jinaRequestCounter++;
  return useKey;
}

/**
 * Fetch article content using jina.ai Reader API
 */
async function fetchWithJinaAPI(
  url: string
): Promise<{ content: string | null; description: string | null }> {
  const jinaUrl = `${JINA_API.BASE_URL}/${url}`;
  const useApiKey = shouldUseJinaApiKey();
  const { apiKey } = globalJinaConfig;

  if (apiKey) {
    console.log(`  📤 Request: GET ${jinaUrl.substring(0, 60)}... (${globalJinaConfig.useKeyRotation ? (useApiKey ? 'key' : 'free') : 'using API key'})`);
  } else {
    console.log(`  📤 Request: GET ${jinaUrl.substring(0, 60)}... (no API key)`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JINA_API.REQUEST_TIMEOUT);

  try {
    const headers: Record<string, string> = { 'Accept': 'text/plain' };
    if (useApiKey && apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(jinaUrl, { signal: controller.signal, headers });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`  ⚠️  jina.ai HTTP error: ${response.status}`);
      return { content: null, description: null };
    }

    const content = await response.text();
    if (!content || content.trim().length === 0) {
      console.warn(`  ⚠️  Empty response from jina.ai`);
      return { content: null, description: null };
    }

    let trimmedContent = content.trim();

    // Check for error messages from jina.ai
    const isError = trimmedContent.startsWith('[') && trimmedContent.includes('Error:');
    const isRobotsBlocked = trimmedContent.includes('robots.txt') && trimmedContent.includes('autonomous fetching');
    const isAccessDenied = trimmedContent.toLowerCase().includes('access denied');

    if (isError || isRobotsBlocked || isAccessDenied) {
      console.warn(`  ⚠️  jina.ai returned error: ${trimmedContent.substring(0, 100)}`);
      return { content: null, description: null };
    }

    // Extract first paragraph as description
    const firstParagraph = trimmedContent.split('\n\n')[0]?.trim() || null;
    let description: string | null = null;
    if (firstParagraph && firstParagraph.length > 0) {
      description = firstParagraph.length > CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH
        ? firstParagraph.substring(0, CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH - 3) + '...'
        : firstParagraph;
    }

    // Truncate if configured
    if (CONTENT_CONFIG.MAX_CONTENT_LENGTH > 0 && trimmedContent.length > CONTENT_CONFIG.MAX_CONTENT_LENGTH) {
      trimmedContent = truncateContent(trimmedContent, CONTENT_CONFIG.MAX_CONTENT_LENGTH);
    }

    console.log(`  ✅ jina.ai success (${trimmedContent.length} chars)`);
    return { content: trimmedContent, description };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`  ⏱️  Timeout from jina.ai`);
    } else {
      console.warn(`  ⚠️  jina.ai error: ${error}`);
    }
    return { content: null, description: null };
  }
}

// =============================================================================
// Crawler API
// =============================================================================

/**
 * Fetch article content using Crawler API
 */
async function fetchWithCrawlerAPI(
  url: string,
  crawlerApiUrl?: string,
  crawlerApiToken?: string
): Promise<{ content: string | null; description: string | null }> {
  if (!crawlerApiUrl) {
    return { content: null, description: null };
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (crawlerApiToken) {
      headers['Authorization'] = `Bearer ${crawlerApiToken}`;
    }

    console.log(`  📤 Request: POST ${crawlerApiUrl}`);

    const response = await post<{ success: boolean; markdown?: string; error?: string }>(
      crawlerApiUrl,
      { url },
      { timeout: CRAWLER_API.REQUEST_TIMEOUT, headers }
    );

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

    // Extract first paragraph as description
    const firstParagraph = content.split('\n\n')[0]?.trim() || null;
    let description: string | null = null;
    if (firstParagraph && firstParagraph.length > 0) {
      description = firstParagraph.length > CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH
        ? firstParagraph.substring(0, CONTENT_CONFIG.MAX_DESCRIPTION_LENGTH - 3) + '...'
        : firstParagraph;
    }

    // Truncate if configured
    if (CONTENT_CONFIG.MAX_CONTENT_LENGTH > 0 && content.length > CONTENT_CONFIG.MAX_CONTENT_LENGTH) {
      content = truncateContent(content, CONTENT_CONFIG.MAX_CONTENT_LENGTH);
    }

    return { content, description };
  } catch (error) {
    if (error instanceof FetchError) {
      console.warn(`  ⚠️  Error: ${error.message}`);
    } else {
      console.warn(`  ⚠️  Unknown error:`, error);
    }
    return { content: null, description: null };
  }
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Fetch article metadata using configured crawler provider
 */
export async function fetchArticleMetadata(
  url: string,
  provider: CrawlerProviderType,
  crawlerApiUrl?: string,
  crawlerApiToken?: string
): Promise<ArticleMetadata> {
  const result = provider === CrawlerProviderType.JINA
    ? await fetchWithJinaAPI(url)
    : await fetchWithCrawlerAPI(url, crawlerApiUrl, crawlerApiToken);

  return {
    url,
    description: result.description,
    fullContent: result.content,
  };
}

/**
 * Fetch metadata for multiple articles SERIALLY (one at a time)
 * Serial processing avoids overwhelming the crawler service
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
    console.log(`🔍 Using jina.ai Reader API`);
  } else {
    console.log(`🔍 CRAWLER_API_URL: ${crawlerApiUrl ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
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
      results.push({ url, description: null, fullContent: null });
      emptyCount++;
      console.log(`${progress} ⚠️  No content (crawler disabled)\n`);
    }
  }

  console.log(`\n✅ Completed ${total} articles`);
  console.log(`   📊 Results: ${successCount} success | ${emptyCount} empty\n`);

  return results;
}