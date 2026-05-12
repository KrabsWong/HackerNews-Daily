/**
 * Translator Service
 */

import { DeepSeekProvider } from '../llm';
import type { ChatMessage } from '../../types';

export interface TranslatorConfig {
  apiKey: string;
  model?: string;
}

export class Translator {
  private provider: DeepSeekProvider | null = null;

  init(config: TranslatorConfig): void {
    this.provider = new DeepSeekProvider(config.apiKey, config.model);
  }

  /**
   * 批量翻译标题
   */
  async translateTitles(titles: string[]): Promise<string[]> {
    if (!this.provider) {
      throw new Error('Translator not initialized');
    }

    const results: string[] = [];

    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      console.log(`  [${i + 1}/${titles.length}] 翻译标题...`);

      try {
        const response = await this.provider.chatCompletion([
          {
            role: 'system',
            content: '你是一个专业的技术翻译。请将用户提供的英文标题翻译成简洁的中文。只返回翻译结果。',
          },
          { role: 'user', content: title },
        ], 0.3);

        results.push(response.content.trim());
      } catch (error) {
        console.warn(`  ⚠️  翻译失败: ${error}`);
        results.push(title);
      }
    }

    return results;
  }

  /**
   * 批量摘要内容
   */
  async summarizeContents(
    contents: (string | null)[],
    maxLength: number = 300
  ): Promise<string[]> {
    if (!this.provider) {
      throw new Error('Translator not initialized');
    }

    const results: string[] = [];

    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      console.log(`  [${i + 1}/${contents.length}] 生成内容摘要...`);

      if (!content) {
        results.push('暂无摘要');
        continue;
      }

      try {
        const response = await this.provider.chatCompletion([
          {
            role: 'system',
            content: `你是内容摘要助手。请用中文总结文章内容，控制在${maxLength}字以内。只返回摘要内容。`,
          },
          { role: 'user', content: content.substring(0, 5000) },
        ], 0.3);

        results.push(response.content.trim());
      } catch (error) {
        console.warn(`  ⚠️  摘要失败: ${error}`);
        results.push('暂无摘要');
      }
    }

    return results;
  }

  /**
   * 批量摘要评论
   */
  async summarizeComments(
    commentsBatch: string[],
    maxLength: number = 300
  ): Promise<(string | null)[]> {
    if (!this.provider) {
      throw new Error('Translator not initialized');
    }

    const results: (string | null)[] = [];

    for (let i = 0; i < commentsBatch.length; i++) {
      const comments = commentsBatch[i];
      console.log(`  [${i + 1}/${commentsBatch.length}] 生成评论摘要...`);

      if (!comments || comments.trim().length === 0) {
        results.push(null);
        continue;
      }

      try {
        const response = await this.provider.chatCompletion([
          {
            role: 'system',
            content: `你是评论摘要助手。请用中文总结评论核心观点，控制在${maxLength}字以内。只返回摘要内容。`,
          },
          { role: 'user', content: comments.substring(0, 3000) },
        ], 0.3);

        results.push(response.content.trim());
      } catch (error) {
        console.warn(`  ⚠️  评论摘要失败: ${error}`);
        results.push(null);
      }
    }

    return results;
  }
}

export const translator = new Translator();