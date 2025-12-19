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

/**
 * Generate markdown content from processed stories with optimized hierarchy
 * Uses clear markdown structure for better readability and rendering
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
    
    // Description paragraph
    content += `**描述**:\n\n${story.description}\n\n`;
    
    // Comment summary (if available)
    if (story.commentSummary) {
      content += `**评论要点**:\n\n${story.commentSummary}\n\n`;
    }
    
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
