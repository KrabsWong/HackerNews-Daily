# Proposal: Add Comment Summaries for HackerNews Stories

## Problem
Currently, users only see article summaries but miss valuable discussions happening in HackerNews comments. Comments often contain expert insights, alternative perspectives, technical details, and community consensus that provide important context beyond the article itself.

Users need to see a summary of the top comments for each story to understand the community's reaction and gain additional insights without visiting HackerNews.

## Proposed Solution
Fetch the top 10 comments (by score) for each HackerNews story and use DeepSeek AI to generate a concise ~100 character Chinese summary of the key discussion points. Display this summary on a separate line below the article description.

The solution will:
1. **Fetch Comments**: Retrieve top-level comment IDs from story data, fetch comment details, sort by score, and select top 10
2. **AI Summarization**: Use DeepSeek API to summarize the 10 comments into ~100 characters, preserving technical terms and key insights
3. **Display**: Show comment summary on a new line labeled "评论要点:" (only if comments exist)
4. **Graceful Handling**: Skip the comment line entirely if a story has no comments or fetching fails

## Goals
- Provide users with community insights from top HackerNews comments
- Keep summaries concise (~100 chars) to maintain readability
- Preserve technical terms, library names, and important details
- Handle stories with no comments gracefully (skip comment line)
- Maintain acceptable performance (~2-3s added per story)

## Non-Goals
- Fetching nested comment threads (only top-level comments)
- Allowing users to configure comment count (hardcoded at 10)
- Displaying individual comments separately
- Sentiment analysis or comment categorization
- Real-time comment updates

## Affected Components
- `src/api/hackerNews.ts` - Add comment fetching functions
- `src/services/translator.ts` - Add comment summarization method
- `src/index.ts` - Integrate comment fetching and summarization into pipeline
- `.env.example` - No new configuration needed (using defaults)
- `README.md` - Document comment summary feature

## Success Criteria
- Top 10 comments (by score) are fetched for each story
- AI generates concise ~100 character Chinese summaries of comments
- Technical terms and key insights are preserved in summaries
- Stories with 0 comments don't show comment line
- Performance impact is acceptable (~2-3s per story)
- Clear console progress indicators for comment processing

## Dependencies
- Existing HackerNews API integration
- Existing DeepSeek API integration (translator service)
- No new external dependencies required

## Risks & Mitigations
- **Risk**: Some stories have hundreds of comments, fetching all would be slow
  - **Mitigation**: Only fetch top 10 by score, providing best quality insights
- **Risk**: Comment fetching increases total processing time significantly
  - **Mitigation**: Fetch comments in parallel, monitor performance, document expected time
- **Risk**: Comments may be empty, deleted, or low quality
  - **Mitigation**: Filter out null/empty comments, skip stories with <3 valid comments
- **Risk**: AI may lose technical context when summarizing
  - **Mitigation**: Prompt engineering to explicitly preserve technical terms and library names
