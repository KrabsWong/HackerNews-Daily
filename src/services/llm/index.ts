/**
 * LLM Service - DeepSeek Only
 */

import { DeepSeekProvider } from './deepseek';

export { DeepSeekProvider } from './deepseek';

export function createDeepSeekProvider(apiKey: string, model?: string): DeepSeekProvider {
  return new DeepSeekProvider(apiKey, model || 'deepseek-v4-flash');
}