# Cloudflare Worker Deployment Guide

This guide explains how to deploy the HackerNews Daily Export automation to Cloudflare Workers as an alternative to GitHub Actions.

## Overview

The Cloudflare Worker provides a serverless replacement for GitHub Actions with the following benefits:

- **Generous free tier**: 100,000 requests/day (sufficient for daily automation)
- **Fast cold starts**: <50ms vs GitHub Actions' 10-30 second setup time  
- **Global edge network**: Low latency execution worldwide
- **Built-in scheduling**: Cron Triggers run daily at 01:00 UTC
- **No server maintenance**: Fully managed infrastructure

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) (free tier available)
2. **Node.js 20+**: Required for local development
3. **Wrangler CLI**: Cloudflare's deployment tool (installed via npm)
4. **API Keys**:
   - DeepSeek API key (get from [platform.deepseek.com](https://platform.deepseek.com/))
   - GitHub Personal Access Token with `repo` scope ([create here](https://github.com/settings/tokens/new))
   - (Optional) Crawler API URL for content extraction

## Installation

### 1. Install Dependencies

```bash
npm install
```

This installs Wrangler CLI and all required packages.

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

This opens a browser window to authenticate with your Cloudflare account.

### 3. Configure Secrets

Set the required secrets (encrypted and never visible in dashboard):

```bash
# DeepSeek API Key
npx wrangler secret put DEEPSEEK_API_KEY
# Enter your DeepSeek API key when prompted

# GitHub Personal Access Token
npx wrangler secret put GITHUB_TOKEN  
# Enter your GitHub token when prompted

# Optional: Crawler API URL
npx wrangler secret put CRAWLER_API_URL
# Enter your crawler API URL when prompted (or leave empty)
```

**Note**: Secrets are stored encrypted and only accessible to your Worker at runtime.

### 4. Verify Configuration

Check that `wrangler.toml` contains the correct settings:

```toml
name = "hacknews-daily-export"
main = "dist/worker/index.js"
compatibility_date = "2024-12-11"

[vars]
HN_STORY_LIMIT = "30"
SUMMARY_MAX_LENGTH = "300"
ENABLE_CONTENT_FILTER = "false"
TARGET_REPO = "KrabsWong/tldr-hacknews-24"  # Change to your repo
TARGET_BRANCH = "main"

[triggers]
crons = ["0 1 * * *"]  # Daily at 01:00 UTC
```

**Important**: Update `TARGET_REPO` to match your GitHub repository path.

## Local Development

### 1. Create Local Secrets File

Copy the example file and fill in your values:

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your actual API keys (this file is git-ignored):

```
DEEPSEEK_API_KEY=your_deepseek_key_here
GITHUB_TOKEN=your_github_token_here
CRAWLER_API_URL=https://your-crawler-api.com
```

### 2. Build the Worker Bundle

```bash
npm run build:worker
```

This creates an optimized bundle at `dist/worker/index.js` using esbuild.

**Bundle size limit**: Maximum 1MB (uncompressed). The build will fail if exceeded.

### 3. Run Locally

```bash
npm run dev:worker
```

This starts a local Workers runtime at `http://localhost:8787`. The Worker will hot-reload on code changes.

### 4. Test Manually

**Health check**:
```bash
curl http://localhost:8787/
```

**Manual trigger**:
```bash
curl -X POST http://localhost:8787/trigger-export
```

Check logs in the terminal to see the export progress.

## Deployment

### 1. Build and Deploy

```bash
npm run deploy:worker
```

This command:
1. Builds the Worker bundle
2. Validates the configuration
3. Uploads to Cloudflare
4. Enables the cron trigger

### 2. Verify Deployment

After deployment, you'll see output like:

```
✅ Deployed to https://hacknews-daily-export.your-subdomain.workers.dev
```

Test the health check:

```bash
curl https://hacknews-daily-export.your-subdomain.workers.dev/
```

### 3. Check Scheduled Runs

View the cron trigger in the Cloudflare dashboard:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select **Workers & Pages**
3. Click your Worker name
4. Go to **Triggers** tab
5. Verify **Cron Triggers** shows `0 1 * * *` (daily at 01:00 UTC)

### 4. Monitor Logs

Stream live logs from your deployed Worker:

```bash
npm run logs:worker
```

This shows structured JSON logs with timestamps, levels, and context.

## Configuration

### Environment Variables

Configuration is set in `wrangler.toml` under `[vars]`:

| Variable | Default | Description |
|----------|---------|-------------|
| `HN_STORY_LIMIT` | `30` | Maximum stories to process |
| `SUMMARY_MAX_LENGTH` | `300` | AI summary character limit |
| `ENABLE_CONTENT_FILTER` | `false` | Enable AI content filtering |
| `CONTENT_FILTER_SENSITIVITY` | `medium` | Filter sensitivity (low/medium/high) |
| `TARGET_REPO` | `KrabsWong/tldr-hacknews-24` | GitHub repository path |
| `TARGET_BRANCH` | `main` | Git branch to push to |

To change configuration:
1. Edit `wrangler.toml`
2. Run `npm run deploy:worker` to apply changes

### Secrets Management

Secrets are encrypted and managed separately from configuration:

**List configured secrets**:
```bash
npx wrangler secret list
```

**Update a secret**:
```bash
npx wrangler secret put DEEPSEEK_API_KEY
```

**Delete a secret**:
```bash
npx wrangler secret delete CRAWLER_API_URL
```

## Troubleshooting

### Error: No API token found

**Solution**: Run `npx wrangler login` to authenticate with Cloudflare.

### Error: Bundle exceeds 1MB limit

**Causes**:
- Too many dependencies included in bundle
- Large data files imported at module level

**Solutions**:
1. Check bundle analysis: `cat dist/worker/meta.json`
2. Review dependencies for bloat
3. Use dynamic imports for optional code
4. Remove unused dependencies

### Error: CPU time limit exceeded

**Symptom**: Worker times out during export

**Solutions**:
1. Reduce `HN_STORY_LIMIT` (fewer stories = less processing)
2. Upgrade to Cloudflare Workers Paid plan ($5/month for 50ms CPU time)
3. Optimize bundle size to reduce cold start time

### Error: GitHub authentication failed

**Causes**:
- Invalid or expired GitHub token
- Token lacks `repo` scope

**Solutions**:
1. Verify token has `repo` scope at [github.com/settings/tokens](https://github.com/settings/tokens)
2. Generate new token if expired
3. Update secret: `npx wrangler secret put GITHUB_TOKEN`

### Error: Rate limit exceeded

**GitHub API**:
- Free tier: 5,000 requests/hour
- Solution: Worker uses exponential backoff, wait for rate limit reset

**DeepSeek API**:
- Check your plan limits at [platform.deepseek.com](https://platform.deepseek.com/)
- Solution: Reduce `HN_STORY_LIMIT` or disable `ENABLE_CONTENT_FILTER`

### No stories found for date

**Causes**:
- Very slow news day (rare)
- Date range filter too strict

**Solutions**:
1. Check Cloudflare logs: `npm run logs:worker`
2. Verify HackerNews is accessible
3. Try manual trigger next day

## Monitoring

### View Logs

**Real-time streaming**:
```bash
npm run logs:worker
```

**Cloudflare Dashboard**:
1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Select **Workers & Pages**
3. Click your Worker
4. Go to **Logs** tab (last 24 hours)

### Metrics

Cloudflare dashboard shows:
- Requests per day
- Success/error rate
- CPU time usage
- Bandwidth usage

### Export Success Verification

After each daily run (01:00 UTC):
1. Check the tldr-hacknews-24 repository at `_posts/` directory
2. Verify new file `YYYY-MM-DD-daily.md` exists
3. Inspect commit message: "Add HackerNews daily export for YYYY-MM-DD"

## Cost Estimation

### Free Tier Limits

Cloudflare Workers Free Plan includes:
- **100,000 requests/day** (we use 1-2/day)
- **10ms CPU time per request**
- **1MB script size**

### Expected Usage

Daily export typically uses:
- **1 scheduled request/day** (cron trigger)
- **~2-5 minutes total processing time**
- **Bundle size: ~200-400 KB** (well under limit)

### Upgrade Scenarios

You may need to upgrade to Paid plan ($5/month) if:
- **CPU time exceeds 10ms**: Processing >30 stories with AI may hit this limit
- **Need faster execution**: Paid plan provides 50ms CPU time

**Cost**: $5/month covers:
- Unlimited requests
- 50ms CPU time per request
- 10 million requests/month

## Migration from GitHub Actions

### Phase 1: Parallel Run (Recommended)

Keep both GitHub Actions and Worker running simultaneously for 7 days:

1. Deploy Worker with `npm run deploy:worker`
2. Keep GitHub Actions `daily-export.yml` active  
3. Compare outputs daily
4. Fix any discrepancies in Worker

### Phase 2: Cutover

After successful validation:

1. **Disable GitHub Actions schedule**:
   ```yaml
   # .github/workflows/daily-export.yml
   on:
     # schedule:  # Commented out - now using Cloudflare Worker
     #   - cron: '0 1 * * *'
     workflow_dispatch:  # Keep manual trigger as fallback
   ```

2. **Commit changes**:
   ```bash
   git add .github/workflows/daily-export.yml
   git commit -m "chore: migrate daily export to Cloudflare Worker"
   git push
   ```

3. **Monitor Worker for 30 days**

### Rollback Plan

If Worker fails consistently:

1. Re-enable GitHub Actions schedule in `daily-export.yml`
2. Push change to trigger immediate run
3. Disable Worker cron in Cloudflare dashboard (Triggers → Cron Triggers → Delete)
4. Investigate Worker errors via `npm run logs:worker`

## Advanced Topics

### Multiple Environments

Create staging environment for testing:

**Add to `wrangler.toml`**:
```toml
[env.staging]
name = "hacknews-daily-export-staging"
vars = { TARGET_BRANCH = "staging" }
```

**Deploy to staging**:
```bash
npm run deploy:worker:staging
```

**Configure staging secrets**:
```bash
npx wrangler secret put GITHUB_TOKEN --env staging
```

### Custom Domains

Connect a custom domain to your Worker:

1. Go to Cloudflare dashboard → Workers & Pages → Your Worker
2. Click **Triggers** → **Custom Domains**
3. Add domain: `export.yourdomain.com`
4. Update DNS (automatic for Cloudflare-managed domains)

### CI/CD Deployment

Automate Worker deployment via GitHub Actions:

```yaml
# .github/workflows/deploy-worker.yml
name: Deploy Worker
on:
  push:
    branches: [main]
    paths:
      - 'src/worker/**'
      - 'wrangler.toml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build:worker
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Support

- **Cloudflare Workers Docs**: [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/)
- **Wrangler CLI**: [developers.cloudflare.com/workers/wrangler](https://developers.cloudflare.com/workers/wrangler/)
- **GitHub API**: [docs.github.com/rest](https://docs.github.com/rest)
- **Project Issues**: [Report bugs](https://github.com/your-repo/issues)

## Quick Reference

### Common Commands

```bash
# Local development
npm run build:worker          # Build bundle
npm run dev:worker            # Run locally
npm run validate:worker       # Validate config

# Deployment
npm run deploy:worker         # Deploy to production
npm run deploy:worker:staging # Deploy to staging
npm run logs:worker           # Stream logs

# Secrets management
npx wrangler secret list                  # List secrets
npx wrangler secret put SECRET_NAME       # Set secret
npx wrangler secret delete SECRET_NAME    # Delete secret
```

### Key Files

- `wrangler.toml`: Worker configuration
- `src/worker/index.ts`: Worker entry point
- `src/worker/exportHandler.ts`: Export pipeline logic
- `src/worker/githubPush.ts`: GitHub integration
- `esbuild.worker.config.js`: Build configuration
- `.dev.vars`: Local development secrets (git-ignored)
