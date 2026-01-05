/**
 * Terminal output formatter for local test mode
 * Formats markdown content with clear delimiters and metadata for terminal display
 */

import type { PublishContent } from '../../../types/publisher';

/**
 * Format content for terminal output with clear delimiters and metadata
 * 
 * @param content - The content to format
 * @returns Formatted string ready for stdout output
 */
export function formatTerminalOutput(content: PublishContent): string {
  const separator = '='.repeat(38);
  const title = `HackerNews Daily - ${content.dateStr}`;
  const storyCount = content.stories?.length || 0;
  const summary = `Export completed: ${storyCount} stories`;

  return `${separator}
${title}
${separator}

${content.markdown}

${separator}
${summary}
${separator}`;
}
