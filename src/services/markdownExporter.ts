/**
 * Markdown 导出服务
 */

import { formatDateForDisplay } from '../utils/date';
import type { ProcessedStory } from '../types';

const DEFAULT_DESCRIPTION = '暂无描述';
const DEFAULT_COMMENT_SUMMARY = '暂无评论';

function generateJekyllFrontMatter(date: Date): string {
  const dateStr = formatDateForDisplay(date);
  return `---
layout: post
title: HackerNews Daily - ${dateStr}
date: ${dateStr}
---

`;
}

export function generateMarkdownContent(stories: ProcessedStory[], date: Date): string {
  let content = generateJekyllFrontMatter(date);
  
  for (const story of stories) {
    content += `## ${story.titleChinese}\n\n`;
    content += `${story.titleEnglish}\n\n`;
    content += `**发布时间**: ${story.time}\n\n`;
    content += `**链接**: [${story.url}](${story.url})\n\n`;
    
    const desc = story.description?.trim() || DEFAULT_DESCRIPTION;
    content += `**描述**:\n\n${desc}\n\n`;
    
    const comments = story.commentSummary?.trim() || DEFAULT_COMMENT_SUMMARY;
    content += `**评论要点**:\n\n${comments}\n\n`;
    
    content += `*[HackerNews](https://news.ycombinator.com/item?id=${story.storyId})*\n\n`;
    content += `---\n\n`;
  }
  
  return content;
}

export function generateFilename(date: Date): string {
  return `${formatDateForDisplay(date)}-daily.md`;
}

export { formatDateForDisplay };