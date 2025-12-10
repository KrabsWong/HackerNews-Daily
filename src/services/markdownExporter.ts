import * as fs from 'fs/promises';
import * as path from 'path';

interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
  time: string;
  timestamp: number;
  description: string;
  commentSummary: string | null;
}

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
    // Article heading (H2) with rank and Chinese title
    content += `## ${story.rank}. 【${story.titleChinese}】\n\n`;
    
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
    
    // Separator between articles
    content += `---\n\n`;
  }
  
  return content;
}

/**
 * Ensure the export directory exists, create if necessary
 * @param directory - Directory path to ensure exists
 */
export async function ensureDirectoryExists(directory: string): Promise<void> {
  try {
    await fs.access(directory);
  } catch (error) {
    // Directory doesn't exist, create it
    try {
      await fs.mkdir(directory, { recursive: true });
      console.log(`📁 Created directory: ${directory}`);
    } catch (mkdirError) {
      throw new Error(`Failed to create directory ${directory}: ${mkdirError instanceof Error ? mkdirError.message : 'Unknown error'}`);
    }
  }
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

/**
 * Format date for display messages
 * @param date - Date object (in UTC)
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForDisplay(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Write markdown content to file
 * @param content - Markdown content to write
 * @param filename - Filename (without path)
 * @param directory - Directory path
 */
export async function writeMarkdownFile(
  content: string,
  filename: string,
  directory: string
): Promise<void> {
  const filePath = path.join(directory, filename);
  
  // Check if file exists for overwrite warning
  let fileExists = false;
  try {
    await fs.access(filePath);
    fileExists = true;
  } catch {
    // File doesn't exist, no warning needed
  }
  
  if (fileExists) {
    console.log(`⚠️  File ${filename} already exists, overwriting...`);
  }
  
  try {
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('EACCES') || error.message.includes('permission')) {
        throw new Error(`Permission denied writing to ${filePath}. Please check directory permissions.`);
      } else if (error.message.includes('ENOSPC')) {
        throw new Error(`No space left on device. Cannot write ${filePath}.`);
      } else {
        throw new Error(`Failed to write file ${filePath}: ${error.message}`);
      }
    }
    throw new Error(`Failed to write file ${filePath}: Unknown error`);
  }
}
