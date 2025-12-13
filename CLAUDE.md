# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HackerNews Daily is a dual-mode application that:
1. **CLI Tool**: Fetches HackerNews "best" stories, extracts content, generates AI summaries, translates to Chinese, and displays in terminal
2. **Cloudflare Worker**: Serverless deployment for automated daily exports to GitHub repositories

The system fetches top-rated stories from HackerNews's curated "best" list, extracts full article content via Crawler API, generates AI-powered summaries, fetches and summarizes top comments, and translates everything to Chinese using configurable LLM providers (DeepSeek or OpenRouter).

## Architecture

### Dual Runtime Environment
- **Node.js 20+** for CLI execution (`src/index.ts`)
- **Cloudflare Workers** for serverless deployment (`src/worker/index.ts`)
- Shared code in `src/api/`, `src/services/`, `src/utils/`, `src/types/`

### Key Architectural Patterns
1. **Hybrid API Strategy**: Firebase API for real-time best story IDs + Algolia Search API for efficient batch operations
2. **Graceful Degradation**: Multiple fallback levels (content → meta description → original text)
3. **Unified Data Types**: Shared `ProcessedStory` type between CLI and Worker
4. **Configuration Centralization**: All constants in `config/constants.ts`

### Data Flow
```
Firebase (Best IDs) → Algolia (Details) → Date/Score Filter
  → Content Filter (optional) → Article Extraction → AI Summary
  → Comment Fetch → Comment Summary → Translation → Cache → Output
```

## Development Commands

### Local Development (CLI Mode)
```bash
# Install dependencies
npm install

# Run CLI tool (fetch and display stories)
npm run fetch

# Export yesterday's articles to Markdown file
npm run fetch -- --export-daily

# Force refresh (bypass cache)
npm run fetch -- --no-cache
npm run fetch -- --refresh

# Build TypeScript for CLI
npm run build

# Clean build artifacts
npm run clean
```

### Cloudflare Worker Development
```bash
# Build Worker bundle
npm run build:worker

# Watch mode for Worker development
npm run build:worker:watch

# Start local Worker development server
npm run dev:worker

# Deploy to production
npm run deploy:worker

# Deploy to staging environment
npm run deploy:worker:staging

# View Worker logs
npm run logs:worker

# Validate Worker configuration
npm run validate:worker
```

### Wrangler CLI Commands (Useful for Worker Management)
```bash
# View real-time logs
npx wrangler tail --format pretty

# View error logs only
npx wrangler tail --status error

# Set secrets (API keys)
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put GITHUB_TOKEN

# Check authentication status
npx wrangler whoami
```

## Configuration

### Environment Variables
**Required for local development (`.env`):**
- `DEEPSEEK_API_KEY`: DeepSeek API key (required)
- `GITHUB_TOKEN`: GitHub Personal Access Token (for pushing exports)

**Optional configuration:**
- `HN_STORY_LIMIT`: Maximum stories to fetch (default: 30, max: 30)
- `HN_TIME_WINDOW_HOURS`: Time window for stories (default: 24)
- `SUMMARY_MAX_LENGTH`: Target length for AI summaries (100-500 chars, default: 300)
- `CACHE_ENABLED`: Enable local caching ("true" or "false", default: true)
- `CACHE_TTL_MINUTES`: Cache validity duration (default: 30)
- `ENABLE_CONTENT_FILTER`: Enable AI-based content filtering (default: false)
- `CONTENT_FILTER_SENSITIVITY`: "low", "medium", or "high" (default: medium)
- `CRAWLER_API_URL`: Crawler API base URL for fallback content extraction

**Worker configuration (`wrangler.toml`):**
- Worker name: `hacknews-daily-export`
- Cron schedule: `15 0 * * *` (daily at 00:15 UTC)
- Environment variables in `[vars]` section
- Secrets managed via `wrangler secret put`

## Project Structure

```
src/
├── index.ts                 # CLI entry point
├── api/
│   ├── hackernews/         # HackerNews API modules
│   │   ├── algolia.ts      # Algolia Search API (batch operations)
│   │   ├── firebase.ts     # Firebase API (real-time best IDs)
│   │   ├── index.ts        # Unified exports
│   │   └── mapper.ts       # Data mapping and transformation
│   └── index.ts            # API layer exports
├── config/
│   └── constants.ts        # Configuration constants and defaults
├── services/               # Core business logic
│   ├── translator/         # Translation services
│   │   ├── index.ts        # Translation service entry
│   │   ├── summary.ts      # Summary translation
│   │   └── title.ts        # Title translation
│   ├── articleFetcher.ts   # Article content extraction
│   ├── cache.ts           # TTL-based file caching
│   ├── contentFilter.ts   # AI-based content filtering
│   ├── llmProvider.ts     # LLM provider abstraction (DeepSeek/OpenRouter)
│   └── markdownExporter.ts # Markdown generation for exports
├── types/                  # TypeScript type definitions
│   ├── api.ts             # API response types
│   ├── shared.ts          # Shared data types (ProcessedStory, etc.)
│   └── task.ts            # Task and pipeline types
├── utils/                 # Utility functions
│   ├── array.ts           # Array utilities
│   ├── date.ts            # Date/time utilities (UTC-focused)
│   ├── fetch.ts           # HTTP request wrapper with retry logic
│   ├── html.ts            # HTML processing utilities
│   └── result.ts          # Result type for error handling
└── worker/                # Cloudflare Worker implementation
    ├── index.ts           # Worker entry point and HTTP handlers
    ├── exportHandler.ts   # Daily export pipeline
    ├── githubClient.ts    # GitHub API client
    ├── githubPush.ts      # Git operations for pushing to repositories
    ├── logger.ts          # Structured logging for Worker
    └── stubs/             # Node.js polyfills for Worker environment
```

## Important Implementation Details

### API Usage Patterns
- **Firebase API**: Used for fetching best story IDs (`/v0/beststories.json`)
- **Algolia API**: Used for batch fetching story details and comments (`/api/v1/search_by_date`)
- **Efficient batching**: ~3 API calls for 30 stories (vs 31+ previously)
- **Retry logic**: Exponential backoff for failed requests (configurable in `config/constants.ts`)

### Caching Strategy
- **Location**: `.cache/stories.json`
- **TTL**: Configurable (default 30 minutes)
- **Invalidation**: Based on configuration changes and TTL expiration
- **Worker**: Caching disabled by default (`CACHE_ENABLED=false` in `wrangler.toml`)

### Timezone Handling
- **All operations use UTC timezone** for consistency with HackerNews API timestamps
- Daily export mode queries "yesterday" in UTC (00:00-23:59 UTC)
- Date utilities in `src/utils/date.ts` handle UTC conversions

### Error Handling Philosophy
- **Graceful degradation**: Single failures don't break entire pipeline
- **Multiple fallbacks**: Content extraction → meta description → original text
- **Fail-open design**: AI content filtering failures default to no filtering
- **Result types**: Use `Result<T, E>` pattern for explicit error handling

## Testing and Debugging

### Manual Testing Commands
```bash
# Test CLI functionality
npm run fetch
npm run fetch -- --export-daily
npm run fetch -- --no-cache

# Test Worker locally
npm run dev:worker
curl -X POST http://localhost:8787/trigger-export
curl -X POST http://localhost:8787/trigger-export-sync

# Monitor logs
npx wrangler tail --format pretty
```

### Common Issues and Solutions
1. **Missing API keys**: Ensure `DEEPSEEK_API_KEY` is set in `.env` or via `wrangler secret put`
2. **Algolia API 500 errors**: System has built-in retry logic; wait and retry
3. **Worker timeout**: Using paid Cloudflare Workers plan (no CPU time limits)
4. **TypeScript errors**: Run `npm run build` to check compilation

## Documentation

### Key Documentation Files
- `README.md`: Project overview, features, usage instructions
- `openspec/project.md`: Project context, conventions, architecture patterns
- `docs/`: Detailed guides for development and deployment
  - `local-development.md`: Local development setup and testing
  - `cloudflare-worker-deployment.md`: Complete Worker deployment guide
  - `quick-reference.md`: Command reference and troubleshooting
  - `logging.md`: Logging configuration and monitoring

### Documentation Maintenance Rule
**Critical**: Documentation MUST be updated with every code change that affects:
- User-facing features or APIs
- Configuration or environment variables
- Project structure or architecture
- Deployment or setup procedures

## Development Workflow

### Code Modification Guidelines
- **CLI-only changes**: Edit `src/index.ts`, test with `npm run fetch`
- **Worker-only changes**: Edit `src/worker/` files, test with `npm run dev:worker`
- **Shared logic changes**: Edit `src/api/`, `src/services/`, `src/utils/`, test both CLI and Worker
- **Type definitions**: Update `src/types/` files when data structures change

### Git Conventions
- **Branch**: Direct development on `main` branch
- **Commit messages**: Use conventional prefixes:
  - `feat:` New features
  - `fix:` Bug fixes
  - `chore:` Maintenance tasks
  - `docs:` Documentation updates
- **English only**: Commit messages and code comments in English

## Performance Characteristics

### Typical Execution Times
- **CLI mode**: ~2-3 minutes for 30 stories (depends on network and API response times)
- **Worker mode**: ~2-3 minutes (similar to CLI, runs on Cloudflare edge)

### API Call Counts (for 30 stories)
- Firebase API: 1 call (best story IDs)
- Algolia API (stories): 1 batch call
- Crawler API: 30 calls (one per story)
- Algolia API (comments): 30 calls (one per story)
- LLM API (translation/summary): 3-6 calls (batched processing)
- GitHub API: 1 call (push final result)
- **Total**: ~66 API calls

### Optimization Tips
- Reduce `HN_STORY_LIMIT` for faster execution
- Enable caching (`CACHE_ENABLED=true`) for repeated runs
- Adjust `LLM_BATCH_SIZE` in Worker configuration for batch processing