/**
 * Jina AI Reader 爬虫服务
 */

import type { ArticleMetadata } from '../../types';

const JINA_BASE_URL = 'https://r.jina.ai';
const JINA_TIMEOUT = 30000;

/**
 * 使用 Jina.ai Reader API 爬取单个 URL
 */
export async function fetchWithJinaAPI(
  url: string,
  apiKey: string
): Promise<{ content: string | null; description: string | null }> {
  const jinaUrl = `${JINA_BASE_URL}/${url}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), JINA_TIMEOUT);

  try {
    const response = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/plain',
      },
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`  ⚠️  Jina HTTP error: ${response.status}`);
      return { content: null, description: null };
    }

    const content = await response.text();
    
    if (!content || content.trim().length === 0) {
      console.warn(`  ⚠️  Empty response from Jina`);
      return { content: null, description: null };
    }

    let trimmedContent = content.trim();

    // 检查错误消息
    const isError = trimmedContent.startsWith('[') && trimmedContent.includes('Error:');
    const isRobotsBlocked = trimmedContent.includes('robots.txt') && trimmedContent.includes('autonomous fetching');
    const isAccessDenied = trimmedContent.toLowerCase().includes('access denied');
    
    if (isError || isRobotsBlocked || isAccessDenied) {
      console.warn(`  ⚠️  Jina error: ${trimmedContent.substring(0, 100)}`);
      return { content: null, description: null };
    }

    // 提取第一段作为描述
    const firstParagraph = trimmedContent.split('\n\n')[0]?.trim() || null;
    let description: string | null = null;
    
    if (firstParagraph && firstParagraph.length > 0) {
      description = firstParagraph.length > 200 
        ? firstParagraph.substring(0, 197) + '...'
        : firstParagraph;
    }

    console.log(`  ✅ Jina success (${trimmedContent.length} chars)`);
    return { content: trimmedContent, description };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`  ⏱️  Timeout from Jina`);
    } else {
      console.warn(`  ⚠️  Jina error: ${error}`);
    }
    return { content: null, description: null };
  }
}

/**
 * 批量爬取 URL（串行处理，遵守 RPM 限制）
 */
export async function fetchArticlesWithJina(
  urls: string[],
  apiKey: string,
  requestsPerMinute: number = 100
): Promise<ArticleMetadata[]> {
  console.log(`\n📦 爬取 ${urls.length} 篇文章 via Jina.ai...`);
  console.log(`   速率限制: ${requestsPerMinute} RPM\n`);

  const results: ArticleMetadata[] = [];
  const delayMs = 60000 / requestsPerMinute;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const progress = `[${i + 1}/${urls.length}]`;
    
    console.log(`${progress} ${url.substring(0, 70)}...`);
    
    const result = await fetchWithJinaAPI(url, apiKey);
    
    results.push({
      url,
      description: result.description,
      fullContent: result.content,
    });

    if (i < urls.length - 1) {
      await sleep(delayMs);
    }
  }

  const successCount = results.filter(r => r.fullContent).length;
  const failCount = results.length - successCount;
  
  console.log(`\n✅ 爬取完成: ${successCount} 成功 | ${failCount} 失败\n`);

  return results;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}