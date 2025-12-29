import { formatDateForDisplay } from '../utils/date';
import { ProcessedStory } from '../types/shared';

// Re-export for backward compatibility
export { formatDateForDisplay };

/**
 * Generate Jekyll front matter with layout, title, and date
 * @param date - Date object for the export (in UTC)
 * @returns Jekyll-compatible YAML front matter block
 */
export function generateJekyllFrontMatter(date: Date): string {
  const dateStr = formatDateForDisplay(date);
  let frontMatter = '---\n';
  frontMatter += 'layout: post\n';
  frontMatter += `title: HackerNews Daily - ${dateStr}\n`;
  frontMatter += `date: ${dateStr}\n`;
  frontMatter += '---\n\n';
  return frontMatter;
}

// Default values for empty content
const DEFAULT_DESCRIPTION = '暂无描述';
const DEFAULT_COMMENT_SUMMARY = '暂无评论';

/**
 * Get display value for description, with fallback to default
 * @param description - Story description (may be empty/null/undefined)
 * @returns Description text or default value
 */
function getDescriptionDisplay(description: string | null | undefined): string {
  if (!description || description.trim() === '') {
    return DEFAULT_DESCRIPTION;
  }
  return description;
}

/**
 * Get display value for comment summary, with fallback to default
 * @param commentSummary - Comment summary (may be empty/null/undefined)
 * @returns Comment summary text or default value
 */
function getCommentSummaryDisplay(commentSummary: string | null | undefined): string {
  if (!commentSummary || commentSummary.trim() === '') {
    return DEFAULT_COMMENT_SUMMARY;
  }
  return commentSummary;
}

/**
 * Generate markdown content from processed stories with optimized hierarchy
 * Uses clear markdown structure for better readability and rendering
 * Always renders both description and comment sections with default values if empty
 * @param stories - Array of processed stories to convert to markdown
 * @param date - Date object for the export (used for the title)
 */
export function generateMarkdownContent(stories: ProcessedStory[], date: Date): string {
  let content = '';
  
  // Add Jekyll front matter at the top
  content += generateJekyllFrontMatter(date);
  
  for (const story of stories) {
    // Article heading (H2) with rank and Chinese title (no brackets)
    content += `## ${story.rank}. ${story.titleChinese}\n\n`;
    
    // English title as plain text
    content += `${story.titleEnglish}\n\n`;
    
    // Metadata section with clear labels
    content += `**发布时间**: ${story.time}\n\n`;
    content += `**链接**: [${story.url}](${story.url})\n\n`;
    
    // Description paragraph - always rendered with fallback to default
    const descriptionText = getDescriptionDisplay(story.description);
    content += `**描述**:\n\n${descriptionText}\n\n`;
    
    // Comment summary - always rendered with fallback to default
    const commentText = getCommentSummaryDisplay(story.commentSummary);
    content += `**评论要点**:\n\n${commentText}\n\n`;
    
    // HackerNews link as italic secondary label
    content += `*[HackerNews](https://news.ycombinator.com/item?id=${story.storyId})*\n\n`;
    
    // Separator between articles
    content += `---\n\n`;
  }
  
  return content;
}

/**
 * Generate filename from date
 * @param date - Date object for the export (in UTC)
 * @returns Filename in Jekyll format YYYY-MM-DD-daily.md
 */
export function generateFilename(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}-daily.md`;
}
