import axios, { AxiosError } from 'axios';

const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';
const REQUEST_TIMEOUT = 30000; // 30 seconds for translation
const RETRY_DELAY = 1000; // 1 second

interface DeepSeekMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class TranslationService {
  private apiKey: string | null = null;
  private initialized = false;

  /**
   * Initialize the translation service with API key from environment
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    this.apiKey = process.env.DEEPSEEK_API_KEY || null;
    
    if (!this.apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY environment variable is required.\n' +
        'Please create a .env file with your DeepSeek API key.\n' +
        'Example: DEEPSEEK_API_KEY=your_api_key_here'
      );
    }

    this.initialized = true;
  }

  /**
   * Translate a single title to Chinese
   * Returns original title if translation fails
   */
  async translateTitle(title: string, retry = true): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Translation service not initialized');
    }

    // Check if title is already in Chinese (contains Chinese characters)
    if (/[\u4e00-\u9fa5]/.test(title)) {
      return title;
    }

    try {
      const request: DeepSeekRequest = {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `Translate this HackerNews title to Chinese. Only output the translation, no explanations: ${title}`
          }
        ],
        temperature: 0.3,
      };

      const response = await axios.post<DeepSeekResponse>(
        `${DEEPSEEK_API_BASE}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      const translation = response.data.choices[0]?.message?.content?.trim();
      
      if (!translation) {
        console.warn(`Translation returned empty for: ${title.substring(0, 50)}...`);
        return title;
      }

      return translation;
    } catch (error) {
      // Retry once on rate limit or temporary errors
      if (retry && error instanceof AxiosError && error.response?.status === 429) {
        console.warn('Rate limit hit, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.translateTitle(title, false);
      }

      console.warn(`Translation failed for: ${title.substring(0, 50)}... - ${error instanceof Error ? error.message : 'Unknown error'}`);
      return title; // Fallback to original
    }
  }

  /**
   * Translate multiple titles sequentially
   * Maintains order and handles errors gracefully
   */
  async translateBatch(titles: string[]): Promise<string[]> {
    const translations: string[] = [];
    
    for (let i = 0; i < titles.length; i++) {
      const translation = await this.translateTitle(titles[i]);
      translations.push(translation);
      
      // Show progress
      if ((i + 1) % 5 === 0 || i === titles.length - 1) {
        console.log(`Translated ${i + 1}/${titles.length} titles...`);
      }
    }
    
    return translations;
  }

  /**
   * Translate a description text to Chinese
   * Returns "暂无描述" if description is null/empty
   * Returns original text if translation fails
   */
  async translateDescription(description: string | null): Promise<string> {
    // Handle null or empty descriptions
    if (!description || description.trim() === '') {
      return '暂无描述';
    }

    // Check if already in Chinese
    if (/[\u4e00-\u9fa5]/.test(description)) {
      return description;
    }

    try {
      const request: DeepSeekRequest = {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `Translate this article description to Chinese. Only output the translation, no explanations: ${description}`
          }
        ],
        temperature: 0.3,
      };

      const response = await axios.post<DeepSeekResponse>(
        `${DEEPSEEK_API_BASE}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: REQUEST_TIMEOUT,
        }
      );

      const translation = response.data.choices[0]?.message?.content?.trim();
      
      if (!translation) {
        console.warn(`Description translation returned empty, using fallback`);
        return '暂无描述';
      }

      return translation;
    } catch (error) {
      console.warn(`Description translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return description; // Fallback to original
    }
  }

  /**
   * Translate multiple descriptions sequentially
   * Maintains order and handles errors gracefully
   */
  async translateDescriptionsBatch(descriptions: (string | null)[]): Promise<string[]> {
    const translations: string[] = [];
    
    for (let i = 0; i < descriptions.length; i++) {
      const translation = await this.translateDescription(descriptions[i]);
      translations.push(translation);
      
      // Show progress
      if ((i + 1) % 5 === 0 || i === descriptions.length - 1) {
        console.log(`Translated ${i + 1}/${descriptions.length} descriptions...`);
      }
    }
    
    return translations;
  }
}

// Export singleton instance
export const translator = new TranslationService();
