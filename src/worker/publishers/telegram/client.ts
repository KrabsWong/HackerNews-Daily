/**
 * Telegram Bot API Client
 * Provides methods to send messages to Telegram channels
 */

import type { TelegramMessageResponse } from '../../../types/publisher';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Send a message to a Telegram chat/channel
 * @param botToken - Telegram Bot API token
 * @param chatId - Target chat ID or @channel_username
 * @param text - Message text (max 4096 characters)
 * @param parseMode - Parse mode: 'HTML' or 'MarkdownV2'
 * @returns Response from Telegram API
 */
export async function sendMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'MarkdownV2' = 'HTML'
): Promise<TelegramMessageResponse> {
  const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode,
        disable_web_page_preview: false,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const result = await response.json() as TelegramMessageResponse;
    
    if (!result.ok) {
      throw new Error(
        `Telegram API error: ${result.description || 'Unknown error'} (code: ${result.error_code})`
      );
    }
    
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Telegram API request timed out');
    }
    
    throw error;
  }
}

/**
 * Delay execution for specified milliseconds
 * Used between messages to avoid rate limiting
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
