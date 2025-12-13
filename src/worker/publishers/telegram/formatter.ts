/**
 * Telegram Message Formatter
 * Converts ProcessedStory data to Telegram-compatible HTML format
 * Each story is sent as a separate message for better readability
 */

import type { ProcessedStory } from '../../../types/shared';

const MESSAGE_DELAY_MS = 500;

// Emoji numbers for story indices
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
 * Returns a complete message for one story
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
export function formatHeaderMessage(dateStr: string, storyCount: number): string {
  return `📰 <b>HackerNews 日报</b> | ${dateStr}\n\n` +
    `今日精选 ${storyCount} 篇文章，逐条推送中...`;
}

/**
 * Format footer message after all stories
 */
export function formatFooterMessage(dateStr: string, storyCount: number): string {
  return `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📰 <b>HackerNews 日报</b> | ${dateStr}\n\n` +
    `✅ 今日 ${storyCount} 篇文章已全部推送完毕`;
}

/**
 * Format all stories into individual messages
 * Returns an array of messages: [header, story1, story2, ..., footer]
 */
export function formatMessages(stories: ProcessedStory[], dateStr: string): string[] {
  if (stories.length === 0) {
    return [`📰 <b>HackerNews 日报</b> | ${dateStr}\n\n今日暂无更新内容。`];
  }
  
  const messages: string[] = [];
  
  // Add header message
  messages.push(formatHeaderMessage(dateStr, stories.length));
  
  // Add each story as a separate message
  for (const story of stories) {
    messages.push(formatStoryMessage(story));
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
