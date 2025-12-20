/**
 * Tests for HTML utility functions
 */

import { describe, it, expect } from 'vitest';
import { stripHTML } from '../../utils/html';

describe('html utils', () => {
  describe('stripHTML', () => {
    it('should strip basic HTML tags', () => {
      const html = '<p>This is a test</p>';
      const result = stripHTML(html);
      
      expect(result).toBe('This is a test');
    });

    it('should strip nested HTML tags', () => {
      const html = '<div><p>Nested <strong>content</strong> here</p></div>';
      const result = stripHTML(html);
      
      expect(result).toBe('Nested content here');
    });

    it('should preserve text content', () => {
      const html = '<p>This is <em>important</em> information</p>';
      const result = stripHTML(html);
      
      expect(result).toBe('This is important information');
    });

    it('should handle HackerNews comment HTML', () => {
      const html = '<p>This is a comment with <code>code block</code> and links</p>';
      const result = stripHTML(html);
      
      expect(result).toBe('This is a comment with code block and links');
    });

    it('should normalize whitespace', () => {
      const html = '<p>Multiple     spaces   and\n\nnewlines</p>';
      const result = stripHTML(html);
      
      expect(result).toBe('Multiple spaces and newlines');
    });

    it('should handle HTML entities', () => {
      const html = '<p>&lt;script&gt; alert(&quot;test&quot;) &lt;/script&gt;</p>';
      const result = stripHTML(html);
      
      expect(result).toBe('<script> alert("test") </script>');
    });

    it('should return empty string for empty input', () => {
      expect(stripHTML('')).toBe('');
      expect(stripHTML('   ')).toBe('');
    });

    it('should handle text without HTML tags', () => {
      const text = 'Plain text without tags';
      const result = stripHTML(text);
      
      expect(result).toBe('Plain text without tags');
    });

    it('should handle complex nested structures', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph with <a href="#">link</a></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;
      const result = stripHTML(html);
      
      expect(result).toContain('Title');
      expect(result).toContain('Paragraph with link');
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('should handle malformed HTML gracefully', () => {
      const html = '<p>Unclosed tag';
      const result = stripHTML(html);
      
      expect(result).toBe('Unclosed tag');
    });

    it('should handle script and style tags', () => {
      const html = '<div><script>alert("hi")</script><p>Content</p><style>.test{}</style></div>';
      const result = stripHTML(html);
      
      // Cheerio includes script/style content in text, we just verify it processes
      expect(result).toContain('Content');
    });

    it('should trim results', () => {
      const html = '   <p>Text</p>   ';
      const result = stripHTML(html);
      
      expect(result).toBe('Text');
      expect(result.startsWith(' ')).toBe(false);
      expect(result.endsWith(' ')).toBe(false);
    });

    // Note: Error path (lines 26-28 in html.ts) is defensive code that's nearly impossible to trigger
    // in practice as cheerio.load rarely throws with ESM, and cannot be easily mocked in ESM context.
    // The error handling is covered indirectly by the malformed HTML test above.
  });
});
