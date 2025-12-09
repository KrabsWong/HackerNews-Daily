# Change: Update GitHub Action to Support All Environment Variables

## Why

The current GitHub Action workflow (`daily-export.yml`) only passes `DEEPSEEK_API_KEY` to the export script. However, the application now supports many more configuration options via environment variables (as defined in `.env.example`), including:

- `CRAWLER_API_URL` - Required for the new crawler-only content extraction
- `HN_STORY_LIMIT` - Number of stories to fetch
- `HN_TIME_WINDOW_HOURS` - Time window for filtering stories
- `SUMMARY_MAX_LENGTH` - AI summary length limit
- `CACHE_ENABLED` / `CACHE_TTL_MINUTES` - Cache configuration
- `ENABLE_CONTENT_FILTER` / `CONTENT_FILTER_SENSITIVITY` - Content filtering

Without these variables being passed to the GitHub Action, the daily export will fail or produce suboptimal results (especially now that `CRAWLER_API_URL` is required for content extraction).

## What Changes

- Add all supported environment variables to the GitHub Action workflow
- Use GitHub Secrets for sensitive values (`CRAWLER_API_URL`)
- Use GitHub Variables or hardcoded defaults for non-sensitive configuration
- Document which secrets/variables need to be configured in the repository

## Impact

- **Affected specs:** 
  - `github-actions-workflow` - Add environment variable configuration requirement
  
- **Affected code:**
  - `.github/workflows/daily-export.yml` - Add env vars to the export step
  
- **User benefits:**
  - Daily export will work correctly with crawler API
  - All configuration options available in CI/CD environment
  - Clear documentation of required GitHub repository settings

## Required GitHub Repository Configuration

### Secrets (Settings → Secrets and variables → Actions → Secrets)
| Secret Name | Description | Required |
|-------------|-------------|----------|
| `DEEPSEEK_API_KEY` | DeepSeek API key for translation | Yes |
| `CRAWLER_API_URL` | Crawler service URL for content extraction | Yes |
| `TLDR_REPO_TOKEN` | Token for pushing to tldr-hacknews-24 repo | Yes |

### Variables (Settings → Secrets and variables → Actions → Variables)
| Variable Name | Description | Default |
|---------------|-------------|---------|
| `HN_STORY_LIMIT` | Number of stories to fetch | 30 |
| `HN_TIME_WINDOW_HOURS` | Time window in hours | 24 |
| `SUMMARY_MAX_LENGTH` | Max summary length | 300 |
| `CACHE_ENABLED` | Enable caching | false |
| `ENABLE_CONTENT_FILTER` | Enable content filter | false |
| `CONTENT_FILTER_SENSITIVITY` | Filter sensitivity | medium |
