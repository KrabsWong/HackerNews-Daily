/**
 * Tests for translation data alignment
 * 
 * Verifies that the daily export pipeline maintains correct alignment between
 * titles, descriptions, and comment summaries when some stories have missing content.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runDailyExport } from '../../worker/sources/hackernews';
import * as api from '../../api';
import * as articleFetcher from '../../services/articleFetcher';
import { translator } from '../../services/translator';
import type { Env } from '../../worker/index';
import type { HNStory, HNComment } from '../../types/api';

// Mock all external dependencies
vi.mock('../../api');
vi.mock('../../services/articleFetcher');
vi.mock('../../services/translator');

describe('Translation Data Alignment', () => {
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock environment
    mockEnv = {
      HN_STORY_LIMIT: '30',
      SUMMARY_MAX_LENGTH: '300',
      ENABLE_CONTENT_FILTER: 'false',
      LLM_BATCH_SIZE: '10',
      LLM_PROVIDER: 'openrouter',
      LLM_OPENROUTER_API_KEY: 'test-key',
    } as Env;
  });

  describe('Index Preservation', () => {
    it('should maintain alignment when some stories have missing content', async () => {
      // Setup: 3 stories with mixed content availability
      const mockStories: HNStory[] = [
        {
          id: 1001,
          title: 'Story 1 with content',
          url: 'https://example.com/1',
          score: 100,
          time: Math.floor(Date.now() / 1000) - 3600,
          type: 'story',
          by: 'user1',
        },
        {
          id: 1002,
          title: 'Story 2 without content',
          url: 'https://example.com/2',
          score: 90,
          time: Math.floor(Date.now() / 1000) - 7200,
          type: 'story',
          by: 'user2',
        },
        {
          id: 1003,
          title: 'Story 3 with content',
          url: 'https://example.com/3',
          score: 80,
          time: Math.floor(Date.now() / 1000) - 10800,
          type: 'story',
          by: 'user3',
        },
      ];

      // Mock API responses
      vi.mocked(api.fetchTopStoriesByScore).mockResolvedValue(mockStories);

      // Mock article fetcher - story 2 has no content
      vi.mocked(articleFetcher.fetchArticlesBatch).mockResolvedValue([
        {
          url: 'https://example.com/1',
          fullContent: 'Full content for story 1...',
          description: 'Description 1',
        },
        {
          url: 'https://example.com/2',
          fullContent: null, // No content for story 2
          description: 'Description 2',
        },
        {
          url: 'https://example.com/3',
          fullContent: 'Full content for story 3...',
          description: 'Description 3',
        },
      ]);

      // Mock comments - story 2 has insufficient comments
      const mockComments: HNComment[][] = [
        [
          { id: 2001, text: 'Comment 1 for story 1', by: 'commenter1', time: 123, parent: 1001 },
          { id: 2002, text: 'Comment 2 for story 1', by: 'commenter2', time: 124, parent: 1001 },
          { id: 2003, text: 'Comment 3 for story 1', by: 'commenter3', time: 125, parent: 1001 },
        ],
        [], // No comments for story 2
        [
          { id: 3001, text: 'Comment 1 for story 3', by: 'commenter4', time: 126, parent: 1003 },
          { id: 3002, text: 'Comment 2 for story 3', by: 'commenter5', time: 127, parent: 1003 },
          { id: 3003, text: 'Comment 3 for story 3', by: 'commenter6', time: 128, parent: 1003 },
        ],
      ];
      vi.mocked(api.fetchCommentsBatchFromAlgolia).mockResolvedValue(mockComments);

      // Mock translator - simulate batch returns with empty strings for missing items
      vi.mocked(translator.init).mockReturnValue(undefined);
      vi.mocked(translator.translateTitlesBatch).mockResolvedValue([
        '标题1有内容',
        '标题2无内容',
        '标题3有内容',
      ]);
      
      // Content summaries: story 2 has empty string (no content to summarize)
      vi.mocked(translator.summarizeContentBatch).mockResolvedValue([
        '这是故事1的摘要...',
        '', // Empty string for story 2 (no content)
        '这是故事3的摘要...',
      ]);
      
      // Mock translateDescription for story 2 (fallback)
      vi.mocked(translator.translateDescription).mockResolvedValue('描述2翻译');
      
      // Comment summaries: story 2 has empty string (insufficient comments)
      vi.mocked(translator.summarizeCommentsBatch).mockResolvedValue([
        '评论要点1...',
        '', // Empty string for story 2 (no comments)
        '评论要点3...',
      ]);

      // Execute
      const result = await runDailyExport(mockEnv);

      // Verify alignment
      expect(result.stories).toHaveLength(3);
      
      // Story 1: Has content and comments
      expect(result.stories[0]).toMatchObject({
        storyId: 1001,
        titleChinese: '标题1有内容',
        titleEnglish: 'Story 1 with content',
        description: '这是故事1的摘要...',
        commentSummary: '评论要点1...',
      });
      
      // Story 2: No content, no comments - should use fallback text
      expect(result.stories[1]).toMatchObject({
        storyId: 1002,
        titleChinese: '标题2无内容',
        titleEnglish: 'Story 2 without content',
        description: '描述2翻译', // Falls back to translated description
        commentSummary: '暂无评论', // Falls back to default text
      });
      
      // Story 3: Has content and comments
      expect(result.stories[2]).toMatchObject({
        storyId: 1003,
        titleChinese: '标题3有内容',
        titleEnglish: 'Story 3 with content',
        description: '这是故事3的摘要...',
        commentSummary: '评论要点3...',
      });
    });

    it('should throw error if array lengths mismatch', async () => {
      const mockStories: HNStory[] = [
        {
          id: 1001,
          title: 'Story 1',
          url: 'https://example.com/1',
          score: 100,
          time: Math.floor(Date.now() / 1000) - 3600,
          type: 'story',
          by: 'user1',
        },
      ];

      vi.mocked(api.fetchTopStoriesByScore).mockResolvedValue(mockStories);
      vi.mocked(articleFetcher.fetchArticlesBatch).mockResolvedValue([
        {
          url: 'https://example.com/1',
          fullContent: 'Content',
          description: 'Description',
        },
      ]);
      vi.mocked(api.fetchCommentsBatchFromAlgolia).mockResolvedValue([[]]);
      vi.mocked(translator.init).mockReturnValue(undefined);
      
      // Simulate misaligned response (wrong length)
      vi.mocked(translator.translateTitlesBatch).mockResolvedValue(['标题1']);
      vi.mocked(translator.summarizeContentBatch).mockResolvedValue(['摘要1']);
      vi.mocked(translator.summarizeCommentsBatch).mockResolvedValue([]); // Wrong length!

      // The validation error gets caught and wrapped, so check for either error
      await expect(runDailyExport(mockEnv)).rejects.toThrow();
    });
  });

  describe('Empty String Handling', () => {
    it('should treat empty strings as valid placeholders, not falsy values', async () => {
      const mockStories: HNStory[] = [
        {
          id: 1001,
          title: 'Test Story',
          url: 'https://example.com/1',
          score: 100,
          time: Math.floor(Date.now() / 1000) - 3600,
          type: 'story',
          by: 'user1',
        },
      ];

      vi.mocked(api.fetchTopStoriesByScore).mockResolvedValue(mockStories);
      vi.mocked(articleFetcher.fetchArticlesBatch).mockResolvedValue([
        {
          url: 'https://example.com/1',
          fullContent: null, // No content
          description: 'Meta description',
        },
      ]);
      vi.mocked(api.fetchCommentsBatchFromAlgolia).mockResolvedValue([[]]);
      vi.mocked(translator.init).mockReturnValue(undefined);
      vi.mocked(translator.translateTitlesBatch).mockResolvedValue(['测试标题']);
      
      // Batch functions return empty strings
      vi.mocked(translator.summarizeContentBatch).mockResolvedValue(['']); // Empty string
      vi.mocked(translator.translateDescription).mockResolvedValue('翻译后的描述');
      vi.mocked(translator.summarizeCommentsBatch).mockResolvedValue(['']); // Empty string

      const result = await runDailyExport(mockEnv);

      // Empty string in contentSummaries should trigger translateDescription
      expect(result.stories[0].description).toBe('翻译后的描述');
      
      // Empty string in commentSummaries should become fallback text
      expect(result.stories[0].commentSummary).toBe('暂无评论');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all stories missing content', async () => {
      const mockStories: HNStory[] = [
        {
          id: 1001,
          title: 'Story 1',
          url: 'https://example.com/1',
          score: 100,
          time: Math.floor(Date.now() / 1000) - 3600,
          type: 'story',
          by: 'user1',
        },
        {
          id: 1002,
          title: 'Story 2',
          url: 'https://example.com/2',
          score: 90,
          time: Math.floor(Date.now() / 1000) - 7200,
          type: 'story',
          by: 'user2',
        },
      ];

      vi.mocked(api.fetchTopStoriesByScore).mockResolvedValue(mockStories);
      vi.mocked(articleFetcher.fetchArticlesBatch).mockResolvedValue([
        { url: 'https://example.com/1', fullContent: null, description: 'Desc 1' },
        { url: 'https://example.com/2', fullContent: null, description: 'Desc 2' },
      ]);
      vi.mocked(api.fetchCommentsBatchFromAlgolia).mockResolvedValue([[], []]);
      vi.mocked(translator.init).mockReturnValue(undefined);
      vi.mocked(translator.translateTitlesBatch).mockResolvedValue(['标题1', '标题2']);
      vi.mocked(translator.summarizeContentBatch).mockResolvedValue(['', '']); // All empty
      vi.mocked(translator.translateDescription)
        .mockResolvedValueOnce('翻译描述1')
        .mockResolvedValueOnce('翻译描述2');
      vi.mocked(translator.summarizeCommentsBatch).mockResolvedValue(['', '']); // All empty

      const result = await runDailyExport(mockEnv);

      expect(result.stories).toHaveLength(2);
      expect(result.stories[0].description).toBe('翻译描述1');
      expect(result.stories[1].description).toBe('翻译描述2');
      expect(result.stories[0].commentSummary).toBe('暂无评论');
      expect(result.stories[1].commentSummary).toBe('暂无评论');
    });

    it('should handle all stories having content', async () => {
      const mockStories: HNStory[] = [
        {
          id: 1001,
          title: 'Story 1',
          url: 'https://example.com/1',
          score: 100,
          time: Math.floor(Date.now() / 1000) - 3600,
          type: 'story',
          by: 'user1',
        },
        {
          id: 1002,
          title: 'Story 2',
          url: 'https://example.com/2',
          score: 90,
          time: Math.floor(Date.now() / 1000) - 7200,
          type: 'story',
          by: 'user2',
        },
      ];

      vi.mocked(api.fetchTopStoriesByScore).mockResolvedValue(mockStories);
      vi.mocked(articleFetcher.fetchArticlesBatch).mockResolvedValue([
        { url: 'https://example.com/1', fullContent: 'Content 1', description: 'Desc 1' },
        { url: 'https://example.com/2', fullContent: 'Content 2', description: 'Desc 2' },
      ]);
      vi.mocked(api.fetchCommentsBatchFromAlgolia).mockResolvedValue([
        [{ id: 2001, text: 'Comment 1', by: 'user', time: 123, parent: 1001 }, { id: 2002, text: 'Comment 2', by: 'user', time: 124, parent: 1001 }, { id: 2003, text: 'Comment 3', by: 'user', time: 125, parent: 1001 }],
        [{ id: 3001, text: 'Comment 1', by: 'user', time: 126, parent: 1002 }, { id: 3002, text: 'Comment 2', by: 'user', time: 127, parent: 1002 }, { id: 3003, text: 'Comment 3', by: 'user', time: 128, parent: 1002 }],
      ]);
      vi.mocked(translator.init).mockReturnValue(undefined);
      vi.mocked(translator.translateTitlesBatch).mockResolvedValue(['标题1', '标题2']);
      vi.mocked(translator.summarizeContentBatch).mockResolvedValue(['摘要1', '摘要2']); // Both have summaries
      vi.mocked(translator.summarizeCommentsBatch).mockResolvedValue(['评论1', '评论2']); // Both have comments

      const result = await runDailyExport(mockEnv);

      expect(result.stories).toHaveLength(2);
      expect(result.stories[0].description).toBe('摘要1');
      expect(result.stories[1].description).toBe('摘要2');
      expect(result.stories[0].commentSummary).toBe('评论1');
      expect(result.stories[1].commentSummary).toBe('评论2');
      
      // translateDescription should NOT be called when content summaries exist
      expect(translator.translateDescription).not.toHaveBeenCalled();
    });
  });
});
