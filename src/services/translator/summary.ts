/**
 * Content and comment summarization functions
 * Handles both single-item and batch summarization operations
 */

import { fromPromise } from '../../utils/result';
import { HNComment } from '../../types/api';
import { stripHTML } from '../../utils/html';
import { chunk, parseJsonArray, MAX_RETRIES, delay } from '../../utils/array';
import { CONTENT_CONFIG, LLM_BATCH_CONFIG } from '../../config/constants';
import { LLMProvider, FetchError } from '../llm';
import { translateDescription } from './title';

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

    console.warn(`Summarization failed: ${result.error.message}`);
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
      `Comment summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return null;
  }
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
    if ((i + 1) % 5 === 0 || i === summaries.length - 1) {
      console.log(`Processed ${i + 1}/${contents.length} summaries...`);
    }
  }

  return summaries;
}

/**
 * Batch summarize multiple article contents in a single API call
 * @param provider - LLM provider instance
 * @param contents - Array of article contents to summarize
 * @param maxLength - Target summary length in characters
 * @param batchSize - Number of articles per batch (default 10)
 * @returns Array of summaries (null for empty contents)
 */
export async function summarizeContentBatch(
  provider: LLMProvider,
  contents: (string | null)[],
  maxLength: number,
  batchSize: number = 10
): Promise<(string | null)[]> {
  if (contents.length === 0) {
    return [];
  }

  // Filter out null/empty contents and track their indices
  const validContents: Array<{ index: number; content: string }> = [];
  contents.forEach((content, index) => {
    if (content?.trim()) {
      validContents.push({ index, content });
    }
  });

  if (validContents.length === 0) {
    return contents.map(() => null);
  }

  const batches = chunk(validContents, batchSize);
  const summaries: (string | null)[] = new Array(contents.length).fill(null);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

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
- 只输出 JSON 数组，不要其他说明`,
          },
        ],
        temperature: 0.5,
      })
    );

    // Handle API error
    if (!result.ok) {
      console.warn(`Batch ${batchIdx + 1}: API error: ${result.error.message}`);
      for (const item of batch) {
        summaries[item.index] = await summarizeContent(
          provider,
          item.content,
          maxLength
        );
      }
      console.log(`Batch summarized ${batchIdx + 1}/${batches.length} batches...`);
      continue;
    }

    const content = result.value.content;

    if (!content) {
      console.warn(`Batch ${batchIdx + 1} returned empty, falling back`);
      for (const item of batch) {
        summaries[item.index] = await summarizeContent(
          provider,
          item.content,
          maxLength
        );
      }
      console.log(`Batch summarized ${batchIdx + 1}/${batches.length} batches...`);
      continue;
    }

    // Parse JSON array using Result pattern
    const parseResult = parseJsonArray<string>(content, batch.length);

    if (parseResult.ok) {
      batch.forEach((item, idx) => {
        summaries[item.index] = parseResult.value[idx];
      });
    } else {
      console.warn(`Batch ${batchIdx + 1}: ${parseResult.error.message}`);
      for (const item of batch) {
        summaries[item.index] = await summarizeContent(
          provider,
          item.content,
          maxLength
        );
      }
    }

    console.log(`Batch summarized ${batchIdx + 1}/${batches.length} batches...`);
  }

  return summaries;
}

/**
 * Batch summarize comments for multiple stories
 * @param provider - LLM provider instance
 * @param commentArrays - Array of comment arrays (one per story)
 * @param batchSize - Number of stories per batch (default 10)
 * @returns Array of comment summaries (null for insufficient comments)
 */
export async function summarizeCommentsBatch(
  provider: LLMProvider,
  commentArrays: HNComment[][],
  batchSize: number = 10
): Promise<(string | null)[]> {
  if (commentArrays.length === 0) {
    return [];
  }

  // Filter stories with enough comments
  const validStories: Array<{ index: number; comments: HNComment[] }> = [];
  commentArrays.forEach((comments, index) => {
    if (comments?.length >= CONTENT_CONFIG.MIN_COMMENTS_FOR_SUMMARY) {
      validStories.push({ index, comments });
    }
  });

  if (validStories.length === 0) {
    return commentArrays.map(() => null);
  }

  const batches = chunk(validStories, batchSize);
  const summaries: (string | null)[] = new Array(commentArrays.length).fill(null);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

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
- 只输出 JSON 数组`,
          },
        ],
        temperature: 0.5,
      })
    );

    // Handle API error
    if (!result.ok) {
      console.warn(`Batch ${batchIdx + 1}: API error: ${result.error.message}`);
      for (const item of batch) {
        summaries[item.index] = await summarizeComments(provider, item.comments);
      }
      console.log(`Batch summarized comments ${batchIdx + 1}/${batches.length} batches...`);
      continue;
    }

    const content = result.value.content;

    if (!content) {
      console.warn(`Batch ${batchIdx + 1} returned empty`);
      for (const item of batch) {
        summaries[item.index] = await summarizeComments(provider, item.comments);
      }
      console.log(`Batch summarized comments ${batchIdx + 1}/${batches.length} batches...`);
      continue;
    }

    // Parse JSON array using Result pattern
    const parseResult = parseJsonArray<string>(content, batch.length);

    if (parseResult.ok) {
      batch.forEach((item, idx) => {
        summaries[item.index] = parseResult.value[idx];
      });
    } else {
      console.warn(`Batch ${batchIdx + 1}: ${parseResult.error.message}`);
      for (const item of batch) {
        summaries[item.index] = await summarizeComments(provider, item.comments);
      }
    }

    console.log(`Batch summarized comments ${batchIdx + 1}/${batches.length} batches...`);
  }

  return summaries;
}
