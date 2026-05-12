/**
 * DeepSeek LLM Provider
 */

import { post } from '../../utils/fetch';
import { LLMError } from '../../types';
import type { LLMProvider, ChatMessage, ChatCompletionResponse } from '../../types';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_TIMEOUT = 30000;

export class DeepSeekProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'deepseek-v4-flash') {
    this.apiKey = apiKey;
    this.model = model;
  }

  getName(): string {
    return 'deepseek';
  }

  getModel(): string {
    return this.model;
  }

  async chatCompletion(messages: ChatMessage[], temperature: number = 0.3): Promise<ChatCompletionResponse> {
    const url = `${DEEPSEEK_BASE_URL}/chat/completions`;
    
    const body = {
      model: this.model,
      messages,
      temperature,
      max_tokens: 4096,
    };

    try {
      const response = await post<any>(url, body, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: DEEPSEEK_TIMEOUT,
      });

      const content = response.data?.choices?.[0]?.message?.content?.trim();
      
      if (!content) {
        throw new LLMError('Empty response from DeepSeek');
      }

      return {
        content,
        usage: response.data?.usage,
      };
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError(
        `DeepSeek API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}