# Quick Start Guide

Get up and running with HackerNews Daily in 5 minutes.

## Prerequisites Check

Before starting, ensure you have:

- ✅ **Node.js 20+** installed: `node --version`
- ✅ **Cloudflare account** with Workers enabled (free tier is fine)
- ✅ **LLM API key** for one of:
  - [DeepSeek](https://platform.deepseek.com/) (Recommended: $0.14/1M tokens)
  - [OpenRouter](https://openrouter.ai/) (Multi-provider access)
  - [Zhipu AI](https://open.bigmodel.cn/) (GLM-4.5, $1.4/1M tokens)
- ✅ **GitHub personal access token** (for GitHub publishing)
- ✅ **Git** installed

---

## Step 1: Clone and Install

```bash
# Clone repository
git clone https://github.com/your-username/hackernews-daily.git
cd hackernews-daily

# Install dependencies
npm install
```

---

## Step 2: Create D1 Databases

Cloudflare D1 database is **required** for distributed task processing.

```bash
# Create production database
wrangler d1 create hackernews-daily-db

# Expected output (save the database_id):
# ✅ Successfully created DB 'hackernews-daily-db' in region APAC
# [[d1_databases]]
# binding = "DB"
# database_name = "hackernews-daily-db"
# database_id = "abc-123-prod"  # ← SAVE THIS

# Create development database (for local testing)
wrangler d1 create hackernews-daily-db-dev

# Expected output:
# database_id = "xyz-456-dev"  # ← SAVE THIS TOO
```

---

## Step 3: Initialize Database Schema

```bash
# Initialize production database
wrangler d1 execute hackernews-daily-db --file=./schema/d1-schema.sql

# Initialize development database
wrangler d1 execute hackernews-daily-db-dev --file=./schema/d1-schema.sql
```

---

## Step 4: Configure wrangler.toml

```bash
# Copy example config
cp wrangler.toml.example wrangler.toml

# Edit wrangler.toml with your database IDs
nano wrangler.toml  # Or use your preferred editor
```

Update the database IDs you saved in Step 2:

```toml
# Production database
[[d1_databases]]
binding = "DB"
database_name = "hackernews-daily-db"
database_id = "abc-123-prod"  # ← Your production ID

# Development database
[[env.dev.d1_databases]]
binding = "DB"
database_name = "hackernews-daily-db-dev"
database_id = "xyz-456-dev"  # ← Your dev ID
```

---

## Step 5: Set LLM Provider

Choose your LLM provider and configure it:

```toml
# In wrangler.toml under [vars]
LLM_PROVIDER = "deepseek"  # Options: deepseek, openrouter, zhipu
```

---

## Step 6: Set GitHub Repository (Optional but Recommended)

If you want to publish to GitHub:

```toml
# In wrangler.toml under [vars]
TARGET_REPO = "your-username/hackernews-daily"
TARGET_BRANCH = "main"
```

---

## Step 7: Configure Secrets

Set your API keys as Cloudflare Workers secrets:

```bash
# DeepSeek (if using deepseek provider)
wrangler secret put LLM_DEEPSEEK_API_KEY

# Enter your DeepSeek API key when prompted

# GitHub token (if publishing to GitHub)
wrangler secret put GITHUB_TOKEN

# Enter your GitHub personal access token when prompted
```

For OpenRouter or Zhipu:

```bash
# OpenRouter
wrangler secret put LLM_OPENROUTER_API_KEY

# Zhipu AI
wrangler secret put LLM_ZHIPU_API_KEY
```

---

## Step 8: Local Test

Before deploying, test locally:

```bash
# Start local worker
npm run dev:worker

# In another terminal, trigger export
curl -X POST http://localhost:8787/trigger-export

# Check task status
curl http://localhost:8787/task-status
```

**Expected output**:
```json
{
  "success": true,
  "taskDate": "2026-01-04",
  "status": "processing",
  "totalArticles": 30,
  "completedArticles": 0
}
```

---

## Step 9: Deploy to Cloudflare

```bash
# Deploy the worker
npm run deploy:worker

# Expected output:
# ⛅️ Checking for required secrets...
# ⛅️ No errors found!
# Published hackernews-daily (X.XX sec)
#   https://hackernews-daily.your-subdomain.workers.dev
```

---

## Step 10: Verify Deployment

Check that your worker is running:

```bash
# Health check
curl https://hackernews-daily.your-subdomain.workers.dev

# Expected response:
HackerNews Daily Export Worker (Distributed Mode)

# Check first scheduled execution
# Wait up to 10 minutes, then check status
curl https://hackernews-daily.your-subdomain.workers.dev/task-status
```

---

## Troubleshooting

### Worker won't start

**Problem**: `Error: D1 database binding (DB) is required`

**Solution**:
1. Check `wrangler.toml` has `[[d1_databases]]` section
2. Verify database IDs are correct
3. Re-deploy: `npm run deploy:worker`

### API key errors

**Problem**: `Error: API key is required for {provider}`

**Solution**:
```bash
# Check configured secrets
wrangler secret list

# Set missing secret
wrangler secret put LLM_DEEPSEEK_API_KEY  # Or your provider's key
```

### No articles being processed

**Problem**: Task status stuck at `init` or `list_fetched`

**Solution**:
1. Check D1 database: See [D1 Database Management](./d1-database-management.md)
2. Verify cron is configured: Check `wrangler.toml` `[triggers]` section
3. Check Cloudflare Workers dashboard for errors

---

## What's Next?

### Monitor First Day

After deployment, monitor your first execution:

1. **Check cron triggers**: Every 10 minutes
2. **Watch batch processing**: 6 articles per batch
3. **Verify completion**: Should finish in ~50-60 minutes
4. **Check GitHub**: New daily post should appear in your repository

### Configure Telegram (Optional)

Enable Telegram push notifications:

1. Create Telegram bot via [@BotFather](https://t.me/BotFather)
2. Get bot token
3. Create channel and get channel ID
4. Set secrets:
```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHANNEL_ID
```

5. Add to `wrangler.toml`:
```toml
TELEGRAM_ENABLED = "true"
```

### Learn More

- [API Endpoints](./api-endpoints.md) - All HTTP endpoints
- [D1 Database Management](./d1-database-management.md) - Database operations
- [Cloudflare Worker Deployment](./cloudflare-worker-deployment.md) - Advanced deployment
- [Local Development](./local-development.md) - Local testing guide

---

## Configuration Quick Reference

| Variable | Description | Example | Required |
|-----------|-------------|---------|-----------|
| `LLM_PROVIDER` | LLM provider | `deepseek` | Yes |
| `TARGET_REPO` | GitHub repo | `user/repo` | Yes* |
| `TASK_BATCH_SIZE` | Articles per batch | `6` | No (default 6) |
| `MAX_RETRY_COUNT` | Max retries | `3` | No (default 3) |
| `TELEGRAM_ENABLED` | Enable Telegram | `false` | No |

*Required if GitHub publishing enabled (default behavior)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/hackernews-daily/issues)
- **Documentation**: See [docs/](./README.md) for detailed guides
- **OpenSpec**: Technical specs in [openspec/specs/](../openspec/specs/)
