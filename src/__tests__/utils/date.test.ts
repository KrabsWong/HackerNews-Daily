/**
 * Tests for date utility functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPreviousDayBoundaries,
  formatTimestamp,
  formatDateForDisplay,
  filterByDateRange,
} from '../../utils/date';

describe('date utils', () => {
  describe('getPreviousDayBoundaries', () => {
    beforeEach(() => {
      // Mock current date to 2025-12-21 15:30:00 UTC for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-12-21T15:30:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return boundaries for previous day in UTC', () => {
      const result = getPreviousDayBoundaries();
      
      // Should be 2025-12-20
      expect(result.date.getUTCFullYear()).toBe(2025);
      expect(result.date.getUTCMonth()).toBe(11); // December (0-indexed)
      expect(result.date.getUTCDate()).toBe(20);
    });

    it('should return start timestamp at 00:00:00 UTC', () => {
      const result = getPreviousDayBoundaries();
      const startDate = new Date(result.start * 1000);
      
      expect(startDate.getUTCHours()).toBe(0);
      expect(startDate.getUTCMinutes()).toBe(0);
      expect(startDate.getUTCSeconds()).toBe(0);
    });

    it('should return end timestamp at 23:59:59 UTC', () => {
      const result = getPreviousDayBoundaries();
      const endDate = new Date(result.end * 1000);
      
      expect(endDate.getUTCHours()).toBe(23);
      expect(endDate.getUTCMinutes()).toBe(59);
      expect(endDate.getUTCSeconds()).toBe(59);
    });

    it('should have start before end', () => {
      const result = getPreviousDayBoundaries();
      
      expect(result.start).toBeLessThan(result.end);
    });

    it('should return Unix timestamps in seconds', () => {
      const result = getPreviousDayBoundaries();
      
      // Unix timestamps should be 10-digit numbers (seconds since epoch)
      expect(String(result.start).length).toBe(10);
      expect(String(result.end).length).toBe(10);
    });

    it('should handle month boundaries correctly', () => {
      // Test on January 1st (should return December 31st of previous year)
      vi.setSystemTime(new Date('2025-01-01T10:00:00Z'));
      const result = getPreviousDayBoundaries();
      
      expect(result.date.getUTCFullYear()).toBe(2024);
      expect(result.date.getUTCMonth()).toBe(11); // December
      expect(result.date.getUTCDate()).toBe(31);
    });
  });

  describe('formatTimestamp', () => {
    it('should format Unix timestamp without seconds by default', () => {
      // 2025-12-20 14:00:00 UTC
      const timestamp = 1766239200;
      const result = formatTimestamp(timestamp);
      
      expect(result).toBe('2025-12-20 14:00');
    });

    it('should format Unix timestamp with seconds when requested', () => {
      // 2025-12-20 14:00:45 UTC
      const timestamp = 1766239245;
      const result = formatTimestamp(timestamp, true);
      
      expect(result).toBe('2025-12-20 14:00:45 UTC');
    });

    it('should pad single-digit months, days, hours, minutes', () => {
      // 2025-01-05 10:39:03 UTC
      const timestamp = 1736073543;
      const result = formatTimestamp(timestamp, true);
      
      expect(result).toBe('2025-01-05 10:39:03 UTC');
    });

    it('should handle midnight correctly', () => {
      // 2025-12-20 00:00:00 UTC
      const timestamp = 1766188800;
      const result = formatTimestamp(timestamp, true);
      
      expect(result).toBe('2025-12-20 00:00:00 UTC');
    });

    it('should handle end of day correctly', () => {
      // 2025-12-20 23:59:59 UTC
      const timestamp = 1766275199;
      const result = formatTimestamp(timestamp, true);
      
      expect(result).toBe('2025-12-20 23:59:59 UTC');
    });
  });

  describe('formatDateForDisplay', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2025-12-20T15:30:00Z');
      const result = formatDateForDisplay(date);
      
      expect(result).toBe('2025-12-20');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2025-01-05T10:00:00Z');
      const result = formatDateForDisplay(date);
      
      expect(result).toBe('2025-01-05');
    });

    it('should use UTC for formatting', () => {
      // Create a date that might be different in local time vs UTC
      const date = new Date('2025-12-31T23:00:00Z');
      const result = formatDateForDisplay(date);
      
      expect(result).toBe('2025-12-31');
    });
  });

  describe('filterByDateRange', () => {
    const items = [
      { id: 1, timestamp: 1000 },
      { id: 2, timestamp: 2000 },
      { id: 3, timestamp: 3000 },
      { id: 4, timestamp: 4000 },
      { id: 5, timestamp: 5000 },
    ];

    it('should filter items within date range (inclusive)', () => {
      const result = filterByDateRange(items, 2000, 4000);
      
      expect(result).toHaveLength(3);
      expect(result.map(item => item.id)).toEqual([2, 3, 4]);
    });

    it('should include start boundary', () => {
      const result = filterByDateRange(items, 2000, 5000);
      
      expect(result.some(item => item.timestamp === 2000)).toBe(true);
    });

    it('should include end boundary', () => {
      const result = filterByDateRange(items, 1000, 4000);
      
      expect(result.some(item => item.timestamp === 4000)).toBe(true);
    });

    it('should return empty array when no items match', () => {
      const result = filterByDateRange(items, 6000, 7000);
      
      expect(result).toEqual([]);
    });

    it('should handle empty input array', () => {
      const result = filterByDateRange([], 1000, 5000);
      
      expect(result).toEqual([]);
    });

    it('should return all items when range includes all', () => {
      const result = filterByDateRange(items, 0, 10000);
      
      expect(result).toEqual(items);
    });

    it('should work with complex objects', () => {
      const complexItems = [
        { id: 1, name: 'item1', timestamp: 1000, data: { value: 100 } },
        { id: 2, name: 'item2', timestamp: 2000, data: { value: 200 } },
      ];
      
      const result = filterByDateRange(complexItems, 1500, 2500);
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('item2');
      expect(result[0].data.value).toBe(200);
    });
  });
});
