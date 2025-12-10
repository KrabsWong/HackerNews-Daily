# HackerNews Daily - Chinese Translation

A CLI tool that fetches top-rated stories from HackerNews's curated "best" list, extracts full article content, generates AI-powered summaries, fetches and summarizes top comments, and translates everything to Chinese using DeepSeek AI. Supports multiple output formats: CLI display, Web UI, and daily Markdown exports with optional AI-based content filtering.

## Features

- 🎯 Fetches stories from HackerNews's curated "best" list via hybrid Firebase + Algolia API strategy
- 📄 Extracts full article content using Mozilla Readability (smart content extraction)
- 🤖 Generates AI-powered summaries (configurable 100-500 characters, default 300) from full article text
- 💬 Fetches top 10 comments and generates concise AI summaries (~100 characters, requires 3+ comments)
- 🌏 Translates titles, article summaries, and comment summaries to Chinese using DeepSeek LLM
- 🛡️ **AI Content Filter**: Optional filtering of sensitive content with three sensitivity levels (low/medium/high, disabled by default)
- 📊 **CLI Mode**: Clean card-based display with timestamps and scores
- 🌐 **Web UI Mode**: Vue.js interface with auto-opening browser (port 3000+)
- 📝 **Daily Export Mode**: Export previous day's articles to Jekyll-compatible Markdown files
- 📦 **Local Caching**: TTL-based file caching (default 30 minutes) to avoid redundant API calls
- ⚙️ Configurable via environment variables (story limit, time window, summary length, cache TTL, filter settings)
- 🛡️ Graceful error handling with multi-level fallbacks (content → meta description → original text)
- ⚡ Efficient API usage: ~3 API calls for 30 stories (vs 31+ previously)
- 🤖 **GitHub Actions**: Automated daily exports to separate Jekyll blog repository

## Prerequisites

- Node.js (≥20.x recommended)
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
ENABLE_CONTENT_FILTER=false
CONTENT_FILTER_SENSITIVITY=medium
CRAWLER_API_URL=
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
- Query articles from yesterday (previous calendar day 00:00-23:59 **in UTC timezone**)
- Sort articles by creation time (newest first)
- Generate a markdown file at `hacknews-export/YYYY-MM-DD-daily.md`
- Display success message with file path

**Note on Timezone**: All date/time operations use **UTC timezone** for consistency with HackerNews API timestamps. This includes:
- Article timestamp displays (shown in UTC)
- Markdown filename generation (uses UTC date)
- Previous day boundary calculations (00:00-23:59 UTC)
- Jekyll front matter dates (UTC date)

You can combine with `--no-cache` to force fresh data:
```bash
npm run fetch -- --export-daily --no-cache
```

**Output Format**: The exported markdown file includes Jekyll-compatible YAML front matter (layout, title, date) and uses clear hierarchical structure:
- Date as H1 heading
- Each article as H2 section with rank number
- Metadata with clear labels (timestamp, clickable URL link)
- Description and comment summary in separate paragraphs
- Horizontal rules between articles for visual separation

**Filename**: Files are named `YYYY-MM-DD-daily.md` where the date represents the previous calendar day. The `-daily` suffix distinguishes daily export posts for Jekyll.

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
| `ENABLE_CONTENT_FILTER` | Enable AI-based content filtering ("true" or "false") | false |
| `CONTENT_FILTER_SENSITIVITY` | Filter sensitivity level: "low", "medium", or "high" | medium |
| `CRAWLER_API_URL` | Crawler API base URL for fallback content extraction (optional) | - |

### Summary Generation

The tool generates AI-powered summaries in two steps:

1. **Content Extraction**: Uses Mozilla Readability to extract the main article text from HTML, automatically removing ads, navigation, and other clutter
2. **AI Summarization**: Sends the extracted content to DeepSeek API to generate a concise Chinese summary of approximately `SUMMARY_MAX_LENGTH` characters

**Fallback Behavior**: If content extraction or summarization fails, the tool falls back to translating the meta description (if available) or displays "暂无描述".

### Crawler API Fallback (Optional)

The tool supports an optional crawler API fallback for improved content extraction success rates. When configured, the crawler API is used as a last resort for sites that block standard HTTP requests.

**How it works**:
- **Three-tier fallback strategy**:
  1. **Primary**: Axios + Readability (fast, works for ~60% of sites)
  2. **Secondary**: Meta description extraction (fallback for basic info)
  3. **Tertiary**: Crawler API (comprehensive, for difficult sites with anti-crawling)

**Configuration**:

Add the crawler API URL to your `.env` file:
```bash
# Optional: Crawler API for fallback content extraction
CRAWLER_API_URL=https://tiny-crawl-production.up.railway.app
```

**When the crawler is used**:
- The crawler API is only called when both Readability extraction AND meta description fail
- It uses headless browser technology to bypass:
  - Anti-crawling mechanisms (Cloudflare, bot detection)
  - JavaScript-rendered content (SPA frameworks)
  - CAPTCHA challenges and rate limiting
- Returns markdown-formatted content optimized for AI summarization

**Batch Processing for Rate Limiting**:
- Articles are fetched in batches of 5 concurrently (configurable in `constants.ts`)
- Prevents sudden traffic spikes to target servers
- Reduces risk of rate limiting or IP blocking
- More polite crawling behavior
- Example: 30 articles = 6 batches processed sequentially
- Logs show batch progress: `📦 Processing batch 1/6 (5 articles)...`

**Performance**:
- Both default fetch and crawler requests have a 10-second timeout
- Only triggered as last resort (when both Readability AND meta description fail)
- Minimal impact on overall performance due to infrequent usage
- Significantly improves success rate for sites that block standard requests

**Logging Visibility**:
- Each URL shows extraction method: `🌐 Method: Default Fetch (Axios + Readability)`
- When crawler is triggered: `🕷️  Switching to: Crawler Fallback`
- Completion shows successful method: `✅ Completed: {url} (Default Fetch)` or `(Crawler Fallback)`
- Clear visibility into which method is being used at all times

**Note**: The crawler API is **optional** and **disabled by default**. Uncomment `CRAWLER_API_URL` in your `.env` file to enable it.

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

### Content Filtering

The tool includes an optional AI-based content filter to remove stories containing sensitive or controversial topics. This is useful for content moderation in certain regions or contexts.

**How it works**:
- When enabled, story titles are classified by DeepSeek AI before translation
- Stories classified as "SENSITIVE" are filtered out
- Only "SAFE" stories proceed to translation and display
- Adds 2-5 seconds to fetch time (batch classification)

**Configuration**:

Enable the filter in your `.env` file:
```bash
ENABLE_CONTENT_FILTER=true
CONTENT_FILTER_SENSITIVITY=medium
```

**Sensitivity Levels**:

- **`low`**: Only filters explicitly illegal content or explicit adult/violent material
  - Most permissive, minimal filtering
  
- **`medium`** (recommended default): Filters political controversies, explicit content, and illegal activities
  - Balanced approach for general content moderation
  
- **`high`**: Broadly filters any potentially sensitive topics
  - Most restrictive, includes borderline topics

**Behavior**:
- Filtered stories are silently removed from results
- Console shows: `Filtered X stories based on content policy`
- Final story count may be less than `HN_STORY_LIMIT`
- If AI classification fails, stories are allowed through (fail-open)
- Warning shown if more than 50% of stories are filtered

**Performance**:
- Classification adds ~2-5 seconds per fetch
- Minimal API cost (~$0.001-0.002 per batch)
- Saves translation costs for filtered stories

**Note**: Filter is **disabled by default** for backward compatibility.

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

hacknews-export/            # Daily export directory (auto-created)
├── 2025-12-06-daily.md
├── 2025-12-05-daily.md
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

### "Failed to fetch stories from Algolia HN API"
Check your internet connection and verify that https://hn.algolia.com is accessible.

### "Algolia API rate limit exceeded"
Wait a few minutes before trying again, or reduce `HN_STORY_LIMIT` in your `.env` file.

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

**Solution**: Configure the optional crawler API fallback by setting `CRAWLER_API_URL` in your `.env` file. The crawler uses headless browser technology to bypass anti-crawling mechanisms and significantly improves content extraction success rates.

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
- Check that `hacknews-export/` directory exists and is writable
- Ensure there are articles from yesterday (previous calendar day 00:00-23:59)
- Run with `--no-cache` to fetch fresh data
- Check terminal output for "⚠️ No stories found for YYYY-MM-DD" message

**Permission denied error:**
- Ensure you have write permissions in the project directory
- Try creating `hacknews-export/` directory manually: `mkdir hacknews-export`
- Check directory ownership and permissions

**File overwrite warning:**
- This is normal behavior when exporting the same date multiple times
- The tool overwrites the existing file with fresh data
- Previous export data will be replaced

**No stories from yesterday:**
- HackerNews may not have had active stories from the "best" list during yesterday's date range
- The tool fetches from HN's curated "best" list (not all stories), so the available count depends on HN's algorithm
- Try increasing `HN_STORY_LIMIT` to fetch more stories
- The tool only exports stories from the previous calendar day (00:00-23:59)

### Fewer stories than expected
If you're receiving fewer stories than requested (e.g., 8 stories when `HN_STORY_LIMIT=30`), this may happen because:

**Why this happens:**
- The tool fetches stories from HackerNews's curated "best" list (https://news.ycombinator.com/best)
- Only stories that appear in this curated list AND match your time window are included
- The "best" list contains ~200 stories, but they may not all be within your time window
- Content filtering (if enabled) may remove additional stories

**Solutions:**
- **Increase the time window**: Set `HN_TIME_WINDOW_HOURS=48` or `72` for more results
- **Disable content filter**: Set `ENABLE_CONTENT_FILTER=false` if enabled
- **Lower filter sensitivity**: Set `CONTENT_FILTER_SENSITIVITY=low` instead of medium/high
- **Expect some variation**: The final count depends on HN's "best" algorithm and your filters

**Note about limits:**
- Maximum supported limit: **30 stories** (for performance and API rate limiting)
- Requesting more than 50 stories will show a warning and cap at 30
- This ensures optimal performance and prevents API abuse

**Note about sorting:**
- Stories are fetched from HN's "best" list (quality-curated)
- Then sorted by score (points) in descending order
- You get the top-rated stories from the "best" list within your time window

## GitHub Actions Automation

This project includes a GitHub Actions workflow that automatically exports daily HackerNews articles and pushes them to the [tldr-hacknews-24](https://github.com/KrabsWong/tldr-hacknews-24) Jekyll blog repository.

### How It Works

The workflow (`.github/workflows/daily-export.yml`) runs automatically:
- **Schedule**: Daily at 01:00 UTC (after the previous UTC day has fully passed)
- **Timezone**: All date calculations use **UTC timezone** for consistency with HackerNews API
- **File Versioning**: If a file with the same date already exists in the target repository, the workflow automatically adds a version suffix (`-v2`, `-v3`, etc.) to prevent overwrites
- **Process**:
  1. Checks out this repository
  2. Installs dependencies
  3. Runs `npm run fetch -- --export-daily` to generate yesterday's markdown file (using UTC timezone)
  4. Checks out the tldr-hacknews-24 Jekyll blog repository
  5. Checks if the file already exists in `_posts/` directory
  6. If exists, adds version suffix to filename (e.g., `2025-12-06-daily-v2.md`)
  7. Copies the file to `tldr-repo/_posts/` directory
  8. Commits with message including version number if applicable
  9. Pushes changes with GitHub Actions bot account

### Setup Instructions

To enable automated daily exports, configure the following GitHub repository settings:

1. **Navigate to Repository Settings**
   - Go to your repository on GitHub
   - Click `Settings` > `Secrets and variables` > `Actions`

2. **Add Required Secrets** (Settings → Secrets and variables → Actions → Secrets)
   
   | Secret Name | Description | Required |
   |-------------|-------------|----------|
   | `DEEPSEEK_API_KEY` | DeepSeek API key for translation/summarization | Yes |
   | `CRAWLER_API_URL` | Crawler service URL for content extraction | Yes |
   | `TLDR_REPO_TOKEN` | GitHub PAT with `repo` scope for pushing to archive repo | Yes |

   **`DEEPSEEK_API_KEY`**
   - Your DeepSeek API key for translation and summarization
   - Get one from https://platform.deepseek.com/

   **`CRAWLER_API_URL`**
   - URL of your crawler API service for content extraction
   - Example: `https://tiny-crawl-production.up.railway.app`

   **`TLDR_REPO_TOKEN`**
   - GitHub Personal Access Token (PAT) with `repo` scope
   - Used to push files to the tldr-hacknews-24 repository
   - Create a PAT:
     1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
     2. Click `Generate new token (classic)`
     3. Give it a descriptive name (e.g., "HackNews Daily Export Bot")
     4. Select scope: `repo` (Full control of private repositories)
     5. Click `Generate token` and copy the token

3. **Optional: Add Configuration Variables** (Settings → Secrets and variables → Actions → Variables)
   
   These are optional and have sensible defaults:

   | Variable Name | Description | Default |
   |---------------|-------------|---------|
   | `HN_STORY_LIMIT` | Number of stories to fetch | 30 |
   | `HN_TIME_WINDOW_HOURS` | Time window in hours | 24 |
   | `SUMMARY_MAX_LENGTH` | Max summary length in characters | 300 |
   | `CACHE_ENABLED` | Enable caching (not recommended for CI) | false |
   | `CACHE_TTL_MINUTES` | Cache TTL in minutes | 30 |
   | `ENABLE_CONTENT_FILTER` | Enable AI content filter | false |
   | `CONTENT_FILTER_SENSITIVITY` | Filter sensitivity (low/medium/high) | medium |

4. **Verify Setup**
   - The workflow will automatically run at 01:00 UTC daily
   - For immediate testing, manually trigger the workflow:
     1. Go to `Actions` tab in your repository
     2. Click `Daily HackerNews Export` workflow
     3. Click `Run workflow` > `Run workflow`
   - Check the workflow run logs for any errors
   - Verify the file appears in [tldr-hacknews-24 _posts directory](https://github.com/KrabsWong/tldr-hacknews-24)

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

**Workflow fails when pushing to tldr-hacknews-24**
- Verify `TLDR_REPO_TOKEN` has `repo` scope permissions
- Ensure the token hasn't expired
- Check that the tldr-hacknews-24 repository exists and is accessible

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

- **Algolia HN Search API**: https://hn.algolia.com/api (used for fetching stories by date)
- **HackerNews Firebase API**: https://github.com/HackerNews/API (used for fetching comments)
- **DeepSeek API**: https://platform.deepseek.com/api-docs/

## License

MIT
