# HackerNews Daily - Chinese Translation

⚠️ **BREAKING CHANGES in v4.0.0**: Worker deployment now requires explicit configuration of `LLM_PROVIDER` and `TARGET_REPO` environment variables (no defaults). See [Migration Guide](./docs/migration-v3-to-v4.md) for upgrade instructions.

A CLI tool that fetches top-rated stories from HackerNews's curated "best" list, extracts full article content via Crawler API, generates AI-powered summaries, fetches and summarizes top comments, and translates everything to Chinese using configurable LLM providers. Supports CLI display and daily Markdown exports with optional AI-based content filtering. Automated deployment via Cloudflare Workers.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HackerNews Daily                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────────┐ │
│  │   CLI Mode   │     │ Worker Mode  │     │        Entry Points          │ │
│  │ (npm run     │     │ (Cloudflare  │     │                              │ │
│  │   fetch)     │     │   Workers)   │     │  src/index.ts (CLI)          │ │
│  └──────┬───────┘     └──────┬───────┘     │  src/worker/index.ts (Worker)│ │
│         │                    │             └──────────────────────────────┘ │
│         └────────┬───────────┘                                              │
│                  ▼                                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Core Services                                   │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │ Translation │  │  Article    │  │   Content   │  │    Cache     │  │  │
│  │  │  Service    │  │  Fetcher    │  │   Filter    │  │   Service    │  │  │
│  │  │             │  │             │  │  (Optional) │  │  (CLI only)  │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────────┘  │  │
│  │         │                │                │                            │  │
│  └─────────┼────────────────┼────────────────┼────────────────────────────┘  │
│            │                │                │                               │
│            ▼                ▼                ▼                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      LLM Provider Abstraction                          │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │  │
│  │  │  DeepSeek   │  │ OpenRouter  │  │  Zhipu AI   │                    │  │
│  │  │  Provider   │  │  Provider   │  │  Provider   │                    │  │
│  │  │             │  │             │  │ (GLM-4.5)   │                    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                    │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        External APIs                                   │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │  Firebase   │  │  Algolia    │  │  Crawler    │  │   GitHub     │  │  │
│  │  │  HN API     │  │  HN API     │  │    API      │  │    API       │  │  │
│  │  │ (Story IDs) │  │ (Details)   │  │ (Content)   │  │ (Publishing) │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Output                                        │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │   Console   │  │  Markdown   │  │   GitHub    │  │    Logs      │  │  │
│  │  │   Display   │  │   Export    │  │    Repo     │  │   (logs/)    │  │  │
│  │  │  (CLI mode) │  │  (--export) │  │  (Worker)   │  │              │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Data Flow:
──────────
1. Fetch best story IDs from Firebase API
2. Batch fetch story details from Algolia API  
3. Extract article content (Crawler API / Readability)
4. Translate titles via LLM Provider
5. Generate AI summaries via LLM Provider
6. Fetch & summarize comments via Algolia + LLM
7. Output to console / markdown / GitHub
```

### Directory Structure

```
src/
├── api/                      # External API integrations
│   └── hackernews/           # HackerNews APIs (Firebase + Algolia)
├── config/
│   └── constants.ts          # Configuration constants & enums
├── services/
│   ├── llm/                  # LLM provider abstraction
│   │   ├── providers.ts      # DeepSeek, OpenRouter, Zhipu implementations
│   │   ├── utils.ts          # Provider utilities
│   │   └── index.ts          # Factory & exports
│   ├── translator/           # Translation & summarization
│   ├── articleFetcher.ts     # Article content extraction
│   ├── contentFilter.ts      # AI content filtering
│   ├── cache.ts              # Local file caching
│   └── markdownExporter.ts   # Markdown generation
├── types/                    # TypeScript type definitions
├── utils/                    # Utility functions
│   ├── fetch.ts              # HTTP client wrapper
│   ├── logger.ts             # CLI file logging
│   └── ...
├── worker/                   # Cloudflare Worker
│   ├── sources/              # Content source abstraction
│   ├── publishers/           # Publishing abstraction (GitHub)
│   └── config/               # Worker configuration
└── index.ts                  # CLI entry point
```

## Features

- 🎯 Fetches stories from HackerNews's curated "best" list via hybrid Firebase + Algolia API strategy
- 📄 Extracts full article content via Crawler API (headless browser for rich content)
- 🤖 Generates AI-powered summaries (configurable 100-500 characters, default 300) from full article text
- 💬 Fetches top 10 comments and generates concise AI summaries (~100 characters, requires 3+ comments)
- 🌏 Translates titles, article summaries, and comment summaries to Chinese using configurable LLM providers (DeepSeek, OpenRouter, or Zhipu AI)
- 🛡️ **AI Content Filter**: Optional filtering of sensitive content with three sensitivity levels (low/medium/high, disabled by default)
- 📊 **CLI Mode**: Clean card-based display with timestamps and scores
- 📝 **Daily Export Mode**: Export previous day's articles to Jekyll-compatible Markdown files
- 📦 **Local Caching**: TTL-based file caching (default 30 minutes) to avoid redundant API calls
- ⚙️ Configurable via environment variables (story limit, time window, summary length, cache TTL, filter settings)
- 🛡️ Graceful error handling with multi-level fallbacks (content → meta description → original text)
- ⚡ Efficient API usage: ~3 API calls for 30 stories (vs 31+ previously)
- ☁️ **Cloudflare Workers**: Serverless deployment with cron triggers for automated daily exports

## Prerequisites

- Node.js 20+
- **Required for CLI**: DeepSeek API key ([Get one here](https://platform.deepseek.com/)), OpenRouter API key, or Zhipu AI API key
- **Required for Worker deployment**: 
  - LLM provider configuration (`LLM_PROVIDER`: "deepseek", "openrouter", or "zhipu")
  - Corresponding API key (LLM_DEEPSEEK_API_KEY, LLM_OPENROUTER_API_KEY, or LLM_ZHIPU_API_KEY)
  - GitHub personal access token for publishing
  - Target repository configuration

## Quick Start

1. Clone and install: 
   ```bash
   git clone <repository-url> && cd hacknews-daily && npm install
   ```

2. Configure: 
   ```bash
   cp .env.example .env
   # Edit .env and add your DEEPSEEK_API_KEY
   ```

3. Run: 
   ```bash
   npm run fetch
   ```

For detailed setup instructions, see [Local Development Guide](./docs/local-development.md).

## Deployment

For automated daily exports, this project uses **Cloudflare Workers** deployment:

- Runs on Cloudflare's global edge network
- Free tier: 100,000 requests/day
- Fast cold starts (<50ms)
- Built-in cron triggers for scheduling
- **⚠️ v4.0+ Breaking Change**: Requires explicit `LLM_PROVIDER` and `TARGET_REPO` configuration
- **⚠️ Important**: `wrangler.toml` is gitignored - copy from `wrangler.toml.example` and configure your repository
- **Setup**: See [docs/cloudflare-worker-deployment.md](./docs/cloudflare-worker-deployment.md)
- **Migration**: Upgrading from v3.x? See [Migration Guide](./docs/migration-v3-to-v4.md)

### Quick Deployment Setup

```bash
# 1. Create your wrangler.toml from template
cp wrangler.toml.example wrangler.toml

# 2. Edit wrangler.toml - set LLM_PROVIDER and TARGET_REPO to YOUR values
nano wrangler.toml

# 3. Set secrets based on your LLM_PROVIDER choice:
#    Option A: If using DeepSeek (LLM_PROVIDER=deepseek)
wrangler secret put LLM_DEEPSEEK_API_KEY

#    Option B: If using OpenRouter (LLM_PROVIDER=openrouter)
wrangler secret put LLM_OPENROUTER_API_KEY

#    Option C: If using Zhipu AI (LLM_PROVIDER=zhipu)
wrangler secret put LLM_ZHIPU_API_KEY

# 4. Set required GitHub token (always required)
wrangler secret put GITHUB_TOKEN

# 5. Deploy
npm run deploy:worker
```

## Usage

### CLI Mode (Default)

Run the CLI tool to fetch and display stories:
```bash
npm run fetch
```

This will:
1. Fetch the top stories from HackerNews
2. Filter stories from the past 24 hours
3. Extract full article content from original URLs
4. Fetch top 10 comments for each story
5. Generate AI-powered summaries of the article content and comments
6. Translate titles and summaries to Chinese
7. Display results in a card-based format with timestamps

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

**Note on Timezone**: All date/time operations use **UTC timezone** for consistency with HackerNews API timestamps.

You can combine with `--no-cache` to force fresh data:
```bash
npm run fetch -- --export-daily --no-cache
```

**Output Format**: The exported markdown file includes Jekyll-compatible YAML front matter (layout, title, date) and uses clear hierarchical structure with ranked articles, metadata, descriptions, and comment summaries.

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

### Comment Summaries

The tool fetches the top 10 comments for each story (ranked by HackerNews algorithm) and generates a concise ~100 character summary of key discussion points. Comment summaries:
- Preserve technical terms and library names
- Capture main viewpoints and community consensus
- Mention controversial opinions when present
- Only appear if a story has at least 3 comments

### Logging

When running `npm run fetch`, detailed logs are automatically saved to the `logs/` directory:

```bash
logs/
└── 2024-12-13_15-30-45.log    # Timestamped log file
```

Log files include:
- All processing steps with timestamps
- API call details and durations  
- Error stack traces for debugging
- Configuration and performance metrics

This is useful for diagnosing issues like API timeouts or content extraction failures.

## Configuration

Configure the tool by editing `.env`:

### CLI Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | LLM provider: "deepseek", "openrouter", or "zhipu" (optional for CLI, defaults to "deepseek") | deepseek |
| `LLM_DEEPSEEK_API_KEY` | Your DeepSeek API key (required if using DeepSeek) | - |
| `LLM_DEEPSEEK_MODEL` | DeepSeek model to use (optional) | deepseek-chat |
| `LLM_OPENROUTER_API_KEY` | Your OpenRouter API key (required if LLM_PROVIDER=openrouter) | - |
| `LLM_OPENROUTER_MODEL` | OpenRouter model to use (optional) | deepseek/deepseek-chat-v3-0324 |
| `LLM_ZHIPU_API_KEY` | Your Zhipu AI API key (required if LLM_PROVIDER=zhipu) | - |
| `LLM_ZHIPU_MODEL` | Zhipu AI model to use (optional). Note: glm-4.5-flash has concurrency limit of 2 | glm-4.5-flash |
| `HN_STORY_LIMIT` | Maximum number of stories to fetch (capped at 30) | 30 |
| `HN_TIME_WINDOW_HOURS` | Only show stories from past N hours | 24 |
| `SUMMARY_MAX_LENGTH` | Target length for AI-generated summaries (100-500 chars) | 300 |
| `CACHE_TTL_MINUTES` | Cache validity duration in minutes | 30 |
| `CACHE_ENABLED` | Enable/disable local caching ("true" or "false") | true |
| `ENABLE_CONTENT_FILTER` | Enable AI-based content filtering ("true" or "false") | false |
| `CONTENT_FILTER_SENSITIVITY` | Filter sensitivity level: "low", "medium", or "high" | medium |
| `CRAWLER_API_URL` | Crawler API base URL for fallback content extraction (optional) | - |

### Worker Deployment Configuration (v4.0+)

**⚠️ Required variables** (no defaults, worker will fail if missing):

| Variable | Description | Required |
|----------|-------------|----------|
| `LLM_PROVIDER` | **REQUIRED**: "deepseek", "openrouter", or "zhipu" | Yes |
| `LLM_DEEPSEEK_API_KEY` | **REQUIRED** if LLM_PROVIDER=deepseek | Conditional |
| `LLM_OPENROUTER_API_KEY` | **REQUIRED** if LLM_PROVIDER=openrouter | Conditional |
| `LLM_ZHIPU_API_KEY` | **REQUIRED** if LLM_PROVIDER=zhipu | Conditional |
| `GITHUB_TOKEN` | **REQUIRED**: GitHub personal access token with repo scope | Yes |
| `TARGET_REPO` | **REQUIRED**: Target repository in format "owner/repo" | Yes |

See [Migration Guide](./docs/migration-v3-to-v4.md) for details on upgrading from v3.x.

## API Documentation

- **Algolia HN Search API**: https://hn.algolia.com/api (used for fetching stories by date)
- **HackerNews Firebase API**: https://github.com/HackerNews/API (used for fetching comments)
- **DeepSeek API**: https://platform.deepseek.com/api-docs/

## Documentation

Additional documentation is available in the [`docs/`](./docs) directory:

- **[Cloudflare Worker Deployment Guide](./docs/cloudflare-worker-deployment.md)** - Complete guide for deploying to Cloudflare Workers
- **[Local Development Guide](./docs/local-development.md)** - Guide for local development, testing, and npm run fetch usage
- **[Logging Configuration](./docs/logging.md)** - How to view and configure logs in Cloudflare Workers
- **[Quick Reference](./docs/quick-reference.md)** - Quick reference for common commands and workflows

For technical specifications and change history, see the [`openspec/`](./openspec) directory.

## License

MIT
