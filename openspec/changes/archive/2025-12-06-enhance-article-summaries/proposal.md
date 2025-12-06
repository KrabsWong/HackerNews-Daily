# Proposal: Enhance Article Summaries with Full Content Extraction and AI Summarization

## Problem
Currently, article summaries are limited to meta description tags (typically 200 characters or less), which are often too short to provide meaningful context about the article's content. Many articles lack meta descriptions entirely, resulting in "暂无描述" being displayed.

Users need richer, more informative summaries that capture the essence of articles, especially for technical content where meta descriptions may be absent or inadequate.

## Proposed Solution
Enhance the article fetching and summarization pipeline with two key improvements:

1. **Full Article Content Extraction**: Extract the main content from article pages using smart DOM analysis (readability algorithms) to identify and extract only the relevant article text, excluding navigation, ads, and other noise.

2. **AI-Powered Summarization**: Use DeepSeek API to generate concise, informative summaries from the extracted content. Summaries will be configurable in length (default 300 characters) and displayed in Chinese.

The solution maintains backward compatibility by falling back to meta descriptions when content extraction fails, ensuring users always receive some description.

## Goals
- Provide richer, more informative article summaries beyond simple meta descriptions
- Use AI to intelligently summarize full article content into ~300 character digests
- Maintain graceful degradation to meta descriptions when extraction fails
- Make summary length configurable via environment variable
- Keep performance reasonable despite additional processing

## Non-Goals
- Implementing caching for extracted content (out of scope for v1)
- Supporting non-English article extraction (focus on English HN articles)
- Providing multiple summary formats (e.g., bullet points, different lengths)
- Real-time streaming of summaries

## Affected Components
- `src/services/articleFetcher.ts` - Add content extraction logic
- `src/services/translator.ts` - Add AI summarization method
- `src/index.ts` - Update pipeline to use new summarization flow
- `.env.example` - Add SUMMARY_MAX_LENGTH configuration
- `README.md` - Document new summarization feature

## Success Criteria
- When full article content is available, generate AI summaries instead of using meta descriptions
- Summaries are approximately the configured length (default 300 characters)
- Graceful fallback to meta descriptions when extraction fails
- Performance remains acceptable (no more than 2-3 seconds added per article)
- Clear console output indicating summarization progress
- Users can configure summary length via environment variable

## Dependencies
- `@mozilla/readability` or similar library for smart content extraction
- Existing DeepSeek API integration (already in place)

## Risks & Mitigations
- **Risk**: Content extraction may fail on heavily JavaScript-rendered sites
  - **Mitigation**: Fallback to meta description, log failures for monitoring
- **Risk**: AI summarization increases API costs and latency
  - **Mitigation**: Make it configurable, document costs, use efficient models
- **Risk**: Very long articles may exceed API token limits
  - **Mitigation**: Truncate content to reasonable length before summarization (e.g., 4000 chars)
