/**
 * Content and comment summarization functions
 * Handles both single-item and batch summarization operations
 * 
 * NOTE: Batch functions use concurrent single-item processing to ensure
 * index-to-content alignment. This is more reliable than batch prompts
 * where LLM response order is not guaranteed.
 */

import { fromPromise } from '../../utils/result';
import { HNComment } from '../../types/api';
import { stripHTML } from '../../utils/html';
import { chunk, MAX_RETRIES, delay } from '../../utils/array';
import { getErrorMessage } from '../../worker/logger';
import { CONTENT_CONFIG, LLM_BATCH_CONFIG } from '../../config/constants';
import { LLMProvider, FetchError } from '../llm';
import { translateDescription } from './title';
import { ProgressTracker } from './progress';

// ============================================
// Single-Item Summarization Functions
// ============================================

/**
 * Generate an AI-powered summary of article content in Chinese
 * Uses loop-based retry for rate limit handling
 * @param provider - LLM provider instance
 * @param content - Article content to summarize
 * @param maxLength - Target summary length in characters
 * @returns Chinese summary or null on failure
 */
export async function summarizeContent(
  provider: LLMProvider,
  content: string,
  maxLength: number
): Promise<string | null> {
  // Handle empty content
  if (!content?.trim()) {
    return null;
  }

  const prompt = `请用中文总结以下文章内容。要求：
- 总结长度约为 ${maxLength} 个字符
- 抓住文章的核心要点和关键见解
- 使用清晰、简洁的中文表达
- 专注于读者需要了解的内容

IMPORTANT OUTPUT REQUIREMENTS:
- Return ONLY the summary content in Chinese
- DO NOT include any meta-information, notes, or explanations
- DO NOT add character counts like "注:实际字符数XXX"
- DO NOT add prefixes like "总结:", "摘要:", "300字总结" or similar
- Output must be clean, ready-to-use content

文章内容：
${content}`;


  // Loop-based retry pattern
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await fromPromise(
      provider.chatCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
      })
    );

    if (result.ok) {
      const summary = result.value.content;
      if (!summary) {
        console.warn('Summarization returned empty');
        return null;
      }
      return summary;
    }

    // Check if retryable (rate limit)
    const isRateLimited =
      result.error instanceof FetchError && result.error.status === 429;

    if (isRateLimited && attempt < MAX_RETRIES) {
      console.warn(
        `Rate limit hit during summarization, retrying (${attempt}/${MAX_RETRIES})...`
      );
      await delay(provider.getRetryDelay());
      continue;
    }

    console.warn(`Summarization failed: ${getErrorMessage(result.error)}`);
    return null;
  }

  return null;
}

/**
 * Summarize HackerNews comments into a concise Chinese summary
 * @param provider - LLM provider instance
 * @param comments - Array of comment objects to summarize
 * @returns Chinese summary or null if insufficient comments
 */
export async function summarizeComments(
  provider: LLMProvider,
  comments: HNComment[]
): Promise<string | null> {
  // Need at least 3 comments for meaningful summary
  if (!comments || comments.length < CONTENT_CONFIG.MIN_COMMENTS_FOR_SUMMARY) {
    return null;
  }

  try {
    // Extract plain text from each comment
    const commentTexts = comments
      .map(comment => stripHTML(comment.text))
      .filter(text => text.length > 0);

    if (commentTexts.length < CONTENT_CONFIG.MIN_COMMENTS_FOR_SUMMARY) {
      return null;
    }

    // Concatenate comments with separators
    let combinedText = commentTexts.join('\n---\n');

    // Truncate if too long (prevent token limit issues)
    if (combinedText.length > CONTENT_CONFIG.MAX_COMMENTS_LENGTH) {
      combinedText =
        combinedText.substring(0, CONTENT_CONFIG.MAX_COMMENTS_LENGTH) + '...';
    }

    const response = await provider.chatCompletion({
      messages: [
        {
          role: 'user',
          content: `总结以下 HackerNews 评论中的关键讨论要点。要求：
- 总结长度约为 ${CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH} 个字符
- 保留重要的技术术语、库名称、工具名称（如 React、TypeScript、AWS 等）
- 捕捉评论中的主要观点和共识
- 如果有争议观点,提及不同立场和论据
- 如果讨论了具体实现、性能数据、或替代方案,尽量包含关键信息
- 使用清晰、准确的中文表达

IMPORTANT OUTPUT REQUIREMENTS:
- Return ONLY the summary content in Chinese
- DO NOT include any meta-information, notes, or explanations
- DO NOT add character counts like "注:实际字符数XXX"
- DO NOT add prefixes like "总结:", "评论要点:", "100字总结" or similar
- Output must be clean, ready-to-use content

评论内容：
${combinedText}`,
        },
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
    console.warn(
      `Comment summarization failed: ${getErrorMessage(error)}`
    );
    return null;
  }
}

/**
 * Summarize comments with retry logic for reliability
 * Retries on failure with exponential backoff
 * @param provider - LLM provider instance
 * @param comments - Array of comment objects to summarize
 * @param maxRetries - Maximum number of retry attempts (default 3)
 * @returns Chinese summary or null if all attempts fail
 */
export async function summarizeCommentsWithRetry(
  provider: LLMProvider,
  comments: HNComment[],
  maxRetries: number = 3
): Promise<string | null> {
  const baseDelay = 1000; // 1 second
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await summarizeComments(provider, comments);
      
      if (result) {
        if (attempt > 1) {
          console.log(`Comment translation succeeded on attempt ${attempt}`);
        }
        return result;
      }
      
      if (attempt < maxRetries) {
        console.warn(
          `Comment translation attempt ${attempt}/${maxRetries} returned empty, retrying...`
        );
        // Exponential backoff
        await delay(baseDelay * Math.pow(2, attempt - 1));
      }
    } catch (error) {
      console.warn(
        `Comment translation attempt ${attempt}/${maxRetries} failed: ${getErrorMessage(error)}`
      );
      
      if (attempt < maxRetries) {
        await delay(baseDelay * Math.pow(2, attempt - 1));
      }
    }
  }
  
  console.warn('All comment translation attempts failed, returning null');
  return null;
}

// ============================================
// Batch Summarization Functions
// ============================================

/**
 * Summarize multiple article contents with fallback to description translation
 * @param provider - LLM provider instance
 * @param contents - Array of article contents
 * @param fallbackDescriptions - Fallback descriptions if summarization fails
 * @param maxLength - Target summary length
 * @returns Array of summaries
 */
export async function summarizeBatchSequential(
  provider: LLMProvider,
  contents: (string | null)[],
  fallbackDescriptions: (string | null)[],
  maxLength: number
): Promise<string[]> {
  const progress = new ProgressTracker({ logInterval: 5 });
  const providerName = provider.getName();
  const modelName = provider.getModel();
  
  console.log(`Starting content summarization: ${contents.length} articles using ${providerName}/${modelName}`);
  progress.start(contents.length);
  
  const summaries: string[] = [];

  for (let i = 0; i < contents.length; i++) {
    let summary: string;

    // Try to summarize full content if available
    if (contents[i]) {
      const aiSummary = await summarizeContent(provider, contents[i]!, maxLength);
      if (aiSummary) {
        summary = aiSummary;
      } else {
        // Fallback to translating meta description
        summary = await translateDescription(provider, fallbackDescriptions[i]);
      }
    } else {
      // No full content available, use meta description
      summary = await translateDescription(provider, fallbackDescriptions[i]);
    }

    summaries.push(summary);

    // Show progress
    if (progress.update(i + 1) || progress.shouldLogByTime(30)) {
      console.log(progress.formatMessage('content summarization', providerName, modelName));
    }
  }

  console.log(`Completed content summarization: ${summaries.length}/${contents.length} articles in ${progress.getElapsedSeconds()}s`);
  return summaries;
}

/**
 * Batch summarize multiple article contents using concurrent single-item processing
 * 
 * This function uses concurrent single-item LLM calls instead of batch prompts.
 * This ensures 100% reliable index-to-content mapping because:
 * 1. Each content is processed in a separate LLM request
 * 2. Index mapping is controlled by code, not dependent on LLM response order
 * 3. No JSON array parsing that could reorder or lose items
 * 
 * @param provider - LLM provider instance
 * @param contents - Array of article contents to summarize
 * @param maxLength - Target summary length in characters
 * @param concurrency - Number of concurrent LLM requests (default from config)
 * @returns Array of summaries (empty string for empty contents, preserving indices)
 */
export async function summarizeContentBatch(
  provider: LLMProvider,
  contents: (string | null)[],
  maxLength: number,
  concurrency: number = LLM_BATCH_CONFIG.DEFAULT_CONCURRENCY
): Promise<string[]> {
  if (contents.length === 0) {
    return [];
  }

  const progress = new ProgressTracker({ logInterval: 5 });
  const providerName = provider.getName();
  const modelName = provider.getModel();
  
  console.log(`Starting content summarization: ${contents.length} articles using ${providerName}/${modelName} (concurrency: ${concurrency})`);

  // Build items with content only, but keep track of all indices
  const itemsToProcess: Array<{ index: number; content: string }> = [];
  contents.forEach((content, index) => {
    if (content?.trim()) {
      itemsToProcess.push({ index, content });
    }
  });

  // Initialize results array with empty strings (preserving all indices)
  const summaries: string[] = new Array(contents.length).fill('');
  
  if (itemsToProcess.length === 0) {
    console.log(`[Content Summary] No valid content found, returning empty summaries array`);
    return summaries;
  }

  progress.start(contents.length);
  
  // Log alignment information for debugging
  console.log(`[Content Summary] Processing: ${contents.length} total items, ${itemsToProcess.length} with valid content, ${contents.length - itemsToProcess.length} empty/null`);

  // Process items with concurrency control using chunk + Promise.all
  const batches = chunk(itemsToProcess, concurrency);
  let processedCount = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    
    console.log(`[Content Summary] Processing batch ${batchIdx + 1}/${batches.length}: ${batch.length} articles concurrently | Provider: ${providerName}/${modelName}`);

    // Process all items in this batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const summary = await summarizeContent(provider, item.content, maxLength);
        return { index: item.index, summary: summary || '' };
      })
    );

    // Map results back to original indices - this is 100% reliable because
    // we control the index assignment in code, not depending on LLM output order
    for (const { index, summary } of batchResults) {
      summaries[index] = summary;
      processedCount++;
    }

    if (progress.update(processedCount) || progress.shouldLogByTime(30)) {
      console.log(progress.formatMessage('content summarization', providerName, modelName));
    }
  }

  const completedCount = summaries.filter(s => s !== '').length;
  console.log(`Completed content summarization: ${completedCount}/${contents.length} articles in ${progress.getElapsedSeconds()}s`);
  return summaries;
}

/**
 * Batch summarize comments for multiple stories using concurrent single-item processing
 * 
 * This function uses concurrent single-item LLM calls instead of batch prompts.
 * This ensures 100% reliable index-to-content mapping because:
 * 1. Each story's comments are processed in a separate LLM request
 * 2. Index mapping is controlled by code, not dependent on LLM response order
 * 3. No JSON array parsing that could reorder or lose items
 * 
 * @param provider - LLM provider instance
 * @param commentArrays - Array of comment arrays (one per story)
 * @param concurrency - Number of concurrent LLM requests (default from config)
 * @returns Array of comment summaries (empty string for insufficient comments, preserving indices)
 */
export async function summarizeCommentsBatch(
  provider: LLMProvider,
  commentArrays: HNComment[][],
  concurrency: number = LLM_BATCH_CONFIG.DEFAULT_CONCURRENCY
): Promise<string[]> {
  if (commentArrays.length === 0) {
    return [];
  }

  const progress = new ProgressTracker({ logInterval: 5 });
  const providerName = provider.getName();
  const modelName = provider.getModel();
  
  console.log(`Starting comment summarization: ${commentArrays.length} stories using ${providerName}/${modelName} (concurrency: ${concurrency})`);

  // Filter stories with enough comments
  const storiesToProcess: Array<{ index: number; comments: HNComment[] }> = [];
  commentArrays.forEach((comments, index) => {
    if (comments?.length >= CONTENT_CONFIG.MIN_COMMENTS_FOR_SUMMARY) {
      storiesToProcess.push({ index, comments });
    }
  });

  // Initialize results array with empty strings (preserving all indices)
  const summaries: string[] = new Array(commentArrays.length).fill('');
  
  if (storiesToProcess.length === 0) {
    console.log(`[Comment Summary] No stories with sufficient comments, returning empty summaries array`);
    return summaries;
  }

  progress.start(commentArrays.length);
  
  // Log alignment information for debugging
  console.log(`[Comment Summary] Processing: ${commentArrays.length} total stories, ${storiesToProcess.length} with sufficient comments, ${commentArrays.length - storiesToProcess.length} insufficient`);

  // Process items with concurrency control using chunk + Promise.all
  const batches = chunk(storiesToProcess, concurrency);
  let processedCount = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    
    console.log(`[Comment Summary] Processing batch ${batchIdx + 1}/${batches.length}: ${batch.length} stories concurrently | Provider: ${providerName}/${modelName}`);

    // Process all items in this batch concurrently
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const summary = await summarizeCommentsWithRetry(provider, item.comments);
        return { index: item.index, summary: summary || '' };
      })
    );

    // Map results back to original indices - this is 100% reliable because
    // we control the index assignment in code, not depending on LLM output order
    for (const { index, summary } of batchResults) {
      summaries[index] = summary;
      processedCount++;
    }

    if (progress.update(processedCount) || progress.shouldLogByTime(30)) {
      console.log(progress.formatMessage('comment summarization', providerName, modelName));
    }
  }

  const completedCount = summaries.filter(s => s !== '').length;
  console.log(`Completed comment summarization: ${completedCount}/${commentArrays.length} stories in ${progress.getElapsedSeconds()}s`);
  return summaries;
}
