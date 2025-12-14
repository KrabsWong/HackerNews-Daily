/**
 * Telegram Message Formatter
 * Converts ProcessedStory data to Telegram-compatible HTML format
 * Stories are merged into batched messages based on batch size configuration
 */

import type { ProcessedStory } from '../../../types/shared';

/** Delay between messages in milliseconds */
const MESSAGE_DELAY_MS = 500;

/** Default number of stories to merge per message */
const DEFAULT_BATCH_SIZE = 2;

/** Emoji numbers for story indices (1-10) */
const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

/**
 * Escape HTML special characters for Telegram
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Get emoji number for rank (1-10 uses emoji, 11+ uses text)
 */
function getRankEmoji(rank: number): string {
  if (rank >= 1 && rank <= 10) {
    return NUMBER_EMOJIS[rank - 1];
  }
  return `${rank}.`;
}

/**
 * Format a single story for Telegram HTML
 */
export function formatStoryMessage(story: ProcessedStory): string {
  const emoji = getRankEmoji(story.rank);
  const escapedTitle = escapeHtml(story.titleChinese);
  const escapedDescription = escapeHtml(story.description);
  
  let text = `${emoji} <b>${escapedTitle}</b>\n\n`;
  text += `🔗 <a href="${story.url}">原文链接</a>\n\n`;
  text += `📝 ${escapedDescription}`;
  
  if (story.commentSummary) {
    const escapedComment = escapeHtml(story.commentSummary);
    text += `\n\n💬 <b>评论要点</b>: ${escapedComment}`;
  }
  
  return text;
}

/**
 * Format header message for the daily digest
 */
function formatHeaderMessage(dateStr: string, storyCount: number): string {
  return `📰 <b>HackerNews 日报</b> | ${dateStr}\n\n` +
    `今日精选 ${storyCount} 篇文章`;
}

/**
 * Format footer message after all stories
 */
function formatFooterMessage(dateStr: string, storyCount: number): string {
  return `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📰 <b>HackerNews 日报</b> | ${dateStr}\n\n` +
    `✅ 今日 ${storyCount} 篇文章已全部推送完毕`;
}

/**
 * Format multiple stories into a single merged message
 * Stories are separated by visual dividers
 */
function formatBatchMessage(stories: ProcessedStory[]): string {
  if (stories.length === 0) {
    return '';
  }
  
  const storyTexts = stories.map(story => formatStoryMessage(story));
  
  // Join stories with separator
  return storyTexts.join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');
}

/**
 * Format all stories into batched messages
 * Merges multiple stories per message based on batch size
 * 
 * @param stories - Array of processed stories
 * @param dateStr - Date string for the digest
 * @param batchSize - Number of stories to merge per message
 * @returns Array of messages: [header, batch1, batch2, ..., footer]
 * 
 * @example
 * // 10 stories with batchSize=2 returns 7 messages:
 * // [header, stories1-2, stories3-4, stories5-6, stories7-8, stories9-10, footer]
 */
export function formatMessagesWithBatching(
  stories: ProcessedStory[], 
  dateStr: string,
  batchSize: number
): string[] {
  if (stories.length === 0) {
    return [`📰 <b>HackerNews 日报</b> | ${dateStr}\n\n今日暂无更新内容。`];
  }
  
  const messages: string[] = [];
  
  // Add header message
  messages.push(formatHeaderMessage(dateStr, stories.length));
  
  // Split stories into batches and create merged messages
  for (let i = 0; i < stories.length; i += batchSize) {
    const batch = stories.slice(i, i + batchSize);
    messages.push(formatBatchMessage(batch));
  }
  
  // Add footer message
  messages.push(formatFooterMessage(dateStr, stories.length));
  
  return messages;
}

/**
 * Get the delay between messages in milliseconds
 */
export function getMessageDelay(): number {
  return MESSAGE_DELAY_MS;
}

/**
 * Get the batch size (number of stories to merge per message)
 * Can be overridden by environment variable TELEGRAM_BATCH_SIZE
 * 
 * @returns Batch size between 1 and 10 (default: 2)
 */
export function getBatchSize(): number {
  const envBatchSize = process.env.TELEGRAM_BATCH_SIZE;
  if (envBatchSize) {
    const parsed = parseInt(envBatchSize, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
      return parsed;
    }
  }
  return DEFAULT_BATCH_SIZE;
}
