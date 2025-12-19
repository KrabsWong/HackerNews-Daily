/**
 * Content and comment summarization functions
 * Handles both single-item and batch summarization operations
 */

import { fromPromise } from '../../utils/result';
import { HNComment } from '../../types/api';
import { stripHTML } from '../../utils/html';
import { chunk, parseJsonArray, MAX_RETRIES, delay } from '../../utils/array';
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
- 总结长度约为 100 个字符
- 保留重要的技术术语、库名称、工具名称（如 React、TypeScript、AWS 等）
- 捕捉评论中的主要观点和共识
- 如果有争议观点，简要提及
- 使用清晰、简洁的中文表达

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
 * Batch summarize multiple article contents in a single API call
 * Preserves array indices by keeping empty strings for null/missing content
 * @param provider - LLM provider instance
 * @param contents - Array of article contents to summarize
 * @param maxLength - Target summary length in characters
 * @param batchSize - Number of articles per batch (default 10)
 * @returns Array of summaries (empty string for empty contents, preserving indices)
 */
export async function summarizeContentBatch(
  provider: LLMProvider,
  contents: (string | null)[],
  maxLength: number,
  batchSize: number = 10
): Promise<string[]> {
  if (contents.length === 0) {
    return [];
  }

  const progress = new ProgressTracker({ logInterval: 5 });
  const providerName = provider.getName();
  const modelName = provider.getModel();
  
  console.log(`Starting batch content summarization: ${contents.length} articles using ${providerName}/${modelName}`);

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
  const batches = chunk(itemsToProcess, batchSize);
  let processedCount = 0;
  
  // Log alignment information for debugging
  console.log(`[Content Summary] Processing: ${contents.length} total items, ${itemsToProcess.length} with valid content, ${contents.length - itemsToProcess.length} empty/null`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    
    // Log batch start for better user visibility
    console.log(`[Content Summary] Processing batch ${batchIdx + 1}/${batches.length}: ${batch.length} articles | Provider: ${providerName}/${modelName}`);

    // Prepare batch input
    const maxContentLength = LLM_BATCH_CONFIG.MAX_CONTENT_PER_ARTICLE;
    const batchInput = batch.map(item => ({
      index: item.index,
      content:
        maxContentLength > 0
          ? item.content.substring(0, maxContentLength)
          : item.content,
    }));

    const result = await fromPromise(
      provider.chatCompletion({
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
- 只输出 JSON 数组，不要其他说明

IMPORTANT OUTPUT REQUIREMENTS:
- Return ONLY a JSON array of summaries
- DO NOT include any meta-information, notes, or explanations
- DO NOT add character counts like "注:实际字符数XXX" in the summaries
- DO NOT add prefixes like "总结:", "摘要:", "300字总结" to any summary
- Each array element must be clean, ready-to-use Chinese content`,
          },
        ],
        temperature: 0.5,
      })
    );

    // Handle API error
    if (!result.ok) {
      const errorMsg = getErrorMessage(result.error);
      console.error(`[Content Summary] Batch ${batchIdx + 1}/${batches.length} failed:`, {
        error: errorMsg,
        batchSize: batch.length,
        provider: providerName,
        model: modelName,
        fallbackStrategy: 'Processing items individually',
      });
      console.log(`[Content Summary] Fallback: Processing ${batch.length} items individually...`);
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        console.log(`[Content Summary] Fallback item ${i + 1}/${batch.length} | Provider: ${providerName}/${modelName}`);
        const summary = await summarizeContent(
          provider,
          item.content,
          maxLength
        );
        summaries[item.index] = summary || '';
        processedCount++;
      }
      
      if (progress.update(processedCount) || progress.shouldLogByTime(30)) {
        console.log(progress.formatMessage('content summarization', providerName, modelName));
      }
      continue;
    }

    const content = result.value.content;

    if (!content) {
      console.warn(`[Content Summary] Batch ${batchIdx + 1}/${batches.length} returned empty, falling back`);
      console.log(`[Content Summary] Fallback: Processing ${batch.length} items individually...`);
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        console.log(`[Content Summary] Fallback item ${i + 1}/${batch.length} | Provider: ${providerName}/${modelName}`);
        const summary = await summarizeContent(
          provider,
          item.content,
          maxLength
        );
        summaries[item.index] = summary || '';
        processedCount++;
      }
      
      if (progress.update(processedCount) || progress.shouldLogByTime(30)) {
        console.log(progress.formatMessage('content summarization', providerName, modelName));
      }
      continue;
    }

    // Parse JSON array using Result pattern
    const parseResult = parseJsonArray<string>(content, batch.length);

    if (parseResult.ok) {
      const results = parseResult.value;
      
      // Map results back to original indices, preserving order and length
      batch.forEach((item, idx) => {
        if (idx < results.length) {
          summaries[item.index] = results[idx] || '';
          processedCount++;
        } else {
          // If this item wasn't returned, log and mark for retry
          console.warn(`Batch ${batchIdx + 1}: Missing result for item ${idx + 1}, will retry individually`);
        }
      });
      
      // Retry items that didn't get results
      for (let idx = results.length; idx < batch.length; idx++) {
        const item = batch[idx];
        const summary = await summarizeContent(
          provider,
          item.content,
          maxLength
        );
        summaries[item.index] = summary || '';
        processedCount++;
      }
    } else {
      console.error(`[Content Summary] Batch ${batchIdx + 1}/${batches.length} JSON parse failed:`, {
        error: getErrorMessage(parseResult.error),
        expectedItems: batch.length,
        provider: providerName,
        model: modelName,
        note: 'Check parseJsonArray logs above for content preview',
        fallbackStrategy: 'Processing items individually',
      });
      console.log(`[Content Summary] Fallback: Processing ${batch.length} items individually...`);
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        console.log(`[Content Summary] Fallback item ${i + 1}/${batch.length} | Provider: ${providerName}/${modelName}`);
        const summary = await summarizeContent(
          provider,
          item.content,
          maxLength
        );
        summaries[item.index] = summary || '';
        processedCount++;
      }
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
 * Batch summarize comments for multiple stories
 * Preserves array indices by keeping empty strings for insufficient comments
 * @param provider - LLM provider instance
 * @param commentArrays - Array of comment arrays (one per story)
 * @param batchSize - Number of stories per batch (default 10)
 * @returns Array of comment summaries (empty string for insufficient comments, preserving indices)
 */
export async function summarizeCommentsBatch(
  provider: LLMProvider,
  commentArrays: HNComment[][],
  batchSize: number = 10
): Promise<string[]> {
  if (commentArrays.length === 0) {
    return [];
  }

  const progress = new ProgressTracker({ logInterval: 5 });
  const providerName = provider.getName();
  const modelName = provider.getModel();
  
  console.log(`Starting batch comment summarization: ${commentArrays.length} stories using ${providerName}/${modelName}`);

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
  const batches = chunk(storiesToProcess, batchSize);
  let processedCount = 0;
  
  // Log alignment information for debugging
  console.log(`[Comment Summary] Processing: ${commentArrays.length} total stories, ${storiesToProcess.length} with sufficient comments, ${commentArrays.length - storiesToProcess.length} insufficient`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    
    // Log batch start for better user visibility
    console.log(`[Comment Summary] Processing batch ${batchIdx + 1}/${batches.length}: ${batch.length} stories | Provider: ${providerName}/${modelName}`);

    // Prepare batch input
    const batchInput = batch.map(item => {
      const commentTexts = item.comments
        .map(c => stripHTML(c.text))
        .filter(t => t.length > 0);
      let combined = commentTexts.join('\n---\n');
      if (combined.length > CONTENT_CONFIG.MAX_COMMENTS_LENGTH) {
        combined =
          combined.substring(0, CONTENT_CONFIG.MAX_COMMENTS_LENGTH) + '...';
      }
      return { index: item.index, comments: combined };
    });

    const result = await fromPromise(
      provider.chatCompletion({
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
- 只输出 JSON 数组

IMPORTANT OUTPUT REQUIREMENTS:
- Return ONLY a JSON array of summaries
- DO NOT include any meta-information, notes, or explanations  
- DO NOT add character counts like "注:实际字符数XXX" in the summaries
- DO NOT add prefixes like "总结:", "评论要点:", "100字总结" to any summary
- Each array element must be clean, ready-to-use Chinese content`,
          },
        ],
        temperature: 0.5,
      })
    );

    // Handle API error
    if (!result.ok) {
      const errorMsg = getErrorMessage(result.error);
      console.error(`[Comment Summary] Batch ${batchIdx + 1}/${batches.length} failed:`, {
        error: errorMsg,
        batchSize: batch.length,
        provider: providerName,
        model: modelName,
        fallbackStrategy: 'Processing items individually with retry',
      });
      console.log(`[Comment Summary] Fallback: Processing ${batch.length} items individually...`);
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        console.log(`[Comment Summary] Fallback item ${i + 1}/${batch.length} | Provider: ${providerName}/${modelName}`);
        const summary = await summarizeCommentsWithRetry(provider, item.comments);
        summaries[item.index] = summary || '';
        processedCount++;
      }
      
      if (progress.update(processedCount) || progress.shouldLogByTime(30)) {
        console.log(progress.formatMessage('comment summarization', providerName, modelName));
      }
      continue;
    }

    const content = result.value.content;

    if (!content) {
      console.error(`[Comment Summary] Batch ${batchIdx + 1}/${batches.length} returned empty content`, {
        batchSize: batch.length,
        provider: providerName,
        model: modelName,
        fallbackStrategy: 'Processing items individually with retry',
      });
      console.log(`[Comment Summary] Fallback: Processing ${batch.length} items individually...`);
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        console.log(`[Comment Summary] Fallback item ${i + 1}/${batch.length} | Provider: ${providerName}/${modelName}`);
        const summary = await summarizeCommentsWithRetry(provider, item.comments);
        summaries[item.index] = summary || '';
        processedCount++;
      }
      
      if (progress.update(processedCount) || progress.shouldLogByTime(30)) {
        console.log(progress.formatMessage('comment summarization', providerName, modelName));
      }
      continue;
    }

    // Parse JSON array using Result pattern
    const parseResult = parseJsonArray<string>(content, batch.length);

    if (parseResult.ok) {
      const results = parseResult.value;
      
      // Map results back to original indices, preserving order and length
      batch.forEach((item, idx) => {
        if (idx < results.length) {
          summaries[item.index] = results[idx] || '';
          processedCount++;
        } else {
          // If this item wasn't returned, log and mark for retry
          console.warn(`Batch ${batchIdx + 1}: Missing result for item ${idx + 1}, will retry individually`);
        }
      });
      
      // Retry items that didn't get results
      for (let idx = results.length; idx < batch.length; idx++) {
        const item = batch[idx];
        const summary = await summarizeCommentsWithRetry(provider, item.comments);
        summaries[item.index] = summary || '';
        processedCount++;
      }
    } else {
      console.error(`[Comment Summary] Batch ${batchIdx + 1}/${batches.length} JSON parse failed:`, {
        error: getErrorMessage(parseResult.error),
        expectedItems: batch.length,
        provider: providerName,
        model: modelName,
        note: 'Check parseJsonArray logs above for content preview',
        fallbackStrategy: 'Processing items individually with retry',
      });
      console.log(`[Comment Summary] Fallback: Processing ${batch.length} items individually...`);
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        console.log(`[Comment Summary] Fallback item ${i + 1}/${batch.length} | Provider: ${providerName}/${modelName}`);
        const summary = await summarizeCommentsWithRetry(provider, item.comments);
        summaries[item.index] = summary || '';
        processedCount++;
      }
    }

    if (progress.update(processedCount) || progress.shouldLogByTime(30)) {
      console.log(progress.formatMessage('comment summarization', providerName, modelName));
    }
  }

  const completedCount = summaries.filter(s => s !== '').length;
  console.log(`Completed comment summarization: ${completedCount}/${commentArrays.length} stories in ${progress.getElapsedSeconds()}s`);
  return summaries;
}
