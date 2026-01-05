import type { SensitivityLevel } from '../../config/constants';

/**
 * Build AI prompt for content classification
 * @param titles - Array of titles to classify
 * @param sensitivity - Current sensitivity level
 * @returns Formatted prompt string
 */
export function buildClassificationPrompt(
  titles: string[],
  sensitivity: SensitivityLevel
): string {
  // Define sensitivity guidelines based on level
  const sensitivityGuidelines: Record<SensitivityLevel, string> = {
    low: `Only classify as SENSITIVE if content:
- Explicitly violates Chinese law
- Contains explicit adult or violent content
- Promotes illegal activities`,

    medium: `Classify as SENSITIVE if the content:
- Relates to Chinese political controversies
- Discusses topics restricted in mainland China
- Contains explicit adult or violent content
- Promotes illegal activities or hate speech`,

    high: `Classify as SENSITIVE if the content:
- Relates to any Chinese political topics
- Discusses censorship or internet freedom
- Contains controversial social or political content
- Contains adult, violent, or offensive content
- Discusses topics that may be sensitive in China`,
  };

  // Build prompt
  const prompt = `You are a content moderator for a Chinese news aggregator.
Your task is to classify news titles as either "SAFE" or "SENSITIVE".

Sensitivity Level: ${sensitivity}
${sensitivityGuidelines[sensitivity]}

IMPORTANT:
- Focus on the title content only
- Consider the context (e.g., historical discussion vs current politics)
- When in doubt at the boundary, classify as SAFE

Respond ONLY with a valid JSON array in this exact format:
[{"index": 0, "classification": "SAFE"}, {"index": 1, "classification": "SENSITIVE"}, ...]

Titles to classify:
${titles.map((title, i) => `${i}. ${title}`).join('\n')}

JSON Response:`;

  return prompt;
}
