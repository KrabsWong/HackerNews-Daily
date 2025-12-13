# Migration Guide: v3.x to v4.0

This guide helps you upgrade your Cloudflare Worker deployment from v3.x to v4.0.

## Breaking Changes

### 1. Required Configuration Variables

**v4.0 removes default values** for critical configuration variables to prevent accidental pushes to the maintainer's repository. The following environment variables are now **required**:

- ` LLM_PROVIDER`: Must be explicitly set to `"deepseek"` or `"openrouter"`
- `TARGET_REPO`: Must be explicitly set (no default)
- Provider-specific API keys based on `LLM_PROVIDER` choice

### 2. Directory Structure Changes

Worker code has been reorganized for better maintainability:

```
# Old (v3.x)
src/worker/
├── index.ts
├── exportHandler.ts
├── githubClient.ts
├── githubPush.ts
└── logger.ts

# New (v4.0)
src/worker/
├── index.ts
├── config/
│   ├── validation.ts
│   └── types.ts
├── sources/
│   ├── index.ts
│   └── hackernews.ts
├── publishers/
│   ├── index.ts
│   └── github/
│       ├── index.ts
│       ├── client.ts
│       └── versioning.ts
└── logger.ts
```

**Impact**: If you have custom modifications to worker files, you'll need to merge them into the new structure.

## Migration Steps

### Step 0: Create wrangler.toml from template

**Important**: Starting from v4.0, `wrangler.toml` is gitignored to prevent accidental commits of personal repository settings.

```bash
# Copy the example template
cp wrangler.toml.example wrangler.toml

# Edit wrangler.toml and set your configuration
```

### Step 1: Update wrangler.toml

Edit your `wrangler.toml` and uncomment/set the required variables:

```toml
[vars]
# REQUIRED: Specify LLM provider
LLM_PROVIDER = "deepseek"  # or "openrouter"

# REQUIRED: Your target repository (CHANGE THIS!)
TARGET_REPO = "yourusername/your-repo-name"

# Other existing variables
TARGET_BRANCH = "main"
HN_STORY_LIMIT = "30"
SUMMARY_MAX_LENGTH = "300"
ENABLE_CONTENT_FILTER = "false"
CONTENT_FILTER_SENSITIVITY = "medium"
CACHE_ENABLED = "false"
LLM_BATCH_SIZE = "15"
HN_TIME_WINDOW_HOURS = "24"
```

**⚠️ Important**: Always set `TARGET_REPO` to YOUR repository, not the example value!

### Step 2: Set Required Secrets

Based on your `LLM_PROVIDER` choice, set the appropriate API key:

**If using DeepSeek:**
```bash
wrangler secret put DEEPSEEK_API_KEY
# Paste your DeepSeek API key when prompted
```

**If using OpenRouter:**
```bash
wrangler secret put OPENROUTER_API_KEY
# Paste your OpenRouter API key when prompted
```

**GitHub Token (required for both):**
```bash
wrangler secret put GITHUB_TOKEN
# Paste your GitHub personal access token when prompted
```

### Step 3: Verify Configuration

Before deploying, verify your configuration:

```bash
# Check wrangler.toml has all required vars
grep -E "LLM_PROVIDER|TARGET_REPO" wrangler.toml

# List secrets (names only, values are hidden)
wrangler secret list
```

Expected output should include:
- `LLM_PROVIDER` in wrangler.toml
- `TARGET_REPO` in wrangler.toml
- `GITHUB_TOKEN` in secrets list
- `DEEPSEEK_API_KEY` or `OPENROUTER_API_KEY` in secrets list

### Step 4: Deploy

```bash
npm run deploy:worker
```

### Step 5: Test

Trigger a manual export to verify everything works:

```bash
curl -X POST https://your-worker.workers.dev/trigger-export-sync
```

Check Cloudflare Worker logs for any errors.

## Troubleshooting

### Error: "LLM_PROVIDER is required"

**Cause**: `LLM_PROVIDER` is not set in wrangler.toml

**Solution**:
```toml
[vars]
LLM_PROVIDER = "deepseek"  # or "openrouter"
```

### Error: "TARGET_REPO is required"

**Cause**: `TARGET_REPO` is not set in wrangler.toml

**Solution**:
```toml
[vars]
TARGET_REPO = "yourusername/your-repo"
```

### Error: "DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek"

**Cause**: API key secret not set for selected provider

**Solution**:
```bash
wrangler secret put DEEPSEEK_API_KEY
```

### Error: "OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter"

**Cause**: API key secret not set for selected provider

**Solution**:
```bash
wrangler secret put OPENROUTER_API_KEY
```

### Error: "Invalid LLM_PROVIDER value"

**Cause**: `LLM_PROVIDER` set to unsupported value

**Solution**: Only `"deepseek"` and `"openrouter"` are valid. Update wrangler.toml:
```toml
LLM_PROVIDER = "deepseek"  # or "openrouter"
```

## Rollback

If you encounter issues with v4.0, you can rollback to v3.x:

```bash
# Checkout v3.x tag/commit
git checkout v3.x

# Rebuild and deploy
npm install
npm run deploy:worker
```

**Note**: v3.x still uses default values for `TARGET_REPO`, so be careful not to accidentally push to the maintainer's repository.

## Benefits of v4.0

Despite the migration effort, v4.0 provides significant improvements:

1. **Safety**: No more accidental pushes to wrong repositories
2. **Clarity**: Explicit configuration prevents confusion
3. **Extensibility**: New architecture supports multiple sources and publishers
4. **Type Safety**: Better TypeScript coverage prevents runtime errors
5. **Maintainability**: Organized code structure easier to understand and modify

## Need Help?

- Check [Cloudflare Worker Deployment Guide](./cloudflare-worker-deployment.md)
- Review [Configuration Documentation](../README.md#configuration)
- Open an issue: https://github.com/yourusername/hacknews-daily/issues

## Example wrangler.toml

Here's a complete example of a v4.0-compatible `wrangler.toml`:

```toml
name = "hacknews-daily-worker"
main = "dist/worker/index.js"
compatibility_date = "2024-01-01"

# Scheduled trigger (daily at 01:00 UTC)
[triggers]
crons = ["0 1 * * *"]

# REQUIRED configuration variables
[vars]
LLM_PROVIDER = "deepseek"
TARGET_REPO = "yourusername/your-repo"
TARGET_BRANCH = "main"

# Optional configuration
HN_STORY_LIMIT = "30"
SUMMARY_MAX_LENGTH = "300"
ENABLE_CONTENT_FILTER = "false"
CONTENT_FILTER_SENSITIVITY = "medium"
CACHE_ENABLED = "false"
LLM_BATCH_SIZE = "1"
HN_TIME_WINDOW_HOURS = "24"

# Secrets (set via wrangler secret put)
# - DEEPSEEK_API_KEY (if LLM_PROVIDER=deepseek)
# - OPENROUTER_API_KEY (if LLM_PROVIDER=openrouter)
# - GITHUB_TOKEN (required)
```
