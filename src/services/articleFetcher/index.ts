/**
 * Article Fetcher Service
 * Fetches article content using configured crawler provider (Crawler API or jina.ai)
 */

export { fetchArticlesBatch, fetchArticleMetadata } from './metadata';
export { fetchWithJinaAPI } from './jina';
export { fetchWithCrawlerAPI } from './crawler';
export type { ArticleMetadata } from '../../types/content';
