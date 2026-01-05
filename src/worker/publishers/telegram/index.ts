/**
 * Telegram Publisher
 * Publishes HackerNews daily digest to a Telegram channel
 * Multiple stories can be merged into a single message based on batch size
 */

import type { Publisher, PublishContent, PublisherConfig, TelegramPublisherConfig } from '../../../types/publisher';
import { PublisherType } from '../../../types/publisher';
import { sendMessage, delay } from './client';
import { formatMessagesWithBatching, getMessageDelay, getBatchSize } from './formatter';
import { logInfo, logError } from '../../logger';

/**
 * Telegram Publisher implementation
 * Sends formatted messages to a Telegram channel using the Bot API
 * Stories are merged into batches based on batch size configuration
 */
export class TelegramPublisher implements Publisher {
  readonly name = PublisherType.TELEGRAM;
  
  /**
   * Publish content to Telegram channel
   * Stories are merged into batches (e.g., batch_size=2 means 2 stories per message)
   * @param content - Content to publish (includes stories array)
   * @param config - Telegram-specific configuration
   */
  async publish(content: PublishContent, config: PublisherConfig): Promise<void> {
    // Type guard: ensure config is TelegramPublisherConfig
    if (config.type !== PublisherType.TELEGRAM) {
      throw new Error(`Invalid config type: expected '${PublisherType.TELEGRAM}', got '${config.type}'`);
    }
    
    // Validate required configuration
    if (!config.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN is required for Telegram publisher');
    }
    if (!config.TELEGRAM_CHANNEL_ID) {
      throw new Error('TELEGRAM_CHANNEL_ID is required for Telegram publisher');
    }
    
    // Format content into batched messages (multiple stories per message)
    const batchSize = getBatchSize();
    const messages = formatMessagesWithBatching(content.stories || [], content.dateStr, batchSize);
    const messageDelay = getMessageDelay();
    
    logInfo('Telegram: formatted content with batching', { 
      totalMessages: messages.length,
      storyCount: content.stories?.length || 0,
      batchSize,
      storiesPerMessage: batchSize,
      dateStr: content.dateStr
    });
    
    let successCount = 0;
    let failCount = 0;
    
    logInfo(`Telegram: sending ${messages.length} messages (including header/footer)`);
    
    // Send messages sequentially with delay between them
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        logInfo(`Telegram: sending message ${i + 1}/${messages.length}`, {
          length: message.length
        });
        
        await sendMessage(
          config.TELEGRAM_BOT_TOKEN,
          config.TELEGRAM_CHANNEL_ID,
          message,
          'HTML'
        );
        
        successCount++;
        logInfo(`Telegram: message ${i + 1}/${messages.length} sent successfully`);
        
        // Add delay between messages (except after last message)
        if (i < messages.length - 1) {
          await delay(messageDelay);
        }
      } catch (error) {
        failCount++;
        logError(`Telegram: failed to send message ${i + 1}/${messages.length}`, error);
        // Continue with other messages (graceful degradation)
      }
    }
    
    logInfo('Telegram: publishing completed', {
      channelId: config.TELEGRAM_CHANNEL_ID,
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
export { formatMessagesWithBatching, formatStoryMessage } from './formatter';
