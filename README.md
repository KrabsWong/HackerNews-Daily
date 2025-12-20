# HackerNews Daily - Chinese Translation

A Cloudflare Worker that fetches top-rated stories from HackerNews's curated "best" list, extracts full article content via Crawler API, generates AI-powered summaries, fetches and summarizes top comments, and translates everything to Chinese using configurable LLM providers. Supports publishing to GitHub and Telegram.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HackerNews Daily                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Cloudflare Worker                              │  │
│  │                      src/worker/index.ts                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Core Services                                   │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │  │
│  │  │ Translation │  │  Article    │  │   Content   │                    │  │
│  │  │  Service    │  │  Fetcher    │  │   Filter    │                    │  │
│  │  │             │  │             │  │  (Optional) │                    │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                    │  │
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
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │  │
│  │  │  Firebase   │  │  Algolia    │  │  Crawler    │                    │  │
│  │  │  HN API     │  │  HN API     │  │    API      │                    │  │
│  │  │ (Story IDs) │  │ (Details)   │  │ (Content)   │                    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                    │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Publishers                                    │  │
│  ├───────────────────────────────────────────────────────────────────────┤  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐                                     │  │
│  │  │   GitHub    │  │  Telegram   │                                     │  │
│  │  │  Publisher  │  │  Publisher  │                                     │  │
│  │  │  (default)  │  │  (optional) │                                     │  │
│  │  └─────────────┘  └─────────────┘                                     │  │
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
7. Publish to GitHub and/or Telegram
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
│   └── markdownExporter.ts   # Markdown generation
├── types/                    # TypeScript type definitions
├── utils/                    # Utility functions
│   ├── fetch.ts              # HTTP client wrapper
│   └── ...
└── worker/                   # Cloudflare Worker
    ├── sources/              # Content source abstraction
    ├── publishers/           # Publishing abstraction
    │   ├── github/           # GitHub publisher
    │   └── telegram/         # Telegram publisher (optional)
    └── config/               # Worker configuration
```

## Features

- Fetches stories from HackerNews's curated "best" list via hybrid Firebase + Algolia API strategy
- Extracts full article content via Crawler API (headless browser for rich content)
- Generates AI-powered summaries (configurable 100-500 characters, default 300) from full article text
- Fetches top 10 comments and generates concise AI summaries (~100 characters, requires 3+ comments)
- Translates titles, article summaries, and comment summaries to Chinese using configurable LLM providers (DeepSeek, OpenRouter, or Zhipu AI)
- **AI Content Filter**: Optional filtering of sensitive content with three sensitivity levels (low/medium/high, disabled by default)
- Configurable via environment variables (story limit, time window, summary length, filter settings)
- Graceful error handling with multi-level fallbacks (content -> meta description -> original text)
- Efficient API usage: ~3 API calls for 30 stories (vs 31+ previously)
- **Cloudflare Workers**: Serverless deployment with cron triggers for automated daily exports
- **GitHub Integration**: Automatic publishing to GitHub repository
- **Telegram Integration**: Optional push notifications to Telegram channels

## Prerequisites

- Node.js 20+
- Cloudflare account (free tier works)
- LLM provider API key (DeepSeek, OpenRouter, or Zhipu AI)
- GitHub personal access token (if using GitHub publisher)
- Telegram bot token (if using Telegram publisher)

## Quick Start

1. Clone and install: 
   ```bash
   git clone <repository-url> && cd hacknews-daily && npm install
   ```

2. Configure local development:
   ```bash
   cp .env.example .dev.vars
   # Edit .dev.vars and add your API keys
   ```

3. Run locally:
   ```bash
   npm run dev:worker
   # In another terminal:
   curl -X POST http://localhost:8787/trigger-export-sync
   ```

For detailed setup instructions, see [Local Development Guide](./docs/local-development.md).

## Deployment

This project uses **Cloudflare Workers** for deployment:

- Runs on Cloudflare's global edge network
- Free tier: 100,000 requests/day
- Fast cold starts (<50ms)
- Built-in cron triggers for scheduling
- **Important**: `wrangler.toml` is gitignored - copy from `wrangler.toml.example` and configure your settings
- **Setup**: See [docs/cloudflare-worker-deployment.md](./docs/cloudflare-worker-deployment.md)

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

# 4. Set GitHub token (if GitHub publishing enabled)
wrangler secret put GITHUB_TOKEN

# 5. Set Telegram secrets (if Telegram publishing enabled)
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHANNEL_ID

# 6. Deploy
npm run deploy:worker
```

## Configuration

### LLM Configuration (Required)

| Variable | Description | Required |
|----------|-------------|----------|
| `LLM_PROVIDER` | **REQUIRED**: "deepseek", "openrouter", or "zhipu" | Yes |
| `LLM_DEEPSEEK_API_KEY` | Required if LLM_PROVIDER=deepseek | Conditional |
| `LLM_OPENROUTER_API_KEY` | Required if LLM_PROVIDER=openrouter | Conditional |
| `LLM_ZHIPU_API_KEY` | Required if LLM_PROVIDER=zhipu | Conditional |

**Note**: At least one publisher (GitHub or Telegram) must be enabled.

### GitHub Integration (Optional, enabled by default)

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_ENABLED` | Set to "false" to disable GitHub publishing (default: "true") | No |
| `GITHUB_TOKEN` | GitHub personal access token with repo scope | If enabled |
| `TARGET_REPO` | Target repository in format "owner/repo" | If enabled |

### Telegram Integration (Optional)

To enable Telegram push notifications:

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_ENABLED` | Set to "true" to enable Telegram publishing | No |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather (secret) | If enabled |
| `TELEGRAM_CHANNEL_ID` | Channel ID: "@channel_name" or "-100xxxxxxxxx" | If enabled |
| `TELEGRAM_BATCH_SIZE` | Stories to merge per message (1-10, default: 2) | No |

**Setup Steps:**
1. Create a bot via [@BotFather](https://t.me/BotFather) and get the token
2. Add the bot as an administrator to your channel
3. Configure the secrets:
   ```bash
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_CHANNEL_ID
   ```
4. Set `TELEGRAM_ENABLED = "true"` in `wrangler.toml`

**Message Batching:**
- Multiple stories are merged into a single message to reduce notifications
- Default: 2 stories per message (10 stories → 5 content messages + header/footer)
- Adjust `TELEGRAM_BATCH_SIZE` to change stories per message

### Other Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `HN_STORY_LIMIT` | Maximum number of stories to fetch (capped at 30) | 30 |
| `HN_TIME_WINDOW_HOURS` | Only show stories from past N hours | 24 |
| `SUMMARY_MAX_LENGTH` | Target length for AI-generated summaries (100-500 chars) | 300 |
| `ENABLE_CONTENT_FILTER` | Enable AI-based content filtering ("true" or "false") | false |
| `CONTENT_FILTER_SENSITIVITY` | Filter sensitivity level: "low", "medium", or "high" | medium |
| `CRAWLER_API_URL` | Crawler API base URL for fallback content extraction (optional) | - |

## Local Development

### Quick Start

```bash
# Start local worker
npm run dev:worker

# Trigger export manually
curl -X POST http://localhost:8787/trigger-export-sync
```

### Local Test Mode

For testing without publishing to GitHub or Telegram, use local test mode to output directly to terminal:

```bash
# Setup: Create .dev.vars with local test configuration
cat > .dev.vars << 'EOF'
LOCAL_TEST_MODE=true
GITHUB_ENABLED=false
TELEGRAM_ENABLED=false
LLM_PROVIDER=openrouter
LLM_OPENROUTER_API_KEY=<your-api-key>
EOF

# Start local worker
npm run dev:worker

# Trigger export - output will appear in terminal
curl -X POST http://localhost:8787/trigger-export-sync
```

**Example output:**
```
======================================
HackerNews Daily - 2025-01-19
======================================

## 1. 标题（中文翻译）
English Title
**发布时间**: 2025-01-19 10:00:00 UTC
...

======================================
Export completed: 30 stories
======================================
```

See [Local Development Guide](./docs/local-development.md) for more details.

## Testing

### Test Coverage

This project maintains comprehensive test coverage across all layers:

- **Utils Layer**: 100% coverage (utilities, helpers, formatting)
- **API Layer**: 90%+ coverage (Firebase, Algolia integrations)
- **Worker Layer**: 85%+ coverage (HTTP handlers, configuration, scheduling)
- **Services Layer**: 90%+ coverage (article fetcher, translator, content filter, LLM providers)
- **Publishers**: 85%+ coverage (GitHub, Telegram publishing)
- **Integration**: 80%+ coverage (complete daily export workflows)

### Test Quality Standards

All tests adhere to strict quality standards to ensure they accurately reflect production behavior:

- **Realistic Mock Data**: Mock data matches actual API response structures. LLM mocks use realistic translations (e.g., `'Python Performance Tips' → 'Python 性能优化技巧'`) instead of generic responses.
- **Explicit Assertions**: Tests use clear, non-permissive assertions that verify expected behavior explicitly rather than hiding failures with optional checks.
- **Safety First**: Environment guards prevent tests from accidentally affecting production data. Real API credentials require explicit `ALLOW_INTEGRATION_TESTS=true` opt-in.
- **Coverage Targets**: Phased improvement plan (Current: 55% → Phase 1: 70% → Phase 2: 80%) balances quality and practicality.

See `openspec/project.md` for complete test quality guidelines.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- articleFetcher.test.ts

# Generate coverage report
npm run test:coverage
```

### Test Organization

Tests are organized by module in the `src/__tests__/` directory:

```
src/__tests__/
├── helpers/              # Shared test utilities and mock factories
│   ├── fixtures.ts       # Mock data factories
│   ├── workerEnvironment.ts  # Mock Worker env and utilities
│   ├── mockLLMProvider.ts    # Mock LLM provider with rate limiting
│   ├── mockHNApi.ts      # Mock HackerNews API responses
│   └── ...
├── utils/                # Utility function tests
├── api/                  # API integration tests
│   └── hackernews/
├── services/             # Service layer tests
│   ├── articleFetcher.test.ts
│   ├── contentFilter.test.ts
│   ├── markdownExporter.test.ts
│   ├── translator/       # Translation service tests
│   └── llm/              # LLM provider tests
├── worker/               # Worker handler tests
│   ├── handlers.test.ts
│   ├── config.test.ts
│   └── scheduled.test.ts
└── integration/          # End-to-end integration tests
    ├── dailyExport.test.ts
    └── publishers.test.ts
```

### Mock Infrastructure

The test suite provides comprehensive mocking for external services:

- **Crawler API**: Mock article content extraction with realistic responses
- **GitHub API**: Mock file create/update operations
- **Telegram Bot API**: Mock message sending
- **Firebase/Algolia APIs**: Mock story and comment fetching
- **LLM Providers**: Mock translations, summaries, and content filtering with rate limiting simulation

### Key Test Scenarios

- **Error handling**: Network failures, timeouts, rate limiting (HTTP 429)
- **Graceful degradation**: Fallbacks when services fail
- **Configuration validation**: Environment variable and secret validation
- **Batch operations**: Efficient processing of multiple items
- **Content filtering**: Sensitivity levels and classification accuracy
- **Translation**: Language detection and technical term preservation
- **End-to-end workflows**: Complete daily export from fetch to publish

### Writing New Tests

When adding new tests:

1. Use fixtures from `src/__tests__/helpers/` for mock data
2. Mock external API calls with `vi.stubGlobal('fetch', ...)`
3. Keep tests independent - don't rely on test execution order
4. Use descriptive test names following the pattern: "should [behavior] when [condition]"
5. Aim for clarity over brevity

Example:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockEnv } from '../helpers/workerEnvironment';
import { createMockStories } from '../helpers/fixtures';

describe('Article Fetcher', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('crawler.api')) {
        return new Response(JSON.stringify({ success: true, data: { content: 'Article content' } }));
      }
      throw new Error(`Unmocked URL: ${url}`);
    });
  });

  it('should fetch article content when valid URL provided', async () => {
    const fetcher = new ArticleFetcher();
    const result = await fetcher.fetch('https://example.com/article');
    expect(result.content).toBeDefined();
  });
});
```

For more detailed testing guidelines, see [docs/TESTING.md](./docs/TESTING.md).

## API Documentation

- **Algolia HN Search API**: https://hn.algolia.com/api (used for fetching stories by date)
- **HackerNews Firebase API**: https://github.com/HackerNews/API (used for fetching comments)
- **DeepSeek API**: https://platform.deepseek.com/api-docs/

## Documentation

Additional documentation is available in the [`docs/`](./docs) directory:

- **[Cloudflare Worker Deployment Guide](./docs/cloudflare-worker-deployment.md)** - Complete guide for deploying to Cloudflare Workers
- **[Local Development Guide](./docs/local-development.md)** - Guide for local development and testing
- **[Logging Configuration](./docs/logging.md)** - How to view and configure logs in Cloudflare Workers
- **[Quick Reference](./docs/quick-reference.md)** - Quick reference for common commands and workflows

For technical specifications and change history, see the [`openspec/`](./openspec) directory.

## License

MIT
