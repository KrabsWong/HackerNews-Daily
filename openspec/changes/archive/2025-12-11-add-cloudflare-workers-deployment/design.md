# Design: Cloudflare Workers Deployment Architecture

## Overview
This design document outlines the architecture for replacing GitHub Actions with Cloudflare Workers for automated daily HackerNews exports. The solution leverages Cloudflare's serverless platform to execute the existing Node.js export logic on a scheduled basis and push results to the tldr-hacknews-24 GitHub repository.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers Platform                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Worker: hackernews-daily-export              │  │
│  │                                                          │  │
│  │  ┌────────────────┐    ┌──────────────────────────┐   │  │
│  │  │  Cron Trigger  │───▶│  Export Handler          │   │  │
│  │  │  (01:00 UTC)   │    │  - Fetch HN stories      │   │  │
│  │  └────────────────┘    │  - Extract content       │   │  │
│  │                        │  - Generate summaries    │   │  │
│  │  ┌────────────────┐    │  - Translate to Chinese  │   │  │
│  │  │  HTTP Trigger  │───▶│  - Format Markdown       │   │  │
│  │  │ (manual test)  │    └──────────┬───────────────┘   │  │
│  │  └────────────────┘               │                   │  │
│  │                                   │                   │  │
│  │                        ┌──────────▼───────────────┐   │  │
│  │                        │  GitHub Push Handler     │   │  │
│  │                        │  - Get latest commit SHA │   │  │
│  │                        │  - Create/update file    │   │  │
│  │                        │  - Handle versioning     │   │  │
│  │                        └──────────┬───────────────┘   │  │
│  └───────────────────────────────────┼───────────────────┘  │
└────────────────────────────────────┼────────────────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
       ┌─────────▼──────────┐  ┌──────▼──────────┐  ┌─────▼────────┐
       │  HN Firebase API   │  │  Algolia API    │  │  GitHub API  │
       │  (story IDs)       │  │  (story details)│  │  (repo push) │
       └────────────────────┘  └─────────────────┘  └──────────────┘
                 │                    │                    │
       ┌─────────▼──────────┐  ┌──────▼──────────┐        │
       │  DeepSeek LLM API  │  │  Crawler API    │        │
       │  (AI summaries)    │  │  (content fetch)│        │
       └────────────────────┘  └─────────────────┘        │
                                                           │
                                             ┌─────────────▼────────────┐
                                             │  tldr-hacknews-24 Repo   │
                                             │  (_posts/*.md files)     │
                                             └──────────────────────────┘
```

### Component Breakdown

#### 1. Worker Entry Point (`src/worker/index.ts`)
**Responsibility**: Handle incoming requests (cron/HTTP) and route to appropriate handler

```typescript
// Pseudo-code structure
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleDailyExport(env));
  },
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Manual trigger endpoint
    if (request.url.endsWith('/trigger-export')) {
      ctx.waitUntil(handleDailyExport(env));
      return new Response('Export triggered', { status: 202 });
    }
    return new Response('OK', { status: 200 });
  }
};
```

**Key decisions**:
- Use `ctx.waitUntil()` for long-running exports (allows worker to return response before completion)
- Separate scheduled vs. HTTP trigger logic for flexibility
- Environment variables passed via `env` object (configured in wrangler.toml)

#### 2. Export Handler (`src/worker/exportHandler.ts`)
**Responsibility**: Orchestrate the daily export pipeline

**Reuses existing code**:
- `src/api/hackerNews.ts` (Firebase/Algolia API calls)
- `src/services/articleFetcher.ts` (content extraction)
- `src/services/translator.ts` (DeepSeek LLM)
- `src/services/contentFilter.ts` (optional AI filtering)
- `src/services/markdownExporter.ts` (Markdown generation)

**New logic**:
- Date calculation for "previous day" (UTC timezone)
- Error handling and retry logic (exponential backoff)
- Logging/telemetry for Cloudflare dashboard

**Constraints**:
- Must complete within CPU time limits (10ms free tier → upgrade if needed)
- No file system access (use in-memory buffers for Markdown content)
- Bundle size optimization (tree-shake unused dependencies)

#### 3. GitHub Push Handler (`src/worker/githubPush.ts`)
**Responsibility**: Push generated Markdown to tldr-hacknews-24 repository

**Implementation approach**:
- Use GitHub REST API v3 (`PUT /repos/{owner}/{repo}/contents/{path}`)
- Authenticate with Personal Access Token (stored in Cloudflare secret)
- Handle file versioning logic (check existing files, append `-v{N}` if needed)
- Base64-encode Markdown content (GitHub API requirement)

**API flow**:
1. `GET /repos/KrabsWong/tldr-hacknews-24/contents/_posts/{filename}` → Check if file exists, get SHA
2. If exists: Generate versioned filename (`YYYY-MM-DD-daily-v{N}.md`)
3. `PUT /repos/KrabsWong/tldr-hacknews-24/contents/_posts/{filename}` → Create/update file
   - Body: `{ message: "...", content: base64(markdown), branch: "main", sha?: "..." }`

**Error handling**:
- 409 Conflict (concurrent update) → Retry with incremented version
- 403 Forbidden (token expired) → Log error, alert developer
- 5xx GitHub API errors → Exponential backoff (3 retries max)

## Data Flow

### Daily Export Sequence

```
1. Cron Trigger (01:00 UTC)
   │
   ├─▶ Calculate previous day date range (UTC 00:00-23:59)
   │
   ├─▶ Fetch best stories from HN APIs (reuse existing logic)
   │   ├─ Firebase: Get best story IDs
   │   └─ Algolia: Batch fetch story details
   │
   ├─▶ Filter stories by date range (previous day)
   │
   ├─▶ Apply content filter (if ENABLE_CONTENT_FILTER=true)
   │
   ├─▶ For each story:
   │   ├─ Extract article content (Readability + fallback to Crawler API)
   │   ├─ Fetch top 10 comments (Firebase API)
   │   ├─ Generate AI summaries (DeepSeek LLM)
   │   └─ Translate to Chinese (DeepSeek LLM)
   │
   ├─▶ Generate Markdown file (with Jekyll frontmatter)
   │
   ├─▶ Push to GitHub repository
   │   ├─ Check for existing file
   │   ├─ Generate versioned filename if needed
   │   └─ Create commit via GitHub API
   │
   └─▶ Log result (success/failure)
```

## Configuration Management

### Environment Variables (Cloudflare Secrets)

**Required secrets** (stored via `wrangler secret put`):
- `DEEPSEEK_API_KEY`: DeepSeek API key for LLM operations
- `GITHUB_TOKEN`: Personal Access Token with `repo` scope for tldr-hacknews-24
- `CRAWLER_API_URL`: (Optional) Crawler API base URL for content extraction fallback

**Configuration variables** (stored in `wrangler.toml`):
- `HN_STORY_LIMIT=30`: Max stories to process
- `HN_TIME_WINDOW_HOURS=24`: Time window for story filtering
- `SUMMARY_MAX_LENGTH=300`: AI summary character limit
- `ENABLE_CONTENT_FILTER=false`: AI content filtering toggle
- `CONTENT_FILTER_SENSITIVITY=medium`: Filter sensitivity level
- `CACHE_ENABLED=false`: Disable caching in serverless context
- `TARGET_REPO=KrabsWong/tldr-hacknews-24`: GitHub repository path
- `TARGET_BRANCH=main`: Target Git branch

**Example `wrangler.toml`**:
```toml
name = "hackernews-daily-export"
main = "dist/worker/index.js"
compatibility_date = "2024-12-11"

[vars]
HN_STORY_LIMIT = "30"
SUMMARY_MAX_LENGTH = "300"
ENABLE_CONTENT_FILTER = "false"
TARGET_REPO = "KrabsWong/tldr-hacknews-24"
TARGET_BRANCH = "main"

[triggers]
crons = ["0 1 * * *"]  # 01:00 UTC daily
```

## Build & Bundle Strategy

### Bundling Approach
**Choice**: Use **esbuild** for optimized bundling

**Rationale**:
- **Tree-shaking**: Remove unused code from large dependencies (axios, cheerio, jsdom)
- **Smaller bundle size**: Cloudflare Workers have 1MB script size limit (3MB with compression)
- **Faster cold starts**: Smaller bundles load faster
- **CommonJS → ESM conversion**: Workers prefer ES modules

**Build configuration** (`esbuild.config.js`):
```javascript
require('esbuild').build({
  entryPoints: ['src/worker/index.ts'],
  bundle: true,
  outfile: 'dist/worker/index.js',
  format: 'esm',
  platform: 'browser', // Workers use browser-like environment
  target: 'es2022',
  minify: true,
  treeShaking: true,
  external: [], // Bundle all dependencies
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});
```

### Dependency Considerations

**Problematic dependencies** (may need alternatives):
1. **jsdom** (5MB+): Too large for Workers
   - *Solution*: Use lightweight HTML parser (e.g., `linkedom` or inline Readability logic)
2. **fs module**: Not available in Workers
   - *Solution*: Remove cache service dependency (already disabled via `CACHE_ENABLED=false`)
3. **axios**: Heavy dependency (~200KB)
   - *Solution*: Replace with `fetch` API (native in Workers)

**Package replacements**:
| Original | Replacement | Reason |
|----------|-------------|--------|
| `axios` | `fetch` | Native Workers API, smaller |
| `jsdom` | `linkedom` | Lightweight DOM (40KB vs. 5MB) |
| `fs` | In-memory buffers | No file system in serverless |

## Deployment Strategy

### Development Workflow
1. **Local development**: `wrangler dev` (runs local Workers emulator)
2. **Testing**: `curl http://localhost:8787/trigger-export` (manual trigger)
3. **Deployment**: `wrangler deploy` (publishes to Cloudflare)
4. **Monitoring**: Cloudflare dashboard (logs, errors, analytics)

### CI/CD Integration (Optional)
While replacing GitHub Actions for daily export, we can optionally use Actions for **deploying** the Worker itself:

```yaml
# .github/workflows/deploy-worker.yml (optional)
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
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## Error Handling & Resilience

### Retry Strategy
**Transient failures** (network errors, API rate limits):
- Exponential backoff: 1s, 2s, 4s (3 retries max)
- Apply to: HN API calls, DeepSeek LLM, GitHub API

**Permanent failures** (invalid API keys, missing content):
- Log error and continue (graceful degradation)
- Skip failed stories (don't block entire export)

### Logging & Monitoring
**Structured logging** (use `console.log` → Cloudflare captures):
```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Export completed',
  data: { storiesProcessed: 30, duration: 180000 }
}));
```

**Metrics to track**:
- Export success/failure rate
- Processing duration (total and per-story)
- API call latency (HN, DeepSeek, GitHub)
- Error types and frequencies

**Alerting** (future enhancement):
- Optional webhook notification (Slack/Discord) on failure
- Configurable via `WEBHOOK_URL` environment variable

## Migration Strategy

### Phase 1: Parallel Deployment (Recommended)
1. Deploy Worker with manual trigger only (no cron)
2. Keep GitHub Actions workflow active
3. Test Worker manually for 7 days
4. Compare outputs (GitHub Actions vs. Worker)
5. Once validated, enable Worker cron and disable GitHub Actions schedule

### Phase 2: Full Cutover
1. Update `wrangler.toml` to add cron trigger
2. Deploy updated Worker
3. Comment out GitHub Actions schedule (keep manual trigger as fallback)
4. Monitor for 30 days

### Rollback Plan
If Worker fails consistently:
1. Re-enable GitHub Actions schedule
2. Disable Worker cron trigger
3. Investigate and fix Worker issues
4. Retry cutover

## Security Considerations

### Secrets Management
- **Storage**: Cloudflare Secrets (encrypted at rest)
- **Access**: Only Worker runtime can read secrets (not visible in dashboard)
- **Rotation**: Update via `wrangler secret put <KEY>`

### API Token Scopes
- **GitHub Token**: Minimal scope (`repo` for tldr-hacknews-24 only)
- **DeepSeek API Key**: Rate-limited by DeepSeek platform

### Audit Trail
- All Git commits show author: `cloudflare-worker[bot]` (via token metadata)
- Cloudflare logs retain execution history (7-day retention on free tier)

## Cost Analysis

### Cloudflare Workers Free Tier
- **Requests**: 100,000/day (we use 1-2/day)
- **CPU time**: 10ms per request (may need upgrade to paid for long exports)
- **Script size**: 1MB compressed (need to optimize bundle)

### Estimated Usage
- **Daily export**: 1 scheduled execution/day
- **Manual triggers**: ~5/month (testing)
- **CPU time**: ~2-3 minutes total processing (need paid plan: $5/month for 50ms CPU time)

**Recommendation**: Start with free tier, upgrade to paid ($5/month) if CPU limits hit.

## Open Design Decisions

### 1. Bundling Strategy
**Question**: Use esbuild, Rollup, or Webpack?  
**Recommendation**: **esbuild** (fastest, smallest bundles)

### 2. DOM Parser
**Question**: linkedom, sax, or custom Readability port?  
**Recommendation**: **linkedom** (40KB, Readability-compatible)

### 3. Error Notification
**Question**: Implement webhook alerts now or later?  
**Recommendation**: **Later** (start with Cloudflare logs, add alerts in future iteration)

### 4. Backward Compatibility
**Question**: Keep GitHub Actions workflow?  
**Recommendation**: **Yes** (disable schedule, keep manual trigger as fallback)

## Testing Strategy

### Unit Tests
- Test export handler logic (mock APIs)
- Test GitHub push handler (mock GitHub API responses)
- Test date calculation (UTC timezone edge cases)

### Integration Tests
- Local Worker testing via `wrangler dev`
- Manual trigger endpoint (`/trigger-export`)
- Dry-run mode (generate Markdown without GitHub push)

### End-to-End Validation
1. Deploy to Cloudflare staging environment
2. Trigger manual export
3. Verify Markdown file in tldr-hacknews-24 repository
4. Compare output with GitHub Actions result
5. Monitor logs for errors

## Success Metrics
- **Reliability**: ≥99% successful exports over 30 days
- **Performance**: Export completes within 5 minutes
- **Cost**: Stays within free tier OR paid tier cost <$10/month
- **Maintainability**: Deployment updates take <10 minutes
- **Developer experience**: Local testing workflow is intuitive

## Future Enhancements (Out of Scope)
1. **Multi-platform support**: Add Tencent Cloud SCF adapter
2. **Real-time exports**: Support hourly or on-demand exports
3. **Advanced monitoring**: Integrate with external APM (e.g., Sentry, Datadog)
4. **Content caching**: Use Cloudflare KV/R2 for story caching
5. **Progressive rollout**: Canary deployments with gradual traffic shifting
