# HackerNews Daily - Chinese Translation

A CLI tool that fetches top HackerNews stories from the past 24 hours, extracts full article content, generates AI-powered summaries, fetches and summarizes top comments, and translates everything to Chinese using DeepSeek AI, displaying them in a clean card-based format.

## Features

- 🔍 Fetches best stories from HackerNews API
- 📄 Extracts full article content using smart content extraction (Mozilla Readability)
- 🤖 Generates AI-powered summaries (~300 characters) from full article text
- 💬 Fetches top 10 comments and generates concise summaries (~100 characters)
- 🌏 Translates titles and summaries to Chinese using DeepSeek LLM
- 📊 Displays results in a clean card-based format with timestamps
- ⚙️ Configurable via environment variables (story limit, time window, summary length)
- 🛡️ Graceful error handling with fallback to meta descriptions
- ⚡ Sequential processing to respect API rate limits

## Prerequisites

- Node.js (≥18.x recommended)
- DeepSeek API key (get one from [https://platform.deepseek.com/](https://platform.deepseek.com/))

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd hacknews-daily
```

2. Install dependencies:
```bash
npm install
```

3. Configure your API key:
```bash
cp .env.example .env
# Edit .env and add your DeepSeek API key
```

Your `.env` file should look like:
```
DEEPSEEK_API_KEY=your_api_key_here
HN_STORY_LIMIT=30
HN_TIME_WINDOW_HOURS=24
SUMMARY_MAX_LENGTH=300
```

## Usage

Run the CLI tool:
```bash
npm run fetch
```

This will:
1. Fetch the top stories from HackerNews
2. Filter stories from the past 24 hours
3. Extract full article content from original URLs using smart content extraction
4. Fetch top 10 comments for each story
5. Generate AI-powered summaries of the article content and comments
6. Translate titles and summaries to Chinese
7. Display results in a card-based format with timestamps

**Note**: The tool uses Mozilla Readability algorithm to extract article content, automatically filtering out navigation, ads, and other non-content elements. If content extraction fails for any article, it gracefully falls back to translating the meta description.

### Comment Summaries

The tool fetches the top 10 comments for each story (ranked by HackerNews algorithm) and generates a concise ~100 character summary of key discussion points. Comment summaries:
- Preserve technical terms and library names
- Capture main viewpoints and community consensus
- Mention controversial opinions when present
- Only appear if a story has at least 3 comments

## Configuration

Configure the tool by editing `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DEEPSEEK_API_KEY` | Your DeepSeek API key (required) | - |
| `HN_STORY_LIMIT` | Maximum number of stories to fetch (capped at 30) | 30 |
| `HN_TIME_WINDOW_HOURS` | Only show stories from past N hours | 24 |
| `SUMMARY_MAX_LENGTH` | Target length for AI-generated summaries (100-500 chars) | 300 |

### Summary Generation

The tool generates AI-powered summaries in two steps:

1. **Content Extraction**: Uses Mozilla Readability to extract the main article text from HTML, automatically removing ads, navigation, and other clutter
2. **AI Summarization**: Sends the extracted content to DeepSeek API to generate a concise Chinese summary of approximately `SUMMARY_MAX_LENGTH` characters

**Fallback Behavior**: If content extraction or summarization fails, the tool falls back to translating the meta description (if available) or displays "暂无描述".

## Example Output

```
🔍 HackerNews Daily - Chinese Translation

Validating configuration...
Fetching HackerNews stories...
Found 28 stories from the past 24 hours

Translating titles to Chinese...
Translated 5/28 titles...
Translated 10/28 titles...
...

Fetching and extracting article content...

Generating AI-powered summaries...
Processed 5/28 summaries...
...

Fetching top comments for each story...

Summarizing comments...
Summarized 5/28 comment threads...
...

Rendering results...

#1 【人工智能的未来展望】
The Future of Artificial Intelligence
发布时间：2025-12-06 14:30
链接：https://example.com/article
描述：本文探讨了人工智能技术的最新发展和未来趋势...
评论要点：社区讨论了 GPT-4 的性能提升，多数认为新的推理能力很实用，但有人担心成本问题
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#2 【新型编程语言发布】
New Programming Language Released
发布时间：2025-12-06 12:15
链接：https://example.com/article2
描述：一个专注于性能和安全性的全新编程语言正式发布...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Successfully fetched and translated 28 stories
```

## Build

To build the TypeScript code:
```bash
npm run build
```

This creates a `dist/` directory with compiled JavaScript. You can then run:
```bash
npm start
```

## Error Handling

The tool handles various error scenarios gracefully:

- **Missing API key**: Shows setup instructions
- **Network errors**: Suggests checking internet connection
- **API failures**: Falls back to original English titles
- **Invalid stories**: Skips and continues processing

## Development

Project structure:
```
src/
├── api/
│   └── hackerNews.ts       # HackerNews API client
├── services/
│   ├── translator.ts       # DeepSeek translation service
│   └── articleFetcher.ts   # Article metadata fetching service
└── index.ts                # Main CLI entry point
```

## Troubleshooting

### "DEEPSEEK_API_KEY environment variable is required"
Make sure you've created a `.env` file with your API key.

### "Failed to fetch HackerNews stories"
Check your internet connection and verify that https://hacker-news.firebaseio.com is accessible.

### Translation shows original English
This happens when:
- DeepSeek API is temporarily unavailable
- Rate limits are hit
- The tool falls back gracefully to English titles

### No descriptions shown ("暂无描述")
This happens when:
- Content extraction fails (JavaScript-heavy sites, paywalls, PDFs)
- The article URL blocks automated requests
- The website doesn't have meta description tags
- The fetch times out after 5 seconds
- AI summarization fails (falls back to meta description translation)
- The tool continues gracefully without breaking

### Performance & Timing
The tool processes articles and comments sequentially to respect API rate limits:
- **Per article**: ~4-6 seconds (content + comments extraction + AI summarization + translation)
- **For 30 articles**: ~2.5-3.5 minutes total
- This is normal and expected behavior due to AI processing

**Comment processing adds ~1.5-3s per story:**
- Fetching 10 comments: ~0.5-1s
- AI summarization: ~1-2s

**Tip**: Start with `HN_STORY_LIMIT=5` for quick testing before processing larger batches.

### No comment summary shown
This happens when:
- The story has fewer than 3 comments (not enough for meaningful summary)
- Comment fetching fails (deleted comments, API issues)
- Comment summarization fails
- The tool continues gracefully, showing only article content

### No stories found
Try increasing `HN_TIME_WINDOW_HOURS` in your `.env` file to look further back in time.

### Fewer stories than expected
If you're receiving fewer stories than requested (e.g., 8 stories when `HN_STORY_LIMIT=30`), this is likely due to **time window filtering**:

**Why this happens:**
- The tool fetches stories from HackerNews, then filters them by the time window
- With a 24-hour window, many top stories may be older than 24 hours
- Only stories within your `HN_TIME_WINDOW_HOURS` are kept

**Solutions:**
- **Increase the time window**: Set `HN_TIME_WINDOW_HOURS=48` or `72` for more results
- **The tool automatically compensates**: It fetches more stories than requested to account for filtering
- **Expect some variation**: The final count may be slightly lower than requested due to filtering

**Note about limits:**
- Maximum supported limit: **30 stories** (for performance and API rate limiting)
- Requesting more than 50 stories will show a warning and cap at 30
- This ensures optimal performance and prevents API abuse

## API Documentation

- **HackerNews API**: https://github.com/HackerNews/API
- **DeepSeek API**: https://platform.deepseek.com/api-docs/

## License

MIT
