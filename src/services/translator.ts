import { HNComment, stripHTML } from '../api/hackerNews';
import { DEEPSEEK_API, CONTENT_CONFIG } from '../config/constants';
import { post, FetchError } from '../utils/fetch';

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
            content: `Translate this HackerNews title to Chinese, following these rules:

1. PRESERVE technical terms in their original English form or use standard Chinese abbreviations:
   - Programming languages: TypeScript, Python, Rust, Go, JavaScript, C++, Java, etc.
   - Cloud services: AWS, Azure, GCP, Firebase, Vercel, etc.
   - Technical acronyms: API, HTTP, HTTPS, GPU, CPU, AI, ML, LLM, NLP, etc.
   - Products/Projects: GitHub, GitLab, OpenAI, TensorFlow, React, Vue, Docker, etc.
   - For well-known protocols/standards: Use abbreviations like "MCP协议" for "Model Context Protocol"

2. Only translate natural language portions (verbs, adjectives, common nouns)

3. Maintain readability for technical Chinese audiences

Title to translate: ${title}

Output only the translated title, no explanations.`
          }
        ],
        temperature: 0.3,
      };

      const response = await post<DeepSeekResponse>(
        `${DEEPSEEK_API.BASE_URL}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: DEEPSEEK_API.REQUEST_TIMEOUT,
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
      if (retry && error instanceof FetchError && error.status === 429) {
        console.warn('Rate limit hit, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, DEEPSEEK_API.RETRY_DELAY));
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

      const response = await post<DeepSeekResponse>(
        `${DEEPSEEK_API.BASE_URL}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: DEEPSEEK_API.REQUEST_TIMEOUT,
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
   * Generate an AI-powered summary of article content in Chinese
   * Returns null if summarization fails (triggers fallback to meta description)
   */
  async summarizeContent(content: string, maxLength: number, retry = true): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error('Translation service not initialized');
    }

    // Handle empty content
    if (!content || content.trim() === '') {
      return null;
    }

    try {
      const request: DeepSeekRequest = {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `请用中文总结以下文章内容。要求：
- 总结长度约为 ${maxLength} 个字符
- 抓住文章的核心要点和关键见解
- 使用清晰、简洁的中文表达
- 专注于读者需要了解的内容

文章内容：
${content}`
          }
        ],
        temperature: 0.5,
      };

      const response = await post<DeepSeekResponse>(
        `${DEEPSEEK_API.BASE_URL}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: DEEPSEEK_API.REQUEST_TIMEOUT,
        }
      );

      const summary = response.data.choices[0]?.message?.content?.trim();
      
      if (!summary) {
        console.warn(`Summarization returned empty`);
        return null;
      }

      return summary;
    } catch (error) {
      // Retry once on rate limit or temporary errors
      if (retry && error instanceof FetchError && error.status === 429) {
        console.warn('Rate limit hit during summarization, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, DEEPSEEK_API.RETRY_DELAY));
        return this.summarizeContent(content, maxLength, false);
      }

      console.warn(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null; // Return null to trigger fallback
    }
  }

  /**
   * Summarize HackerNews comments into a concise Chinese summary
   * Returns null if comments are insufficient (<3) or summarization fails
   * @param comments - Array of comment objects to summarize
   * @returns Chinese summary string or null
   */
  async summarizeComments(comments: HNComment[]): Promise<string | null> {
    if (!this.apiKey) {
      throw new Error('Translation service not initialized');
    }

    // Need at least 3 comments for meaningful summary
    if (!comments || comments.length < CONTENT_CONFIG.MIN_COMMENTS_FOR_SUMMARY) {
      return null;
    }

    try {
      // Extract plain text from each comment
      const commentTexts = comments.map(comment => stripHTML(comment.text)).filter(text => text.length > 0);
      
      if (commentTexts.length < CONTENT_CONFIG.MIN_COMMENTS_FOR_SUMMARY) {
        return null;
      }

      // Concatenate comments with separators
      let combinedText = commentTexts.join('\n---\n');
      
      // Truncate if too long (prevent token limit issues)
      if (combinedText.length > CONTENT_CONFIG.MAX_COMMENTS_LENGTH) {
        combinedText = combinedText.substring(0, CONTENT_CONFIG.MAX_COMMENTS_LENGTH) + '...';
      }

      const request: DeepSeekRequest = {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: `总结以下 HackerNews 评论中的关键讨论要点。要求：
- 总结长度约为 100 个字符
- 保留重要的技术术语、库名称、工具名称（如 React、TypeScript、AWS 等）
- 捕捉评论中的主要观点和共识
- 如果有争议观点，简要提及
- 使用清晰、简洁的中文表达

评论内容：
${combinedText}`
          }
        ],
        temperature: 0.5,
      };

      const response = await post<DeepSeekResponse>(
        `${DEEPSEEK_API.BASE_URL}/chat/completions`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: DEEPSEEK_API.REQUEST_TIMEOUT,
        }
      );

      const summary = response.data.choices[0]?.message?.content?.trim();
      
      if (!summary) {
        console.warn('Comment summarization returned empty');
        return null;
      }

      return summary;
    } catch (error) {
      console.warn(`Comment summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Summarize comments for multiple stories sequentially
   * @param commentArrays - Array of comment arrays (one per story)
   * @returns Array of summary strings (or null if insufficient comments)
   */
  async summarizeCommentsBatch(commentArrays: HNComment[][]): Promise<(string | null)[]> {
    const summaries: (string | null)[] = [];
    
    for (let i = 0; i < commentArrays.length; i++) {
      const comments = commentArrays[i];
      
      // Skip if too few comments
      if (comments.length < CONTENT_CONFIG.MIN_COMMENTS_FOR_SUMMARY) {
        summaries.push(null);
      } else {
        const summary = await this.summarizeComments(comments);
        summaries.push(summary);
      }
      
      // Show progress
      if ((i + 1) % 5 === 0 || i === commentArrays.length - 1) {
        console.log(`Summarized ${i + 1}/${commentArrays.length} comment threads...`);
      }
    }
    
    return summaries;
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

  /**
   * Summarize multiple article contents sequentially using AI
   * Falls back to meta description translation for failed summarizations
   * @param contents - Array of full article content strings
   * @param fallbackDescriptions - Array of meta descriptions to use if summarization fails
   * @param maxLength - Target summary length in characters
   */
  async summarizeBatch(
    contents: (string | null)[],
    fallbackDescriptions: (string | null)[],
    maxLength: number
  ): Promise<string[]> {
    const summaries: string[] = [];
    
    for (let i = 0; i < contents.length; i++) {
      let summary: string;
      
      // Try to summarize full content if available
      if (contents[i]) {
        const aiSummary = await this.summarizeContent(contents[i]!, maxLength);
        if (aiSummary) {
          summary = aiSummary;
        } else {
          // Fallback to translating meta description
          summary = await this.translateDescription(fallbackDescriptions[i]);
        }
      } else {
        // No full content available, use meta description
        summary = await this.translateDescription(fallbackDescriptions[i]);
      }
      
      summaries.push(summary);
      
      // Show progress
      if ((i + 1) % 5 === 0 || i === summaries.length - 1) {
        console.log(`Processed ${i + 1}/${contents.length} summaries...`);
      }
    }
    
    return summaries;
  }
}

// Export singleton instance
export const translator = new TranslationService();
