# HackerNews Daily - Chinese Translation

A CLI tool that fetches top HackerNews stories from the past 24 hours, extracts full article content, generates AI-powered summaries, fetches and summarizes top comments, and translates everything to Chinese using DeepSeek AI, displaying them in a clean card-based format.

## Features

- 🔍 Fetches best stories from HackerNews API
- 📄 Extracts full article content using smart content extraction (Mozilla Readability)
- 🤖 Generates AI-powered summaries (~300 characters) from full article text
- 💬 Fetches top 10 comments and generates concise summaries (~100 characters)
- 🌏 Translates titles and summaries to Chinese using DeepSeek LLM
- 📊 Displays results in a clean card-based format with timestamps
- 🌐 **Web UI Mode**: View stories in a browser with a clean Vue.js interface
- 📦 **Local Caching**: Saves fetched data locally to avoid redundant API calls
- ⚙️ Configurable via environment variables (story limit, time window, summary length, cache TTL)
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
CACHE_TTL_MINUTES=30
CACHE_ENABLED=true
```

## Usage

### CLI Mode (Default)

Run the CLI tool:
```bash
npm run fetch
```

### Web UI Mode

View stories in your browser with a clean web interface:
```bash
npm run fetch:web
```

Or use the `--web` flag:
```bash
npm run fetch -- --web
```

### Daily Export Mode

Export articles from the previous calendar day (yesterday) to a markdown file:
```bash
npm run fetch -- --export-daily
```

This will:
- Query articles from yesterday (previous calendar day 00:00-23:59)
- Sort articles by creation time (newest first)
- Generate a markdown file at `TLDR-HackNews24/hackernews-YYYY-MM-DD.md`
- Display success message with file path

You can combine with `--no-cache` to force fresh data:
```bash
npm run fetch -- --export-daily --no-cache
```

**Output Format**: The exported markdown file uses the same format as CLI mode, with article cards containing Chinese title, English title, timestamp, URL, description, and comment summary.

**Filename**: Files are named `hackernews-YYYY-MM-DD.md` where the date represents the previous calendar day.

### Force Refresh (Bypass Cache)

To bypass the cache and fetch fresh data:
```bash
npm run fetch -- --no-cache
```

Or use the `--refresh` flag:
```bash
npm run fetch -- --refresh
```

When web mode is enabled:
1. Stories are fetched and processed as usual
2. A local web server starts on port 3000 (or next available port)
3. Your default browser opens automatically
4. Stories are displayed in a clean card-based layout
5. Press `Ctrl+C` in the terminal to stop the server

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
| `CACHE_TTL_MINUTES` | Cache validity duration in minutes | 30 |
| `CACHE_ENABLED` | Enable/disable local caching ("true" or "false") | true |

### Summary Generation

The tool generates AI-powered summaries in two steps:

1. **Content Extraction**: Uses Mozilla Readability to extract the main article text from HTML, automatically removing ads, navigation, and other clutter
2. **AI Summarization**: Sends the extracted content to DeepSeek API to generate a concise Chinese summary of approximately `SUMMARY_MAX_LENGTH` characters

**Fallback Behavior**: If content extraction or summarization fails, the tool falls back to translating the meta description (if available) or displays "暂无描述".

### Caching

The tool implements local file-based caching to avoid redundant API calls:

- **Cache Location**: `.cache/stories.json` (automatically gitignored)
- **Cache Hit**: If valid cache exists, data is returned instantly without any API calls
- **Cache Miss**: Fresh data is fetched and saved to cache for future use
- **Cache Invalidation**: Cache is invalidated when:
  - TTL expires (default: 30 minutes)
  - Configuration changes (story limit, time window, or summary length)
  - `--no-cache` or `--refresh` flag is used

**Benefits**:
- Instant results on subsequent runs within TTL
- Reduced API costs (no DeepSeek API calls when using cache)
- Lower risk of hitting rate limits

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

To build the Vue.js web frontend:
```bash
npm run build:web
```

To build everything (web frontend + TypeScript backend):
```bash
npm run build:all
```

This creates a `dist/` directory with compiled JavaScript. You can then run:
```bash
npm start
```

Or with web mode:
```bash
npm start:web
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
├── config/
│   └── constants.ts        # Centralized configuration constants
├── server/
│   └── app.ts              # Express web server for web mode
├── services/
│   ├── cache.ts            # Local file-based cache service
│   ├── translator.ts       # DeepSeek translation service
│   ├── articleFetcher.ts   # Article metadata fetching service
│   └── markdownExporter.ts # Markdown export service for daily exports
└── index.ts                # Main CLI entry point

TLDR-HackNews24/            # Daily export directory (auto-created)
├── hackernews-2025-12-06.md
├── hackernews-2025-12-05.md
└── ...

web/                        # Vue.js frontend for web mode
├── src/
│   ├── App.vue             # Main app component
│   ├── components/
│   │   └── StoryCard.vue   # Story card component
│   └── main.ts             # Vue app entry point
├── index.html              # HTML template
├── vite.config.ts          # Vite build configuration
└── package.json            # Frontend dependencies
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

### Web mode issues

**Browser doesn't open automatically:**
- The URL is displayed in the terminal - copy and paste it into your browser
- Try opening `http://localhost:3000` manually

**Port already in use:**
- The server automatically tries the next available port (3001, 3002, etc.)
- Check the terminal output for the actual port being used

**Web page shows "Loading stories...":**
- Wait for the fetch process to complete
- Check the terminal for progress and any errors

### Cache issues

**Cache not working:**
- Ensure `CACHE_ENABLED` is not set to "false" in your `.env` file
- Check that the `.cache/` directory is writable
- The `--no-cache` flag bypasses cache entirely

**Stale data showing:**
- Use `--no-cache` or `--refresh` flag to force a fresh fetch
- Reduce `CACHE_TTL_MINUTES` in your `.env` file
- Delete `.cache/stories.json` manually to clear cache

**Cache cleared unexpectedly:**
- Cache is invalidated when configuration changes
- Changing `HN_STORY_LIMIT`, `HN_TIME_WINDOW_HOURS`, or `SUMMARY_MAX_LENGTH` will trigger a fresh fetch

### Daily export issues

**No markdown file created:**
- Check that `TLDR-HackNews24/` directory exists and is writable
- Ensure there are articles from yesterday (previous calendar day 00:00-23:59)
- Run with `--no-cache` to fetch fresh data
- Check terminal output for "⚠️ No stories found for YYYY-MM-DD" message

**Permission denied error:**
- Ensure you have write permissions in the project directory
- Try creating `TLDR-HackNews24/` directory manually: `mkdir TLDR-HackNews24`
- Check directory ownership and permissions

**File overwrite warning:**
- This is normal behavior when exporting the same date multiple times
- The tool overwrites the existing file with fresh data
- Previous export data will be replaced

**No stories from yesterday:**
- HackerNews may not have had active stories during yesterday's date range
- Try increasing `HN_STORY_LIMIT` to fetch more stories
- The tool only exports stories from the previous calendar day (00:00-23:59)

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

## GitHub Actions Automation

This project includes a GitHub Actions workflow that automatically exports daily HackerNews articles and pushes them to the [TLDR-HackNews24](https://github.com/KrabsWong/TLDR-HackNews24) archive repository.

### How It Works

The workflow (`.github/workflows/daily-export.yml`) runs automatically:
- **Schedule**: Daily at 01:00 UTC (after the previous day has fully passed)
- **Process**:
  1. Checks out this repository
  2. Installs dependencies
  3. Runs `npm run fetch -- --export-daily` to generate yesterday's markdown file
  4. Checks out the TLDR-HackNews24 repository
  5. Copies the generated file to TLDR-HackNews24
  6. Commits and pushes the changes

### Setup Instructions

To enable automated daily exports, configure the following GitHub repository secrets:

1. **Navigate to Repository Settings**
   - Go to your repository on GitHub
   - Click `Settings` > `Secrets and variables` > `Actions`

2. **Add Required Secrets**
   
   **`DEEPSEEK_API_KEY`** (Required)
   - Your DeepSeek API key for translation and summarization
   - Get one from https://platform.deepseek.com/
   - Click `New repository secret`
   - Name: `DEEPSEEK_API_KEY`
   - Value: Your API key

   **`TLDR_REPO_TOKEN`** (Required)
   - GitHub Personal Access Token (PAT) with `repo` scope
   - Used to push files to the TLDR-HackNews24 repository
   - Create a PAT:
     1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
     2. Click `Generate new token (classic)`
     3. Give it a descriptive name (e.g., "HackNews Daily Export Bot")
     4. Select scope: `repo` (Full control of private repositories)
     5. Click `Generate token` and copy the token
   - Add to repository secrets:
     - Name: `TLDR_REPO_TOKEN`
     - Value: Your PAT

3. **Verify Setup**
   - The workflow will automatically run at 01:00 UTC daily
   - For immediate testing, manually trigger the workflow:
     1. Go to `Actions` tab in your repository
     2. Click `Daily HackerNews Export` workflow
     3. Click `Run workflow` > `Run workflow`
   - Check the workflow run logs for any errors
   - Verify the file appears in [TLDR-HackNews24](https://github.com/KrabsWong/TLDR-HackNews24)

### Manual Triggering

You can manually trigger the workflow at any time:
1. Go to the `Actions` tab in your GitHub repository
2. Select the `Daily HackerNews Export` workflow
3. Click `Run workflow` button
4. Confirm by clicking `Run workflow`

This is useful for:
- Testing after initial setup
- Regenerating a specific day's export
- Debugging workflow issues

### Workflow Monitoring

Monitor workflow executions:
- **Actions Tab**: View all workflow runs, their status, and logs
- **Email Notifications**: GitHub sends notifications for failed workflows (configure in GitHub notification settings)
- **Status Badge**: You can add a workflow status badge to your README (optional)

### Troubleshooting

**Workflow fails with "DEEPSEEK_API_KEY is required"**
- Ensure `DEEPSEEK_API_KEY` secret is configured in repository settings
- Check that the secret name is spelled correctly (case-sensitive)

**Workflow fails when pushing to TLDR-HackNews24**
- Verify `TLDR_REPO_TOKEN` has `repo` scope permissions
- Ensure the token hasn't expired
- Check that the TLDR-HackNews24 repository exists and is accessible

**No file generated**
- Check workflow logs for errors during the export step
- Verify there were stories from yesterday (HackerNews might be quiet on some days)
- Ensure API rate limits haven't been exceeded

**Workflow doesn't run on schedule**
- GitHub Actions may delay scheduled workflows by up to 15 minutes during high load
- Verify the workflow file is on the default branch (usually `main` or `master`)
- Check that GitHub Actions is enabled for your repository

### Disabling Automation

To temporarily disable automated exports:
1. Go to `Actions` tab
2. Select `Daily HackerNews Export` workflow
3. Click the `...` menu > `Disable workflow`

To re-enable, follow the same steps and click `Enable workflow`.

## API Documentation

- **HackerNews API**: https://github.com/HackerNews/API
- **DeepSeek API**: https://platform.deepseek.com/api-docs/

## License

MIT
