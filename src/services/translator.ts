import { HNComment, stripHTML } from '../api/hackerNews';
import { CONTENT_CONFIG, LLM_BATCH_CONFIG } from '../config/constants';
import { 
  LLMProvider, 
  createLLMProvider, 
  CreateProviderOptions,
  FetchError 
} from './llmProvider';

class TranslationService {
  private provider: LLMProvider | null = null;
  private initialized = false;

  /**
   * Split array into chunks for batch processing
   * If size is 0 or >= array length, returns entire array as single batch (no splitting)
   */
  private chunk<T>(arr: T[], size: number): T[][] {
    if (size === 0 || size >= arr.length) {
      return [arr];
    }
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Initialize the translation service with LLM provider
   * @param apiKeyOrOptions - API key string (for backward compatibility) or provider options
   */
  init(apiKeyOrOptions?: string | CreateProviderOptions): void {
    if (this.initialized) {
      return;
    }

    // Handle backward compatibility: if a string is passed, treat it as deepseekApiKey
    const options: CreateProviderOptions = typeof apiKeyOrOptions === 'string'
      ? { deepseekApiKey: apiKeyOrOptions }
      : apiKeyOrOptions || {};

    this.provider = createLLMProvider(options);
    this.initialized = true;
    
    console.log(`Translation service initialized with ${this.provider.getName()} provider (model: ${this.provider.getModel()})`);
  }

  /**
   * Get the current provider (for testing or advanced usage)
   */
  getProvider(): LLMProvider | null {
    return this.provider;
  }

  /**
   * Translate a single title to Chinese
   * Returns original title if translation fails
   */
  async translateTitle(title: string, retry = true): Promise<string> {
    if (!this.provider) {
      throw new Error('Translation service not initialized');
    }

    // Check if title is already in Chinese (contains Chinese characters)
    if (/[\u4e00-\u9fa5]/.test(title)) {
      return title;
    }

    try {
      const response = await this.provider.chatCompletion({
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
      });

      const translation = response.content;
      
      if (!translation) {
        console.warn(`Translation returned empty for: ${title.substring(0, 50)}...`);
        return title;
      }

      return translation;
    } catch (error) {
      // Retry once on rate limit or temporary errors
      if (retry && error instanceof FetchError && error.status === 429 && this.provider) {
        console.warn('Rate limit hit, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, this.provider!.getRetryDelay()));
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

    if (!this.provider) {
      throw new Error('Translation service not initialized');
    }

    try {
      const response = await this.provider.chatCompletion({
        messages: [
          {
            role: 'user',
            content: `Translate this article description to Chinese. Only output the translation, no explanations: ${description}`
          }
        ],
        temperature: 0.3,
      });

      const translation = response.content;
      
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
    if (!this.provider) {
      throw new Error('Translation service not initialized');
    }

    // Handle empty content
    if (!content || content.trim() === '') {
      return null;
    }

    try {
      const response = await this.provider.chatCompletion({
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
      });

      const summary = response.content;
      
      if (!summary) {
        console.warn(`Summarization returned empty`);
        return null;
      }

      return summary;
    } catch (error) {
      // Retry once on rate limit or temporary errors
      if (retry && error instanceof FetchError && error.status === 429 && this.provider) {
        console.warn('Rate limit hit during summarization, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, this.provider!.getRetryDelay()));
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
    if (!this.provider) {
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

      const response = await this.provider.chatCompletion({
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
      });

      const summary = response.content;
      
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

  /**
   * Batch translate multiple titles in a single API call (OPTIMIZED)
   * Reduces API calls from N to ceil(N/batchSize)
   * @param titles - Array of titles to translate
   * @param batchSize - Number of titles per batch (default 10)
   * @returns Array of translated titles in the same order
   */
  async translateTitlesBatch(titles: string[], batchSize: number = 10): Promise<string[]> {
    if (!this.provider) {
      throw new Error('Translation service not initialized');
    }

    if (titles.length === 0) {
      return [];
    }

    const batches = this.chunk(titles, batchSize);
    const allTranslations: string[] = [];

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      
      try {
        const response = await this.provider.chatCompletion({
          messages: [
            {
              role: 'user',
              content: `Translate the following HackerNews titles to Chinese. Return ONLY a JSON array of translated titles in the same order.

Input JSON array:
${JSON.stringify(batch, null, 2)}

Rules:
1. PRESERVE technical terms (TypeScript, JavaScript, GitHub, API, AWS, React, etc.)
2. Output ONLY the JSON array, no explanations or markdown code blocks
3. Maintain exact order
4. Each translation should be accurate and natural Chinese
5. Do NOT add any numbering or prefix like "Translation 1:", just the translated text

Output format example: ["First translated title here", "Second translated title here"]`
            }
          ],
          temperature: 0.3,
        });

        const content = response.content;
        
        if (!content) {
          console.warn(`Batch translation ${batchIdx + 1} returned empty, falling back to individual`);
          // Fallback to individual translation
          for (const title of batch) {
            const translated = await this.translateTitle(title);
            allTranslations.push(translated);
          }
          continue;
        }

        // Remove markdown code blocks if present
        const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim();
        
        try {
          const translations = JSON.parse(cleanContent);
          
          if (Array.isArray(translations) && translations.length === batch.length) {
            allTranslations.push(...translations);
          } else {
            console.warn(`Batch ${batchIdx + 1}: Expected ${batch.length} translations, got ${translations.length}, falling back`);
            // Fallback to individual translation
            for (const title of batch) {
              const translated = await this.translateTitle(title);
              allTranslations.push(translated);
            }
          }
        } catch (parseError) {
          console.warn(`Batch ${batchIdx + 1}: Failed to parse JSON, falling back to individual translation`);
          // Fallback to individual translation
          for (const title of batch) {
            const translated = await this.translateTitle(title);
            allTranslations.push(translated);
          }
        }
      } catch (error) {
        console.warn(`Batch ${batchIdx + 1}: API error, falling back to individual translation:`, error instanceof Error ? error.message : 'Unknown');
        // Fallback to individual translation
        for (const title of batch) {
          const translated = await this.translateTitle(title);
          allTranslations.push(translated);
        }
      }

      // Show progress
      console.log(`Batch translated ${allTranslations.length}/${titles.length} titles...`);
    }

    return allTranslations;
  }

  /**
   * Batch summarize multiple article contents in a single API call (OPTIMIZED)
   * @param contents - Array of article contents to summarize
   * @param maxLength - Target summary length in characters
   * @param batchSize - Number of articles per batch (default 10)
   * @returns Array of summaries (null for empty contents)
   */
  async summarizeContentBatch(
    contents: (string | null)[],
    maxLength: number,
    batchSize: number = 10
  ): Promise<(string | null)[]> {
    if (!this.provider) {
      throw new Error('Translation service not initialized');
    }

    if (contents.length === 0) {
      return [];
    }

    // Filter out null/empty contents and track their indices
    const validContents: Array<{ index: number; content: string }> = [];
    contents.forEach((content, index) => {
      if (content && content.trim() !== '') {
        validContents.push({ index, content });
      }
    });

    if (validContents.length === 0) {
      return contents.map(() => null);
    }

    const batches = this.chunk(validContents, batchSize);
    const summaries: (string | null)[] = new Array(contents.length).fill(null);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      
      try {
        // Prepare batch input as JSON array
        // Use configured max length per article, or full content if set to 0
        const maxContentLength = LLM_BATCH_CONFIG.MAX_CONTENT_PER_ARTICLE;
        const batchInput = batch.map(item => ({
          index: item.index,
          content: maxContentLength > 0 ? item.content.substring(0, maxContentLength) : item.content,
        }));

        const response = await this.provider.chatCompletion({
          messages: [
            {
              role: 'user',
              content: `请用中文总结以下文章内容。返回一个 JSON 数组，每个元素是对应文章的摘要。

输入 JSON 数组：
${JSON.stringify(batchInput, null, 2)}

要求：
- 每个摘要长度约为 ${maxLength} 个字符
- 抓住文章的核心要点和关键见解
- 使用清晰、简洁的中文表达
- 直接输出摘要内容，不要添加"文章1:"、"摘要1:"等任何序号或标记前缀
- 输出格式示例：["这是第一篇文章的摘要内容...", "这是第二篇文章的摘要内容..."]
- 只输出 JSON 数组，不要其他说明`
            }
          ],
          temperature: 0.5,
        });

        const content = response.content;
        
        if (!content) {
          console.warn(`Batch summarization ${batchIdx + 1} returned empty, falling back`);
          // Fallback to individual
          for (const item of batch) {
            const summary = await this.summarizeContent(item.content, maxLength);
            summaries[item.index] = summary;
          }
          continue;
        }

        const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim();
        
        try {
          const batchSummaries = JSON.parse(cleanContent);
          
          if (Array.isArray(batchSummaries) && batchSummaries.length === batch.length) {
            batch.forEach((item, idx) => {
              summaries[item.index] = batchSummaries[idx];
            });
          } else {
            console.warn(`Batch ${batchIdx + 1}: Expected ${batch.length} summaries, got ${batchSummaries.length}`);
            // Fallback
            for (const item of batch) {
              const summary = await this.summarizeContent(item.content, maxLength);
              summaries[item.index] = summary;
            }
          }
        } catch (parseError) {
          console.warn(`Batch ${batchIdx + 1}: Parse error, falling back`);
          for (const item of batch) {
            const summary = await this.summarizeContent(item.content, maxLength);
            summaries[item.index] = summary;
          }
        }
      } catch (error) {
        console.warn(`Batch ${batchIdx + 1}: API error, falling back:`, error instanceof Error ? error.message : 'Unknown');
        for (const item of batch) {
          const summary = await this.summarizeContent(item.content, maxLength);
          summaries[item.index] = summary;
        }
      }

      console.log(`Batch summarized ${batchIdx + 1}/${batches.length} batches...`);
    }

    return summaries;
  }

  /**
   * Batch summarize comments for multiple stories (OPTIMIZED)
   * @param commentArrays - Array of comment arrays (one per story)
   * @param batchSize - Number of stories per batch (default 10)
   * @returns Array of comment summaries (null for insufficient comments)
   */
  async summarizeCommentsBatch(
    commentArrays: HNComment[][],
    batchSize: number = 10
  ): Promise<(string | null)[]> {
    if (!this.provider) {
      throw new Error('Translation service not initialized');
    }

    if (commentArrays.length === 0) {
      return [];
    }

    // Filter stories with enough comments
    const validStories: Array<{ index: number; comments: HNComment[] }> = [];
    commentArrays.forEach((comments, index) => {
      if (comments && comments.length >= CONTENT_CONFIG.MIN_COMMENTS_FOR_SUMMARY) {
        validStories.push({ index, comments });
      }
    });

    if (validStories.length === 0) {
      return commentArrays.map(() => null);
    }

    const batches = this.chunk(validStories, batchSize);
    const summaries: (string | null)[] = new Array(commentArrays.length).fill(null);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      
      try {
        // Prepare batch input
        const batchInput = batch.map(item => {
          const commentTexts = item.comments.map(c => stripHTML(c.text)).filter(t => t.length > 0);
          let combined = commentTexts.join('\n---\n');
          if (combined.length > CONTENT_CONFIG.MAX_COMMENTS_LENGTH) {
            combined = combined.substring(0, CONTENT_CONFIG.MAX_COMMENTS_LENGTH) + '...';
          }
          return {
            index: item.index,
            comments: combined,
          };
        });

        const response = await this.provider.chatCompletion({
          messages: [
            {
              role: 'user',
              content: `总结以下 HackerNews 评论中的关键讨论要点。返回 JSON 数组，每个元素是对应评论的摘要。

输入 JSON 数组：
${JSON.stringify(batchInput, null, 2)}

要求：
- 总结长度约为 100 个字符
- 保留重要的技术术语、库名称、工具名称
- 捕捉评论中的主要观点和共识
- 直接输出摘要内容，不要添加"摘要1:"等任何序号或标记前缀
- 输出格式示例：["评论讨论了某技术的优缺点...", "用户普遍认为..."]
- 只输出 JSON 数组`
            }
          ],
          temperature: 0.5,
        });

        const content = response.content;
        
        if (!content) {
          console.warn(`Batch comment summarization ${batchIdx + 1} returned empty`);
          for (const item of batch) {
            const summary = await this.summarizeComments(item.comments);
            summaries[item.index] = summary;
          }
          continue;
        }

        const cleanContent = content.replace(/```json\n?|```\n?/g, '').trim();
        
        try {
          const batchSummaries = JSON.parse(cleanContent);
          
          if (Array.isArray(batchSummaries) && batchSummaries.length === batch.length) {
            batch.forEach((item, idx) => {
              summaries[item.index] = batchSummaries[idx];
            });
          } else {
            console.warn(`Batch ${batchIdx + 1}: Expected ${batch.length} summaries, got ${batchSummaries.length}`);
            for (const item of batch) {
              const summary = await this.summarizeComments(item.comments);
              summaries[item.index] = summary;
            }
          }
        } catch (parseError) {
          console.warn(`Batch ${batchIdx + 1}: Parse error`);
          for (const item of batch) {
            const summary = await this.summarizeComments(item.comments);
            summaries[item.index] = summary;
          }
        }
      } catch (error) {
        console.warn(`Batch ${batchIdx + 1}: API error:`, error instanceof Error ? error.message : 'Unknown');
        for (const item of batch) {
          const summary = await this.summarizeComments(item.comments);
          summaries[item.index] = summary;
        }
      }

      console.log(`Batch summarized comments ${batchIdx + 1}/${batches.length} batches...`);
    }

    return summaries;
  }
}

// Export singleton instance
export const translator = new TranslationService();

// Re-export types for convenience
export { CreateProviderOptions } from './llmProvider';
