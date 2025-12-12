/**
 * Title and description translation functions
 * Handles both single-item and batch translation operations
 */

import { fromPromise } from '../../utils/result';
import { chunk, parseJsonArray, MAX_RETRIES, delay } from '../../utils/array';
import { LLMProvider, FetchError } from '../llmProvider';

// ============================================
// Single-Item Translation Functions
// ============================================

/**
 * Translate a single title to Chinese
 * Uses loop-based retry for rate limit handling
 * @param provider - LLM provider instance
 * @param title - English title to translate
 * @returns Translated Chinese title, or original on failure
 */
export async function translateTitle(
  provider: LLMProvider,
  title: string
): Promise<string> {
  // Check if title is already in Chinese
  if (/[\u4e00-\u9fa5]/.test(title)) {
    return title;
  }

  const prompt = `Translate this HackerNews title to Chinese, following these rules:

1. PRESERVE technical terms in their original English form or use standard Chinese abbreviations:
   - Programming languages: TypeScript, Python, Rust, Go, JavaScript, C++, Java, etc.
   - Cloud services: AWS, Azure, GCP, Firebase, Vercel, etc.
   - Technical acronyms: API, HTTP, HTTPS, GPU, CPU, AI, ML, LLM, NLP, etc.
   - Products/Projects: GitHub, GitLab, OpenAI, TensorFlow, React, Vue, Docker, etc.
   - For well-known protocols/standards: Use abbreviations like "MCP协议" for "Model Context Protocol"

2. Only translate natural language portions (verbs, adjectives, common nouns)

3. Maintain readability for technical Chinese audiences

Title to translate: ${title}

Output only the translated title, no explanations.`;

  // Loop-based retry pattern
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await fromPromise(
      provider.chatCompletion({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      })
    );

    if (result.ok) {
      const translation = result.value.content;
      if (!translation) {
        console.warn(`Translation returned empty for: ${title.substring(0, 50)}...`);
        return title;
      }
      return translation;
    }

    // Check if retryable (rate limit)
    const isRateLimited =
      result.error instanceof FetchError && result.error.status === 429;

    if (isRateLimited && attempt < MAX_RETRIES) {
      console.warn(`Rate limit hit, retrying (${attempt}/${MAX_RETRIES})...`);
      await delay(provider.getRetryDelay());
      continue;
    }

    // Non-retryable error or max retries reached
    console.warn(
      `Translation failed for: ${title.substring(0, 50)}... - ${result.error.message}`
    );
    return title;
  }

  return title;
}

/**
 * Translate a description text to Chinese
 * @param provider - LLM provider instance
 * @param description - Description to translate (can be null)
 * @returns Translated description, "暂无描述" if empty, or original on failure
 */
export async function translateDescription(
  provider: LLMProvider,
  description: string | null
): Promise<string> {
  // Handle null or empty descriptions
  if (!description?.trim()) {
    return '暂无描述';
  }

  // Check if already in Chinese
  if (/[\u4e00-\u9fa5]/.test(description)) {
    return description;
  }

  try {
    const response = await provider.chatCompletion({
      messages: [
        {
          role: 'user',
          content: `Translate this article description to Chinese. Only output the translation, no explanations: ${description}`,
        },
      ],
      temperature: 0.3,
    });

    const translation = response.content;

    if (!translation) {
      console.warn('Description translation returned empty, using fallback');
      return '暂无描述';
    }

    return translation;
  } catch (error) {
    console.warn(
      `Description translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return description;
  }
}

// ============================================
// Batch Translation Functions
// ============================================

/**
 * Batch translate multiple titles in a single API call
 * Falls back to individual translation on failure
 * @param provider - LLM provider instance
 * @param titles - Array of titles to translate
 * @param batchSize - Number of titles per batch (default 10)
 * @returns Array of translated titles in the same order
 */
export async function translateTitlesBatch(
  provider: LLMProvider,
  titles: string[],
  batchSize: number = 10
): Promise<string[]> {
  if (titles.length === 0) {
    return [];
  }

  const batches = chunk(titles, batchSize);
  const allTranslations: string[] = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    const result = await fromPromise(
      provider.chatCompletion({
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

Output format example: ["First translated title here", "Second translated title here"]`,
          },
        ],
        temperature: 0.3,
      })
    );

    // Handle API error
    if (!result.ok) {
      console.warn(
        `Batch ${batchIdx + 1}: API error, falling back: ${result.error.message}`
      );
      for (const title of batch) {
        const translated = await translateTitle(provider, title);
        allTranslations.push(translated);
      }
      console.log(`Batch translated ${allTranslations.length}/${titles.length} titles...`);
      continue;
    }

    const content = result.value.content;

    if (!content) {
      console.warn(`Batch ${batchIdx + 1} returned empty, falling back`);
      for (const title of batch) {
        const translated = await translateTitle(provider, title);
        allTranslations.push(translated);
      }
      console.log(`Batch translated ${allTranslations.length}/${titles.length} titles...`);
      continue;
    }

    // Parse JSON array using Result pattern
    const parseResult = parseJsonArray<string>(content, batch.length);

    if (parseResult.ok) {
      allTranslations.push(...parseResult.value);
    } else {
      console.warn(`Batch ${batchIdx + 1}: ${parseResult.error.message}, falling back`);
      for (const title of batch) {
        const translated = await translateTitle(provider, title);
        allTranslations.push(translated);
      }
    }

    console.log(`Batch translated ${allTranslations.length}/${titles.length} titles...`);
  }

  return allTranslations;
}

/**
 * Translate multiple titles sequentially (for CLI progress display)
 * @param provider - LLM provider instance
 * @param titles - Array of titles to translate
 * @returns Array of translated titles
 */
export async function translateBatchSequential(
  provider: LLMProvider,
  titles: string[]
): Promise<string[]> {
  const translations: string[] = [];

  for (let i = 0; i < titles.length; i++) {
    const translation = await translateTitle(provider, titles[i]);
    translations.push(translation);

    // Show progress
    if ((i + 1) % 5 === 0 || i === titles.length - 1) {
      console.log(`Translated ${i + 1}/${titles.length} titles...`);
    }
  }

  return translations;
}

/**
 * Translate multiple descriptions sequentially
 * @param provider - LLM provider instance
 * @param descriptions - Array of descriptions to translate
 * @returns Array of translated descriptions
 */
export async function translateDescriptionsBatch(
  provider: LLMProvider,
  descriptions: (string | null)[]
): Promise<string[]> {
  const translations: string[] = [];

  for (let i = 0; i < descriptions.length; i++) {
    const translation = await translateDescription(provider, descriptions[i]);
    translations.push(translation);

    // Show progress
    if ((i + 1) % 5 === 0 || i === descriptions.length - 1) {
      console.log(`Translated ${i + 1}/${descriptions.length} descriptions...`);
    }
  }

  return translations;
}
