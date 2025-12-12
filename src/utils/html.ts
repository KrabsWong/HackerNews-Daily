/**
 * HTML utility functions
 */

import * as cheerio from 'cheerio';

/**
 * Strip HTML tags from comment text and return plain text
 * Preserves code blocks and technical terms
 */
export function stripHTML(html: string): string {
  if (!html || html.trim() === '') {
    return '';
  }
  
  try {
    // Load HTML with cheerio
    const $ = cheerio.load(html);
    
    // Extract text content (automatically strips tags)
    const text = $.text();
    
    // Clean up whitespace
    return text.trim().replace(/\s+/g, ' ');
  } catch (error) {
    console.warn('Failed to parse HTML in comment:', error instanceof Error ? error.message : 'Unknown error');
    return '';
  }
}
