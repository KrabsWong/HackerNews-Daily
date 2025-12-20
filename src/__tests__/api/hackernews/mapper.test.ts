/**
 * Tests for API mapper functions
 * Maps between Algolia and Firebase HN API response formats
 */

import { describe, it, expect } from 'vitest';
import { mapAlgoliaStoryToHNStory } from '../../../api/hackernews/mapper';
import { createMockAlgoliaStory } from '../../helpers/fixtures';

describe('API Mapper', () => {
  describe('mapAlgoliaStoryToHNStory', () => {
    it('should map basic Algolia story to HN story format', () => {
      const algoliaStory = createMockAlgoliaStory({
        story_id: 12345,
        title: 'Test Story',
        url: 'https://example.com',
        points: 150,
        created_at_i: 1700000000,
        author: 'testuser',
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result).toEqual({
        id: 12345,
        title: 'Test Story',
        url: 'https://example.com',
        score: 150,
        time: 1700000000,
        type: 'story',
        by: 'testuser',
      });
    });

    it('should correctly map field names (story_id -> id, points -> score)', () => {
      const algoliaStory = createMockAlgoliaStory({
        story_id: 99999,
        points: 500,
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.id).toBe(99999);
      expect(result.score).toBe(500);
      expect(result).not.toHaveProperty('story_id');
      expect(result).not.toHaveProperty('points');
    });

    it('should set type to "story" always', () => {
      const algoliaStory = createMockAlgoliaStory();

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.type).toBe('story');
    });

    it('should map timestamp field (created_at_i -> time)', () => {
      const timestamp = 1640000000;
      const algoliaStory = createMockAlgoliaStory({
        created_at_i: timestamp,
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.time).toBe(timestamp);
      expect(result).not.toHaveProperty('created_at_i');
    });

    it('should map author field (author -> by)', () => {
      const algoliaStory = createMockAlgoliaStory({
        author: 'johndoe',
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.by).toBe('johndoe');
      expect(result).not.toHaveProperty('author');
    });

    it('should handle stories with no URL (Ask HN, Show HN)', () => {
      const algoliaStory = createMockAlgoliaStory({
        url: undefined,
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.url).toBeUndefined();
      expect(result.id).toBeDefined();
      expect(result.title).toBeDefined();
    });

    it('should handle all required fields correctly', () => {
      const algoliaStory = createMockAlgoliaStory({
        story_id: 1,
        title: 'Minimal Story',
        url: 'https://test.com',
        points: 0,
        created_at_i: 0,
        author: 'user',
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      // Verify all required HNStory fields are present
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('time');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('by');
    });

    it('should not include kids field (not provided by Algolia search endpoint)', () => {
      const algoliaStory = createMockAlgoliaStory();

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result).not.toHaveProperty('kids');
    });

    it('should handle high score values correctly', () => {
      const algoliaStory = createMockAlgoliaStory({
        points: 9999,
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.score).toBe(9999);
    });

    it('should handle zero score correctly', () => {
      const algoliaStory = createMockAlgoliaStory({
        points: 0,
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.score).toBe(0);
    });

    it('should preserve exact title text including special characters', () => {
      const specialTitle = 'Test: "Quoted" & <Special> Characters [2024]';
      const algoliaStory = createMockAlgoliaStory({
        title: specialTitle,
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.title).toBe(specialTitle);
    });

    it('should preserve exact URL including query params', () => {
      const complexUrl = 'https://example.com/path?param=value&other=123#anchor';
      const algoliaStory = createMockAlgoliaStory({
        url: complexUrl,
      });

      const result = mapAlgoliaStoryToHNStory(algoliaStory);

      expect(result.url).toBe(complexUrl);
    });
  });
});
