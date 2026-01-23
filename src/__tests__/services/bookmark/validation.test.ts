/**
 * Bookmark Validation Tests
 * 
 * Unit tests for bookmark request validation.
 * Tests validate both valid requests and various invalid inputs.
 */

import { describe, it, expect } from 'vitest';
import {
  validateCreateBookmarkRequest,
  validateUrlQueryParam,
} from '../../../services/bookmark/validation';

describe('validateCreateBookmarkRequest', () => {
  // Valid request test
  it('should accept valid request with all required fields', () => {
    const validRequest = {
      url: 'https://example.com/article',
      title: 'Test Article',
      summary: 'This is a test summary of the article.',
      summary_zh: '这是文章的测试摘要。',
      tags: ['tech', 'ai'],
    };

    const result = validateCreateBookmarkRequest(validRequest);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.data).toBeDefined();
    expect(result.data?.url).toBe(validRequest.url);
    expect(result.data?.title).toBe(validRequest.title);
    expect(result.data?.tags).toEqual(['tech', 'ai']);
  });

  it('should accept valid request with optional description', () => {
    const validRequest = {
      url: 'https://example.com/article',
      title: 'Test Article',
      description: 'Optional description field',
      summary: 'This is a test summary.',
      summary_zh: '这是测试摘要。',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(validRequest);
    
    expect(result.valid).toBe(true);
    expect(result.data?.description).toBe('Optional description field');
  });

  it('should accept valid request with empty tags array', () => {
    const validRequest = {
      url: 'https://example.com/article',
      title: 'Test Article',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(validRequest);
    
    expect(result.valid).toBe(true);
    expect(result.data?.tags).toEqual([]);
  });

  // Non-object body
  it('should reject non-object body', () => {
    const result = validateCreateBookmarkRequest('not an object');
    
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('Request body must be a JSON object');
  });

  it('should reject null body', () => {
    const result = validateCreateBookmarkRequest(null);
    
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe('Request body must be a JSON object');
  });

  // Missing required fields
  it('should reject missing url field', () => {
    const invalidRequest = {
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'url')).toBe(true);
    expect(result.errors.find(e => e.field === 'url')?.message).toBe('url is required');
  });

  it('should reject missing title field', () => {
    const invalidRequest = {
      url: 'https://example.com',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'title')).toBe(true);
  });

  it('should reject missing summary field', () => {
    const invalidRequest = {
      url: 'https://example.com',
      title: 'Test',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'summary')).toBe(true);
  });

  it('should reject missing summary_zh field', () => {
    const invalidRequest = {
      url: 'https://example.com',
      title: 'Test',
      summary: 'Summary',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'summary_zh')).toBe(true);
  });

  it('should reject missing tags field', () => {
    const invalidRequest = {
      url: 'https://example.com',
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'tags')).toBe(true);
  });

  // Invalid URL format
  it('should reject invalid URL format (no protocol)', () => {
    const invalidRequest = {
      url: 'example.com/article',
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.find(e => e.field === 'url')?.message).toContain('valid URL');
  });

  it('should reject invalid URL format (ftp protocol)', () => {
    const invalidRequest = {
      url: 'ftp://example.com/file',
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.find(e => e.field === 'url')?.message).toContain('http');
  });

  it('should accept http:// URLs', () => {
    const validRequest = {
      url: 'http://example.com/article',
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(validRequest);
    
    expect(result.valid).toBe(true);
  });

  // Invalid types
  it('should reject non-string url', () => {
    const invalidRequest = {
      url: 123,
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.find(e => e.field === 'url')?.message).toBe('url must be a string');
  });

  it('should reject non-array tags', () => {
    const invalidRequest = {
      url: 'https://example.com',
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: 'not-an-array',
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.find(e => e.field === 'tags')?.message).toBe('tags must be an array');
  });

  // Invalid tag items
  it('should reject non-string items in tags array', () => {
    const invalidRequest = {
      url: 'https://example.com',
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: ['valid', 123, 'another'],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'tags[1]')).toBe(true);
  });

  it('should reject empty string tags', () => {
    const invalidRequest = {
      url: 'https://example.com',
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: ['valid', '', 'another'],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.find(e => e.field === 'tags[1]')?.message).toContain('empty');
  });

  // Field length limits
  it('should reject URL exceeding max length', () => {
    const invalidRequest = {
      url: 'https://example.com/' + 'a'.repeat(2050),
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.find(e => e.field === 'url')?.message).toContain('2048');
  });

  it('should reject title exceeding max length', () => {
    const invalidRequest = {
      url: 'https://example.com',
      title: 'a'.repeat(501),
      summary: 'Summary',
      summary_zh: '摘要',
      tags: [],
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.find(e => e.field === 'title')?.message).toContain('500');
  });

  it('should reject tags array exceeding max count', () => {
    const invalidRequest = {
      url: 'https://example.com',
      title: 'Test',
      summary: 'Summary',
      summary_zh: '摘要',
      tags: Array(21).fill('tag'),
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.find(e => e.field === 'tags')?.message).toContain('20');
  });

  // Multiple errors
  it('should return all validation errors at once', () => {
    const invalidRequest = {
      // Missing url, title, summary, summary_zh
      tags: 'not-an-array',
    };

    const result = validateCreateBookmarkRequest(invalidRequest);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validateUrlQueryParam', () => {
  it('should accept valid URL', () => {
    const result = validateUrlQueryParam('https://example.com/article');
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should accept http:// URL', () => {
    const result = validateUrlQueryParam('http://example.com');
    
    expect(result.valid).toBe(true);
  });

  it('should reject null URL', () => {
    const result = validateUrlQueryParam(null);
    
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toBe('url query parameter is required');
  });

  it('should reject invalid URL format', () => {
    const result = validateUrlQueryParam('not-a-valid-url');
    
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('valid URL');
  });
});
