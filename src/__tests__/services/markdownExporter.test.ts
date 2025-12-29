/**
 * Tests for Markdown Export Service
 * 
 * Tests markdown generation:
 * - Jekyll front-matter generation
 * - Filename generation
 * - Story markdown formatting
 * - Links and separators
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import {
  generateJekyllFrontMatter,
  generateMarkdownContent,
  generateFilename,
} from '../../services/markdownExporter';
import { createMockProcessedStory } from '../helpers/fixtures';

describe('Markdown Exporter Service', () => {
  describe('generateJekyllFrontMatter', () => {
    it('should generate valid Jekyll front matter', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const frontMatter = generateJekyllFrontMatter(date);

      expect(frontMatter).toContain('---');
      expect(frontMatter).toContain('layout: post');
      expect(frontMatter).toContain('title: HackerNews Daily');
      expect(frontMatter).toContain('date:');
    });

    it('should include correct date format', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const frontMatter = generateJekyllFrontMatter(date);

      expect(frontMatter).toContain('2025-12-20');
    });

    it('should start and end with triple dashes', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const frontMatter = generateJekyllFrontMatter(date);

      const lines = frontMatter.split('\n');
      expect(lines[0]).toBe('---');
      expect(frontMatter.trim().endsWith('---')).toBe(true);
    });

    it('should have two blank lines after front matter', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const frontMatter = generateJekyllFrontMatter(date);

      expect(frontMatter.endsWith('---\n\n')).toBe(true);
    });

    it('should handle different dates', () => {
      const dates = [
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-12-31T00:00:00Z'),
        new Date('2025-02-28T00:00:00Z'),
      ];

      dates.forEach(date => {
        const frontMatter = generateJekyllFrontMatter(date);
        expect(frontMatter).toContain('---');
        expect(frontMatter).toContain('date:');
      });
    });
  });

  describe('generateFilename', () => {
    it('should generate filename in YYYY-MM-DD-daily.md format', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const filename = generateFilename(date);

      expect(filename).toBe('2025-12-20-daily.md');
    });

    it('should pad month and day with zeros', () => {
      const date = new Date('2025-01-05T00:00:00Z');
      const filename = generateFilename(date);

      expect(filename).toBe('2025-01-05-daily.md');
    });

    it('should handle December dates', () => {
      const date = new Date('2025-12-31T00:00:00Z');
      const filename = generateFilename(date);

      expect(filename).toBe('2025-12-31-daily.md');
    });

    it('should always end with -daily.md', () => {
      const dates = [
        new Date('2025-01-01T00:00:00Z'),
        new Date('2025-06-15T00:00:00Z'),
        new Date('2025-12-31T00:00:00Z'),
      ];

      dates.forEach(date => {
        const filename = generateFilename(date);
        expect(filename.endsWith('-daily.md')).toBe(true);
      });
    });
  });

  describe('generateMarkdownContent', () => {
    it('should generate markdown with Jekyll front matter', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const stories = [createMockProcessedStory()];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('---');
      expect(markdown).toContain('layout: post');
      expect(markdown).toContain('HackerNews Daily');
    });

    it('should include story rank and Chinese title', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({
        rank: 1,
        titleChinese: '示例 HackerNews 故事',
      });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('## 1. 示例 HackerNews 故事');
    });

    it('should include English title', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({
        titleEnglish: 'Example HackerNews Story',
      });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('Example HackerNews Story');
    });

    it('should include publication time', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({
        time: '2025-12-20 10:00:00 UTC',
      });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('**发布时间**: 2025-12-20 10:00:00 UTC');
    });

    it('should include article link', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const url = 'https://example.com/article';
      const story = createMockProcessedStory({ url });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain(`**链接**: [${url}](${url})`);
    });

    it('should include description', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const description = 'This is a test article description';
      const story = createMockProcessedStory({ description });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('**描述**:');
      expect(markdown).toContain(description);
    });

    it('should include comment summary when available', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const commentSummary = 'Users discussed the implementation details';
      const story = createMockProcessedStory({ commentSummary });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('**评论要点**:');
      expect(markdown).toContain(commentSummary);
    });

    it('should show default message when comment summary is null', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({ commentSummary: null });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      // Comment section should always be present with default message
      expect(markdown).toContain('**评论要点**:');
      expect(markdown).toContain('暂无评论');
    });

    it('should show default message when comment summary is empty string', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({ commentSummary: '' });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      // Comment section should always be present with default message
      expect(markdown).toContain('**评论要点**:');
      expect(markdown).toContain('暂无评论');
    });

    it('should show default message when description is empty', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({ description: '' });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('**描述**:');
      expect(markdown).toContain('暂无描述');
    });

    it('should show default message when description is null', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      // Force null to test the fallback
      const story = createMockProcessedStory({ description: null as unknown as string });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('**描述**:');
      expect(markdown).toContain('暂无描述');
    });

    it('should include HackerNews link', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const storyId = 12345;
      const story = createMockProcessedStory({ storyId });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain(`https://news.ycombinator.com/item?id=${storyId}`);
      expect(markdown).toContain('[HackerNews]');
    });

    it('should separate multiple stories with dividers', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const stories = [
        createMockProcessedStory({ rank: 1, titleChinese: '故事1' }),
        createMockProcessedStory({ rank: 2, titleChinese: '故事2' }),
        createMockProcessedStory({ rank: 3, titleChinese: '故事3' }),
      ];

      const markdown = generateMarkdownContent(stories, date);

      // Count dividers
      const dividers = markdown.match(/^---$/gm) || [];
      // Front matter dividers + story dividers
      expect(dividers.length).toBeGreaterThan(2);
    });

    it('should handle empty story array', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const markdown = generateMarkdownContent([], date);

      // Should at least have front matter
      expect(markdown).toContain('---');
      expect(markdown).toContain('layout: post');
    });

    it('should generate valid markdown for single story', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({
        rank: 1,
        titleChinese: '示例故事',
        titleEnglish: 'Example Story',
        description: 'This is an example',
        url: 'https://example.com',
        storyId: 12345,
        time: '2025-12-20 10:00:00 UTC',
        commentSummary: 'Great discussion',
      });

      const markdown = generateMarkdownContent([story], date);

      expect(markdown).toContain('## 1. 示例故事');
      expect(markdown).toContain('Example Story');
      expect(markdown).toContain('This is an example');
      expect(markdown).toContain('Great discussion');
      expect(markdown).toContain('https://example.com');
      expect(markdown).toContain('https://news.ycombinator.com/item?id=12345');
    });

    it('should rank stories correctly', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const stories = [
        createMockProcessedStory({ rank: 1, titleChinese: '第一名' }),
        createMockProcessedStory({ rank: 2, titleChinese: '第二名' }),
        createMockProcessedStory({ rank: 3, titleChinese: '第三名' }),
      ];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('## 1. 第一名');
      expect(markdown).toContain('## 2. 第二名');
      expect(markdown).toContain('## 3. 第三名');
    });

    it('should handle stories without article URL', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({ url: '' });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      // Should still include link section even if URL is empty
      expect(markdown).toContain('**链接**:');
    });

    it('should preserve markdown special characters in content', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const description = 'This has **bold** and *italic* and `code`';
      const story = createMockProcessedStory({ description });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('*italic*');
      expect(markdown).toContain('`code`');
    });

    it('should handle stories with Chinese and English mixed', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const story = createMockProcessedStory({
        titleChinese: '关于 TypeScript 的新特性',
        titleEnglish: 'New TypeScript Features',
      });
      const stories = [story];

      const markdown = generateMarkdownContent(stories, date);

      expect(markdown).toContain('关于 TypeScript 的新特性');
      expect(markdown).toContain('New TypeScript Features');
    });
  });

  describe('Integration', () => {
    it('should generate complete markdown document', () => {
      const date = new Date('2025-12-20T00:00:00Z');
      const stories = [
        createMockProcessedStory({
          rank: 1,
          titleChinese: '故事一',
          titleEnglish: 'Story One',
          description: 'First story description',
          url: 'https://example.com/1',
          storyId: 1,
          time: '2025-12-20 10:00:00 UTC',
          commentSummary: 'Comment 1',
        }),
        createMockProcessedStory({
          rank: 2,
          titleChinese: '故事二',
          titleEnglish: 'Story Two',
          description: 'Second story description',
          url: 'https://example.com/2',
          storyId: 2,
          time: '2025-12-20 11:00:00 UTC',
          commentSummary: '',  // Empty comment - will show default message
        }),
      ];

      const markdown = generateMarkdownContent(stories, date);
      const filename = generateFilename(date);
      const frontMatter = generateJekyllFrontMatter(date);

      // Verify all components
      expect(markdown.startsWith(frontMatter)).toBe(true);
      expect(filename).toBe('2025-12-20-daily.md');
      expect(markdown).toContain('## 1. 故事一');
      expect(markdown).toContain('## 2. 故事二');
    });
  });
});
