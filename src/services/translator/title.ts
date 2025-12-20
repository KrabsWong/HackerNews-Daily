/**
 * Title and description translation functions
 * Handles both single-item and batch translation operations
 */

import { fromPromise } from '../../utils/result';
import { chunk, parseJsonArray, MAX_RETRIES, delay } from '../../utils/array';
import { getErrorMessage } from '../../worker/logger';
import { LLMProvider, FetchError } from '../llm';
import { ProgressTracker } from './progress';

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
  // Handle empty title
  if (!title?.trim()) {
    return '';
  }

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

IMPORTANT OUTPUT REQUIREMENTS:
- Return ONLY the translated title
- DO NOT include any meta-information, notes, or explanations
- DO NOT add character counts or formatting notes
- DO NOT add prefixes like "翻译:" or similar
- Output must be clean, ready-to-use content

Title to translate: ${title}

Output only the translated title.`;

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
      `Translation failed for: ${title.substring(0, 50)}... - ${getErrorMessage(result.error)}`
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
      `Description translation failed: ${getErrorMessage(error)}`
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

  const progress = new ProgressTracker({ logInterval: 5 });
  const providerName = provider.getName();
  const modelName = provider.getModel();
  
  console.log(`Starting title translation: ${titles.length} titles using ${providerName}/${modelName}`);
  progress.start(titles.length);

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

IMPORTANT OUTPUT REQUIREMENTS:
- Return ONLY the JSON array of translations
- DO NOT include any meta-information, notes, or explanations
- DO NOT add character counts or formatting notes
- DO NOT add prefixes like "翻译:" or "标题:" to each translation
- Each array element must be clean, ready-to-use content

Output format example: ["First translated title here", "Second translated title here"]`,
          },
        ],
        temperature: 0.3,
      })
    );

    // Handle API error
    if (!result.ok) {
      console.warn(
        `Batch ${batchIdx + 1}: API error, falling back: ${getErrorMessage(result.error)}`
      );
      for (const title of batch) {
        const translated = await translateTitle(provider, title);
        allTranslations.push(translated);
      }
      
      // Update progress
      if (progress.update(allTranslations.length)) {
        console.log(progress.formatMessage('title translation', providerName, modelName));
      }
      continue;
    }

    const content = result.value.content;

    if (!content) {
      console.warn(`Batch ${batchIdx + 1} returned empty, falling back`);
      for (const title of batch) {
        const translated = await translateTitle(provider, title);
        allTranslations.push(translated);
      }
      
      // Update progress
      if (progress.update(allTranslations.length)) {
        console.log(progress.formatMessage('title translation', providerName, modelName));
      }
      continue;
    }

    // Parse JSON array using Result pattern
    const parseResult = parseJsonArray<string>(content, batch.length);

    if (parseResult.ok) {
      const results = parseResult.value;
      allTranslations.push(...results);
      
      // If we got fewer results than expected, translate the missing ones individually
      if (results.length < batch.length) {
        console.warn(`Batch ${batchIdx + 1}: Got ${results.length}/${batch.length} results, translating remaining individually`);
        for (let i = results.length; i < batch.length; i++) {
          const translated = await translateTitle(provider, batch[i]);
          allTranslations.push(translated);
        }
      }
    } else {
      console.warn(`Batch ${batchIdx + 1}: ${getErrorMessage(parseResult.error)}, falling back`);
      for (const title of batch) {
        const translated = await translateTitle(provider, title);
        allTranslations.push(translated);
      }
    }

    // Update progress
    if (progress.update(allTranslations.length) || progress.shouldLogByTime(30)) {
      console.log(progress.formatMessage('title translation', providerName, modelName));
    }
  }

  console.log(`Completed title translation: ${allTranslations.length}/${titles.length} titles in ${progress.getElapsedSeconds()}s`);
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
  const progress = new ProgressTracker({ logInterval: 5 });
  const providerName = provider.getName();
  const modelName = provider.getModel();
  
  console.log(`Starting sequential title translation: ${titles.length} titles using ${providerName}/${modelName}`);
  progress.start(titles.length);
  
  const translations: string[] = [];

  for (let i = 0; i < titles.length; i++) {
    const translation = await translateTitle(provider, titles[i]);
    translations.push(translation);

    // Show progress
    if (progress.update(i + 1) || progress.shouldLogByTime(30)) {
      console.log(progress.formatMessage('title translation', providerName, modelName));
    }
  }

  console.log(`Completed title translation: ${translations.length}/${titles.length} titles in ${progress.getElapsedSeconds()}s`);
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
