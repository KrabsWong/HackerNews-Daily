# Configuration Guide

Complete reference for all configuration options in HackerNews Daily.

## Overview

Configuration is handled through three layers:

1. **Environment Variables** - Runtime configuration set in `wrangler.toml` `[vars]` section
2. **Secrets** - Sensitive data set via `wrangler secret put`
3. **Constants** - Internal configuration in `src/config/constants.ts`

---

## D1 Database Configuration (Required)

### Database Bindings

**File**: `wrangler.toml`

```toml
# Production database
[[d1_databases]]
binding = "DB"
database_name = "hackernews-daily-db"
database_id = "abc-123-prod"  # From `wrangler d1 create`

# Development database (for local testing)
[[env.dev.d1_databases]]
binding = "DB"
database_name = "hackernews-daily-db-dev"
database_id = "xyz-456-dev"  # From `wrangler d1 create`
```

**Important**: Always use separate databases for production and development to prevent accidental data corruption.

### Database Connection

**Environment Variable**: None (handled via bindings)

The `DB` binding is automatically available in the Worker environment at `env.DB`.

---

## Task Processing Configuration

### Batch Size

**Environment Variable**: `TASK_BATCH_SIZE` (default: `6`)

Controls how many articles to process per cron trigger.

```toml
[vars]
TASK_BATCH_SIZE = "6"  # Process 6 articles every 10 minutes
```

**Trade-offs**:
- **Smaller batch** (2-4): Faster iteration, more cron triggers
- **Larger batch** (8-10): Fewer triggers, but higher subrequest risk
- **Recommended**: 6 (≈25 subrequests/batch, well under 50 limit)

### Retry Count

**Environment Variable**: `MAX_RETRY_COUNT` (default: `3`)

Maximum retry attempts for failed articles before giving up.

```toml
[vars]
MAX_RETRY_COUNT = "3"
```

**Behavior**:
- Articles are retried up to this many times
- After max retries, article stays in `failed` status
- Use `/retry-failed-tasks` endpoint to manually reset

---

## LLM Provider Configuration

### Provider Selection

**Environment Variable**: `LLM_PROVIDER` (required)

Choose your LLM provider: `deepseek`, `openrouter`, or `zhipu`

```toml
[vars]
LLM_PROVIDER = "deepseek"  # Options: deepseek, openrouter, zhipu
```

### Provider Comparison

| Provider | Model | Cost | Speed | Recommended For |
|----------|-------|------|-------|----------------|
| DeepSeek | deepseek-chat | $0.14/1M tokens | Fast | Production (best value) |
| OpenRouter | OpenRouter | Varies | Medium | Multi-provider access |
| Zhipu AI | glm-4-flash | $1.4/1M tokens | Fast | Chinese-optimized |

### DeepSeek Configuration

**Secret**: `LLM_DEEPSEEK_API_KEY`

```bash
wrangler secret put LLM_DEEPSEEK_API_KEY
```

**Environment Variables** (optional):
```toml
[vars]
LLM_DEEPSEEK_MODEL = "deepseek-chat"  # Default model
```

### OpenRouter Configuration

**Secret**: `LLM_OPENROUTER_API_KEY`

```bash
wrangler secret put LLM_OPENROUTER_API_KEY
```

**Environment Variables** (optional):
```toml
[vars]
LLM_OPENROUTER_MODEL = "deepseek/deepseek-chat"  # Default
LLM_OPENROUTER_SITE_URL = "https://your-site.com"
LLM_OPENROUTER_SITE_NAME = "HackerNews Daily"
```

### Zhipu AI Configuration

**Secret**: `LLM_ZHIPU_API_KEY`

```bash
wrangler secret put LLM_ZHIPU_API_KEY
```

**Environment Variables** (optional):
```toml
[vars]
LLM_ZHIPU_MODEL = "glm-4-flash"  # Default model
```

---

## Story Fetching Configuration

### Story Limit

**Environment Variable**: `HN_STORY_LIMIT` (default: `30`)

Number of top stories to fetch from HackerNews "best" list.

```toml
[vars]
HN_STORY_LIMIT = "30"
```

**Impact**:
- More stories = More content, but longer processing time
- Fewer stories = Faster, but less comprehensive coverage
- Recommended: 30 (balanced)

### Time Window

**Environment Variable**: `HN_TIME_WINDOW_HOURS` (default: `24`)

Time window (in hours) to look back for stories.

```toml
[vars]
HN_TIME_WINDOW_HOURS = "24"
```

**Purpose**:
- Ensures only recent stories are processed
- Prevents processing old content multiple times
- Recommended: 24 (previous day only)

---

## Content Processing Configuration

### Summary Length

**Environment Variable**: `CONTENT_SUMMARY_LENGTH` (default: `300`)

Target length for AI-generated article summaries in characters.

```toml
[vars]
CONTENT_SUMMARY_LENGTH = "300"
```

### Comment Summary Length

**Constant**: `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH` (default: `300`)

Target length for AI-generated comment summaries.

```javascript
// In src/config/constants.ts
export const CONTENT_CONFIG = {
  COMMENT_SUMMARY_LENGTH: 300,  // Target: ~300 characters
  MIN_COMMENTS_FOR_SUMMARY: 3,
  MAX_COMMENTS_LENGTH: 5000,
}
```

### Comment Fetching

**Environment Variable**: `HN_COMMENT_COUNT` (default: `10`)

Number of top comments to fetch per story.

```toml
[vars]
HN_COMMENT_COUNT = "10"
```

---

## Content Filter Configuration

### Enable Filtering

**Environment Variable**: `CONTENT_FILTER_ENABLED` (default: `false`)

Enable AI-based content filtering.

```toml
[vars]
CONTENT_FILTER_ENABLED = "true"
```

### Sensitivity Level

**Environment Variable**: `CONTENT_FILTER_SENSITIVITY` (default: `medium`)

Content filtering sensitivity: `low`, `medium`, or `high`.

```toml
[vars]
CONTENT_FILTER_SENSITIVITY = "medium"
```

**Levels**:
- **low**: Only explicit adult/violent content
- **medium**: Political controversies, restricted topics in China
- **high**: Any Chinese political topics, censorship discussions

**Warning**: High sensitivity may filter >50% of stories. Monitor filter results and adjust as needed.

### Fallback on Error

**Constant**: `CONTENT_FILTER_CONSTANTS.FALLBACK_ON_ERROR` (default: `true`)

Whether to allow all stories if content filter fails (fail-open behavior).

---

## GitHub Publishing Configuration

### Enable GitHub Publishing

**Environment Variable**: `GITHUB_ENABLED` (default: `true`)

Enable/disable GitHub publishing.

```toml
[vars]
GITHUB_ENABLED = "true"  # Set to "false" to disable
```

### Target Repository

**Environment Variable**: `TARGET_REPO` (required if GitHub enabled)

GitHub repository in format `username/repo-name`.

```toml
[vars]
TARGET_REPO = "your-username/hackernews-daily"
```

### Target Branch

**Environment Variable**: `TARGET_BRANCH` (default: `main`)

Branch to publish daily posts to.

```toml
[vars]
TARGET_BRANCH = "main"
```

### GitHub Token

**Secret**: `GITHUB_TOKEN`

Personal access token with `repo` scope.

```bash
wrangler secret put GITHUB_TOKEN
```

**Permissions Required**:
- `repo`: Full control of private repositories
- Can be generated at: https://github.com/settings/tokens

---

## Telegram Publishing Configuration

### Enable Telegram Publishing

**Environment Variable**: `TELEGRAM_ENABLED` (default: `false`)

Enable/disable Telegram push notifications.

```toml
[vars]
TELEGRAM_ENABLED = "true"
```

### Bot Token

**Secret**: `TELEGRAM_BOT_TOKEN`

Telegram bot token from [@BotFather](https://t.me/BotFather).

```bash
wrangler secret put TELEGRAM_BOT_TOKEN
```

### Channel ID

**Secret**: `TELEGRAM_CHANNEL_ID`

Telegram channel ID (e.g., `@your_channel` or `-1001234567890`).

```bash
wrangler secret put TELEGRAM_CHANNEL_ID
```

### Telegram Bot Setup

1. Start chat with [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Enter bot name (e.g., `HackerNewsDailyBot`)
4. Copy the API token (starts with `bot` prefix)
5. Add bot to your channel as administrator
6. Get channel ID: Use [@username_to_id_bot](https://t.me/userinfobot) or check channel URL
7. Set secrets using commands above

---

## Article Content Extraction

### Crawler API Configuration

**Environment Variables**: 
- `CRAWLER_API_URL` (optional) - Full crawler endpoint URL (including path)
- `CRAWLER_API_TOKEN` (optional) - Bearer token for authentication

Crawler service for article content extraction (e.g., Hugging Face Spaces).

**Setup via wrangler secrets** (recommended for production):
```bash
npx wrangler secret put CRAWLER_API_URL
# Enter the full endpoint URL: https://your-crawl-url

npx wrangler secret put CRAWLER_API_TOKEN
# Enter your authentication token (e.g., Hugging Face token)
```

**For local development** (`.dev.vars`):
```bash
# Use the complete endpoint URL including the path
CRAWLER_API_URL=https://your-crawl-url
CRAWLER_API_TOKEN=your_hf_token_here
```

**Important Notes**:
- Use the **complete endpoint URL** - the code will not append any path
- Different crawler services may use different paths (e.g., `/crawl`, `/api/extract`, etc.)
- Configure the exact URL your crawler service expects

**Behavior**:
- If both URL and token are set: Uses authenticated crawler API for rich content
- If only URL is set: Attempts unauthenticated requests (may fail for private services)
- If not set: Returns empty content (graceful degradation)

**Security Note**: Never commit tokens to git. Always use Cloudflare secrets for production.

---

## Cron Schedule Configuration

**File**: `wrangler.toml` `[triggers]` section

```toml
[triggers]
crons = ["*/10 * * * *"]  # Every 10 minutes
```

### Cron Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └───── Day of week (0-6, 0 = Sunday)
│ │ │ └─────── Month (1-12)
│ └───────── Day of month (1-31)
└───────────── Hour (0-23)

* means "every"
```

### Common Schedules

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 10 minutes | `*/10 * * * *` | Default, incremental processing |
| Every 30 minutes | `*/30 * * * *` | Less frequent, larger batches |
| Hourly | `0 * * * *` | Hourly check |
| Daily at midnight | `0 0 * * *` | Single-pass processing (not recommended) |

---

## Worker Configuration

### Compatibility Flags

**File**: `wrangler.toml` `[compatibility_flags]` section

```toml
compatibility_flags = ["nodejs_compat"]
```

**Available Flags**:
- `nodejs_compat`: Enable Node.js APIs in Workers
- `streams_enable_constructors`: Enable Stream constructors
- `enable_observability`: Enable built-in metrics

### Observability

**File**: `wrangler.toml` `[observability]` section

```toml
[observability]
enabled = true
```

Enables Cloudflare Workers built-in metrics and dashboards.

---

## Local Development Configuration

### Environment Variables File

**File**: `.dev.vars` (not committed to git)

For local testing, create `.dev.vars`:

```bash
cp .env.example .dev.vars
```

**Note**: `.dev.vars` is automatically loaded by `wrangler dev`.

### Example .dev.vars

```bash
# LLM Provider
LLM_PROVIDER=deepseek

# Development database is used automatically when running `wrangler dev`
# No need to set DB binding manually

# Optional: Override environment variables for testing
# HN_STORY_LIMIT=10  # Test with fewer stories
# TASK_BATCH_SIZE=2     # Test with smaller batches
```

---

## Configuration Validation

The worker validates configuration on startup and will reject invalid configurations.

### Required Fields

Missing any of these will cause startup error:

- ✅ `DB` binding (D1 database)
- ✅ `LLM_PROVIDER` environment variable
- ✅ Corresponding API key for chosen LLM provider
- ✅ At least one publisher (GitHub or Telegram)

### Validation Errors

| Error | Cause | Solution |
|--------|---------|----------|
| `D1 database binding (DB) is required` | Missing `[[d1_databases]]` in wrangler.toml | Add database binding |
| `API key is required for {provider}` | Missing secret | Run `wrangler secret put LLM_...` |
| `At least one publisher must be enabled` | No publishers configured | Enable GitHub or Telegram |
| `TARGET_REPO is required` | GitHub enabled but no repo | Set `TARGET_REPO` |

---

## Advanced Configuration

### Worker Name

**File**: `wrangler.toml`

```toml
name = "hackernews-daily"
```

**Important**: Changing name requires recreating the worker and updating all references.

### Main Script

**File**: `wrangler.toml`

```toml
main = "src/worker/index.ts"
```

Default: Points to Worker entry point.

### Account ID

**File**: `wrangler.toml`

```toml
account_id = "your-account-id"
```

Optional: Specify Cloudflare account ID (useful for multi-account setups).

### Zone ID

**File**: `wrangler.toml`

```toml
zone_id = "your-zone-id"
```

Optional: Bind worker to specific Cloudflare zone.

---

## Configuration Best Practices

### Security

1. **Never commit secrets**: Add `.dev.vars` to `.gitignore`
2. **Use different environments**: Separate production and development
3. **Rotate API keys regularly**: Update secrets periodically
4. **Limit permissions**: Use minimal required scopes for tokens

### Performance

1. **Optimize batch size**: Start with 6, adjust based on performance
2. **Monitor subrequest usage**: Stay under 50 per execution
3. **Choose appropriate LLM**: Balance cost, speed, and quality
4. **Test locally first**: Validate config before deploying

### Maintainability

1. **Document custom values**: Add comments explaining non-default configs
2. **Use environment variables**: Prefer env vars over hardcoding
3. **Version control config**: Keep `wrangler.toml.example` updated
4. **Review config periodically**: Remove unused or outdated settings

---

## Related Documentation

- [Quick Start Guide](./quick-start.md) - Get started in 5 minutes
- [D1 Database Management](./d1-database-management.md) - Database setup and operations
- [API Endpoints](./api-endpoints.md) - HTTP endpoint reference
- [Local Development](./local-development.md) - Local testing and debugging
