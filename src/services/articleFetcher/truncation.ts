/**
 * Truncate content to prevent API token limit issues
 * Ensures truncation doesn't cut mid-word
 * @param content - The content to truncate
 * @param maxLength - Maximum length allowed
 * @returns Truncated content with ellipsis if needed
 */
export function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  const truncated = content.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}
