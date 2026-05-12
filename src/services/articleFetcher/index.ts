/**
 * Article Fetcher Service
 * Fetches article content using configured crawler provider (Crawler API or jina.ai)
 */

export { fetchArticlesBatch, fetchArticleMetadata, setJinaConfig } from './metadata';
export type { ArticleMetadata } from '../../types/content';
