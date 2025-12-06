# Proposal: Add Local Cache Strategy

## Why

### Problem Statement
Currently, every execution of `npm run fetch` or `npm run fetch:web` performs:
1. Full HackerNews API calls to fetch stories and comments
2. Multiple DeepSeek API calls for translation and summarization

This leads to:
- **Unnecessary API costs**: DeepSeek API charges per token, repeated calls for the same content waste money
- **Slow execution**: Each run takes 1-2 minutes due to network requests and AI processing
- **Rate limiting risk**: Frequent API calls may trigger rate limits
- **Poor user experience**: Users who want to quickly check recent results must wait for full processing

### Secondary Problem
The project has constants scattered across multiple files:
- `src/index.ts`: Story limits, summary lengths
- `src/api/hackerNews.ts`: API base URL, timeouts, fetch limits
- `src/services/translator.ts`: API base URL, timeouts, retry delays
- `src/services/articleFetcher.ts`: Timeouts, user agent, content limits
- `src/server/app.ts`: Default port

This makes configuration management difficult and increases maintenance burden.

## What Changes

### 1. Local Cache Service
Implement a file-based caching system that:
- Stores processed story data (translations, summaries) in a local JSON file
- Checks cache validity based on configurable TTL (Time-To-Live)
- Returns cached data when within TTL, bypassing all API calls
- Automatically refreshes cache when TTL expires
- Stores cache in `.cache/` directory (gitignored)

### 2. Centralized Constants Configuration
Create a unified constants file (`src/config/constants.ts`) that:
- Consolidates all magic numbers and configuration values
- Groups constants by domain (API, limits, cache, server)
- Provides clear documentation for each constant
- Makes future configuration changes easier

### 3. New Environment Variables
- `CACHE_TTL_MINUTES`: Cache validity duration (default: 30 minutes)
- `CACHE_ENABLED`: Toggle to enable/disable caching (default: true)

## Scope

### In Scope
- File-based cache storage and retrieval
- TTL-based cache invalidation
- Constants consolidation
- Environment variable configuration
- Cache bypass flag (`--no-cache` or `--refresh`)

### Out of Scope
- Database-based caching
- Partial cache updates (individual story refresh)
- Cache sharing across machines
- Cache compression
