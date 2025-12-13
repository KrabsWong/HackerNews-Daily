/**
 * Telegram Publisher
 * Publishes HackerNews daily digest to a Telegram channel
 * Each story is sent as a separate message for better readability
 */

import type { Publisher, PublishContent, PublisherConfig, TelegramPublisherConfig } from '../../../types/publisher';
import { sendMessage, delay } from './client';
import { formatMessages, getMessageDelay } from './formatter';
import { logInfo, logError } from '../../logger';

/**
 * Telegram Publisher implementation
 * Sends formatted messages to a Telegram channel using the Bot API
 */
export class TelegramPublisher implements Publisher {
  readonly name = 'telegram';
  
  /**
   * Publish content to Telegram channel
   * Each story is sent as a separate message
   * @param content - Content to publish (includes stories array)
   * @param config - Telegram-specific configuration
   */
  async publish(content: PublishContent, config: PublisherConfig): Promise<void> {
    const telegramConfig = config as TelegramPublisherConfig;
    
    // Validate required configuration
    if (!telegramConfig.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for Telegram publisher');
    }
    if (!telegramConfig.TELEGRAM_CHANNEL_ID) {
      throw new Error('TELEGRAM_CHANNEL_ID is required for Telegram publisher');
    }
    
    // Format content into messages (one per story)
    const messages = formatMessages(content.stories, content.dateStr);
    logInfo('Telegram: formatted content', { 
      messageCount: messages.length,
      storyCount: content.stories.length,
      dateStr: content.dateStr 
    });
    
    // Send messages sequentially with delay
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        logInfo(`Telegram: sending message ${i + 1}/${messages.length}`, {
          length: message.length
        });
        
        await sendMessage(
          telegramConfig.TELEGRAM_BOT_TOKEN,
          telegramConfig.TELEGRAM_CHANNEL_ID,
          message,
          'HTML'
        );
        
        successCount++;
        logInfo(`Telegram: message ${i + 1}/${messages.length} sent successfully`);
        
        // Add delay between messages to avoid rate limiting
        if (i < messages.length - 1) {
          await delay(getMessageDelay());
        }
      } catch (error) {
        failCount++;
        logError(`Telegram: failed to send message ${i + 1}/${messages.length}`, error);
        // Continue with other messages (graceful degradation)
        // Don't throw - try to send as many messages as possible
      }
    }
    
    logInfo('Telegram: publishing completed', {
      channelId: telegramConfig.TELEGRAM_CHANNEL_ID,
      totalMessages: messages.length,
      successCount,
      failCount
    });
    
    // Only throw if all messages failed
    if (successCount === 0 && messages.length > 0) {
      throw new Error(`Telegram: all ${messages.length} messages failed to send`);
    }
  }
}

// Re-export utilities
export { sendMessage } from './client';
export { formatMessages, formatStoryMessage } from './formatter';
