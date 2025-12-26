# Tasks: Add Cloudflare Workers Deployment

## Overview
This document outlines the implementation tasks for replacing GitHub Actions with Cloudflare Workers for daily HackerNews export automation. Tasks are ordered to deliver incremental user-visible progress and enable early validation.

## Sequencing Strategy
- **Phase 1**: Setup and infrastructure (tasks 1-3)
- **Phase 2**: Core Worker implementation (tasks 4-7)
- **Phase 3**: GitHub integration (tasks 8-10)
- **Phase 4**: Testing and validation (tasks 11-13)
- **Phase 5**: Deployment and migration (tasks 14-16)

Tasks marked with 🔄 can be parallelized with the previous task.

---

## Task 1: Install Wrangler CLI and Initialize Configuration
**User Value**: Developers can begin local Worker development  
**Dependencies**: None  
**Estimated Effort**: 15 minutes

### Steps
1. Install Wrangler globally: `npm install -g wrangler`
2. Create `wrangler.toml` in project root with minimal configuration:
   ```toml
   name = "hackernews-daily-export"
   main = "dist/worker/index.js"
   compatibility_date = "2024-12-11"
   
   [vars]
   HN_STORY_LIMIT = "30"
   HN_TIME_WINDOW_HOURS = "24"
   SUMMARY_MAX_LENGTH = "300"
   ENABLE_CONTENT_FILTER = "false"
   CONTENT_FILTER_SENSITIVITY = "medium"
   TARGET_REPO = "KrabsWong/tldr-hacknews-24"
   TARGET_BRANCH = "main"
   
   [triggers]
   crons = ["0 1 * * *"]
   ```
3. Create `.dev.vars.example` file with placeholder secrets:
   ```
   DEEPSEEK_API_KEY=your_deepseek_key_here
   GITHUB_TOKEN=your_github_token_here
   CRAWLER_API_URL=https://your-crawler-api.com
   ```
4. Add `.dev.vars` to `.gitignore`
5. Update `package.json` to add dev dependency: `"wrangler": "^3.0.0"`

### Validation
- Run `wrangler whoami` to verify CLI installation
- Run `wrangler validate` to verify `wrangler.toml` syntax

---

## Task 2: Setup esbuild Configuration for Worker Bundle
**User Value**: Project can build optimized Worker bundles  
**Dependencies**: Task 1  
**Estimated Effort**: 30 minutes

### Steps
1. Install esbuild: `npm install --save-dev esbuild`
2. Create `esbuild.worker.config.js`:
   ```javascript
   const esbuild = require('esbuild');
   const fs = require('fs');
   
   esbuild.build({
     entryPoints: ['src/worker/index.ts'],
     bundle: true,
     outfile: 'dist/worker/index.js',
     format: 'esm',
     platform: 'browser',
     target: 'es2022',
     minify: true,
     treeShaking: true,
     sourcemap: false,
     external: [],
     define: {
       'process.env.NODE_ENV': '"production"',
     },
     metafile: true,
   }).then(result => {
     // Output bundle size
     const size = fs.statSync('dist/worker/index.js').size;
     console.log(`✅ Bundle created: ${(size / 1024).toFixed(2)} KB`);
     if (size > 1024 * 1024) {
       console.error(`❌ Bundle exceeds 1MB limit!`);
       process.exit(1);
     }
     // Write bundle metadata
     fs.writeFileSync('dist/worker/meta.json', JSON.stringify(result.metafile));
   }).catch(() => process.exit(1));
   ```
3. Add npm scripts to `package.json`:
   ```json
   "build:worker": "node esbuild.worker.config.js",
   "build:worker:watch": "node esbuild.worker.config.js --watch",
   "clean:worker": "rm -rf dist/worker"
   ```
4. Create `dist/worker/` directory in `.gitignore`

### Validation
- Run `npm run build:worker` and verify output in `dist/worker/index.js`
- Verify bundle size is logged and < 1MB

---

## Task 3: Replace axios with fetch API
**User Value**: Smaller bundle size, Workers-native HTTP client  
**Dependencies**: None (can run in parallel with Task 1-2) 🔄  
**Estimated Effort**: 45 minutes

### Steps
1. Audit codebase for `axios` usage:
   ```bash
   grep -r "import.*axios" src/
   grep -r "require.*axios" src/
   ```
2. Create utility wrapper `src/utils/fetch.ts`:
   ```typescript
   export async function fetchJSON<T>(url: string, options: RequestInit = {}): Promise<T> {
     const response = await fetch(url, {
       ...options,
       headers: {
         'Content-Type': 'application/json',
         ...options.headers,
       },
     });
     if (!response.ok) {
       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
     }
     return response.json();
   }
   ```
3. Replace all `axios.get()` calls with `fetch()` in:
   - `src/api/hackerNews.ts`
   - `src/services/articleFetcher.ts`
   - `src/services/translator.ts`
4. Replace `axios.post()` calls with `fetch(..., { method: 'POST' })`
5. Update timeout handling from `axios.timeout` to `AbortController` with `setTimeout()`
6. Remove `axios` from `package.json` dependencies

### Validation
- Run `npm run build` and verify no axios import errors
- Test HackerNews API calls: `npm run fetch -- --no-cache`
- Verify all API calls complete successfully

---

## Task 4: Replace jsdom with linkedom
**User Value**: Significantly smaller bundle size (~40KB vs 5MB)  
**Dependencies**: None 🔄  
**Estimated Effort**: 30 minutes

### Steps
1. Install linkedom: `npm install linkedom`
2. Replace jsdom imports in `src/services/articleFetcher.ts`:
   ```typescript
   // Before
   import { JSDOM } from 'jsdom';
   const dom = new JSDOM(html);
   const document = dom.window.document;
   
   // After
   import { parseHTML } from 'linkedom';
   const { document } = parseHTML(html);
   ```
3. Test Readability compatibility with linkedom
4. Remove `jsdom` and `@types/jsdom` from `package.json`

### Validation
- Run `npm run build:worker` and verify bundle size decreased
- Test article extraction: `npm run fetch -- --story-limit=5`
- Verify at least 80% of articles extract content successfully

---

## Task 5: Implement Worker Entry Point
**User Value**: Basic Worker can respond to HTTP requests  
**Dependencies**: Tasks 1-2  
**Estimated Effort**: 45 minutes

### Steps
1. Create `src/worker/index.ts`:
   ```typescript
   export interface Env {
     DEEPSEEK_API_KEY: string;
     GITHUB_TOKEN: string;
     CRAWLER_API_URL?: string;
     HN_STORY_LIMIT: string;
     SUMMARY_MAX_LENGTH: string;
     ENABLE_CONTENT_FILTER: string;
     TARGET_REPO: string;
     TARGET_BRANCH: string;
   }
   
   export default {
     async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
       const url = new URL(request.url);
       
       if (url.pathname === '/') {
         return new Response('HackerNews Daily Export Worker', {
           status: 200,
           headers: { 'X-Worker-Version': '1.0.0' },
         });
       }
       
       if (url.pathname === '/trigger-export' && request.method === 'POST') {
         ctx.waitUntil(handleDailyExport(env));
         return new Response('Export triggered', { status: 202 });
       }
       
       return new Response('Not Found', { status: 404 });
     },
     
     async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
       ctx.waitUntil(handleDailyExport(env));
     },
   };
   
   async function handleDailyExport(env: Env): Promise<void> {
     console.log('Daily export started');
     // TODO: Implement export logic
   }
   ```
2. Create TypeScript type definitions for Cloudflare Workers (if not auto-detected)
3. Update `tsconfig.json` to include `src/worker/` directory

### Validation
- Build Worker: `npm run build:worker`
- Run locally: `wrangler dev --local`
- Test health check: `curl http://localhost:8787/`
- Verify response: "HackerNews Daily Export Worker"

---

## Task 6: Implement Export Handler with Existing Services
**User Value**: Worker can execute complete export pipeline  
**Dependencies**: Tasks 3-5  
**Estimated Effort**: 1.5 hours

### Steps
1. Create `src/worker/exportHandler.ts`:
   ```typescript
   import { fetchTopStories } from '../api/hackerNews';
   import { fetchArticleContent } from '../services/articleFetcher';
   import { translateText, generateSummary } from '../services/translator';
   import { filterStories } from '../services/contentFilter';
   import { exportToMarkdown } from '../services/markdownExporter';
   import type { Env } from './index';
   
   export async function runDailyExport(env: Env): Promise<string> {
     const startTime = Date.now();
     
     // Calculate previous day date range (UTC)
     const yesterday = new Date();
     yesterday.setUTCDate(yesterday.getUTCDate() - 1);
     yesterday.setUTCHours(0, 0, 0, 0);
     const endOfDay = new Date(yesterday);
     endOfDay.setUTCHours(23, 59, 59, 999);
     
     console.log(`Fetching stories for ${yesterday.toISOString().split('T')[0]}`);
     
     // Fetch stories (reuse existing logic)
     const stories = await fetchTopStories({
       limit: parseInt(env.HN_STORY_LIMIT || '30'),
       startDate: yesterday,
       endDate: endOfDay,
     });
     
     console.log(`Fetched ${stories.length} stories`);
     
     // Apply content filter if enabled
     let filteredStories = stories;
     if (env.ENABLE_CONTENT_FILTER === 'true') {
       filteredStories = await filterStories(stories, {
         apiKey: env.DEEPSEEK_API_KEY,
         sensitivity: env.CONTENT_FILTER_SENSITIVITY as any,
       });
       console.log(`Filtered to ${filteredStories.length} stories`);
     }
     
     // Process each story (extract, summarize, translate)
     const processedStories = [];
     for (const story of filteredStories) {
       try {
         // Extract article content
         const content = await fetchArticleContent(story.url, env.CRAWLER_API_URL);
         
         // Generate summaries
         const articleSummary = await generateSummary(content, {
           apiKey: env.DEEPSEEK_API_KEY,
           maxLength: parseInt(env.SUMMARY_MAX_LENGTH || '300'),
         });
         
         // Translate to Chinese
         const translatedTitle = await translateText(story.title, env.DEEPSEEK_API_KEY);
         const translatedSummary = await translateText(articleSummary, env.DEEPSEEK_API_KEY);
         
         processedStories.push({
           ...story,
           translatedTitle,
           articleSummary: translatedSummary,
           originalContent: content,
         });
       } catch (error) {
         console.error(`Failed to process story ${story.id}:`, error);
         // Continue processing other stories (graceful degradation)
       }
     }
     
     console.log(`Successfully processed ${processedStories.length} stories`);
     
     // Generate Markdown file
     const markdown = exportToMarkdown(processedStories, yesterday);
     
     const duration = Date.now() - startTime;
     console.log(`Export completed in ${duration}ms`);
     
     return markdown;
   }
   ```
2. Update `src/worker/index.ts` to call `runDailyExport()` in `handleDailyExport()`
3. Disable cache service in Worker context (set `CACHE_ENABLED=false` in environment)

### Validation
- Build Worker: `npm run build:worker`
- Create local `.dev.vars` with real API keys
- Run `wrangler dev --local`
- Trigger export: `curl -X POST http://localhost:8787/trigger-export`
- Check logs for "Export completed" message

---

## Task 7: Add Structured Logging and Metrics
**User Value**: Developers can monitor Worker execution and debug issues  
**Dependencies**: Task 6  
**Estimated Effort**: 45 minutes

### Steps
1. Create `src/worker/logger.ts`:
   ```typescript
   export function logInfo(message: string, context?: Record<string, any>) {
     console.log(JSON.stringify({
       timestamp: new Date().toISOString(),
       level: 'info',
       message,
       ...context,
     }));
   }
   
   export function logError(message: string, error: Error, context?: Record<string, any>) {
     console.error(JSON.stringify({
       timestamp: new Date().toISOString(),
       level: 'error',
       message,
       error: {
         name: error.name,
         message: error.message,
         stack: error.stack,
       },
       ...context,
     }));
   }
   
   export function logMetrics(metrics: {
     storiesFetched: number;
     storiesProcessed: number;
     storiesFailed: number;
     duration: number;
     apiCalls: Record<string, number>;
   }) {
     console.log(JSON.stringify({
       timestamp: new Date().toISOString(),
       level: 'metrics',
       ...metrics,
     }));
   }
   ```
2. Replace all `console.log()` calls in `exportHandler.ts` with structured logging
3. Track API call counts and latencies
4. Log export summary metrics at the end

### Validation
- Run Worker locally and trigger export
- Verify logs are structured JSON
- Use `wrangler tail` to stream logs after deployment

---

## Task 8: Implement GitHub API Client
**User Value**: Worker can authenticate and communicate with GitHub  
**Dependencies**: Task 3 (fetch API replacement)  
**Estimated Effort**: 1 hour

### Steps
1. Create `src/worker/githubClient.ts`:
   ```typescript
   export class GitHubClient {
     private token: string;
     private baseURL = 'https://api.github.com';
     
     constructor(token: string) {
       if (!token) throw new Error('Missing GITHUB_TOKEN');
       this.token = token;
     }
     
     private async request<T>(method: string, path: string, body?: any): Promise<T> {
       const response = await fetch(`${this.baseURL}${path}`, {
         method,
         headers: {
           'Authorization': `Bearer ${this.token}`,
           'Accept': 'application/vnd.github+json',
           'X-GitHub-Api-Version': '2022-11-28',
           'User-Agent': 'HackerNewsDaily-Worker/1.0',
           ...(body ? { 'Content-Type': 'application/json' } : {}),
         },
         body: body ? JSON.stringify(body) : undefined,
       });
       
       if (response.status === 401 || response.status === 403) {
         throw new Error(`GitHub authentication failed: ${response.statusText}`);
       }
       
       if (!response.ok) {
         const errorBody = await response.text();
         throw new Error(`GitHub API error ${response.status}: ${errorBody}`);
       }
       
       return response.json();
     }
     
     async getFileContent(repo: string, path: string, branch: string): Promise<{ sha: string; content: string } | null> {
       try {
         const data = await this.request<any>('GET', `/repos/${repo}/contents/${path}?ref=${branch}`);
         return { sha: data.sha, content: atob(data.content) };
       } catch (error) {
         if (error.message.includes('404')) return null;
         throw error;
       }
     }
     
     async createOrUpdateFile(
       repo: string,
       path: string,
       branch: string,
       content: string,
       message: string,
       sha?: string
     ): Promise<void> {
       const body = {
         message,
         content: btoa(content),
         branch,
         ...(sha ? { sha } : {}),
       };
       
       await this.request('PUT', `/repos/${repo}/contents/${path}`, body);
     }
   }
   ```
2. Add error handling for rate limits (check `X-RateLimit-Remaining` header)
3. Implement exponential backoff for 5xx errors

### Validation
- Unit test GitHub client methods (mock fetch responses)
- Test authentication with invalid token (expect clear error)
- Test file existence check for non-existent file (expect null)

---

## Task 9: Implement GitHub Push Handler with Versioning
**User Value**: Worker can push Markdown files to tldr-hacknews-24 repository  
**Dependencies**: Task 8  
**Estimated Effort**: 1.5 hours

### Steps
1. Create `src/worker/githubPush.ts`:
   ```typescript
   import { GitHubClient } from './githubClient';
   import { logInfo, logError } from './logger';
   
   export async function pushToGitHub(
     markdown: string,
     date: string,
     env: { GITHUB_TOKEN: string; TARGET_REPO: string; TARGET_BRANCH: string }
   ): Promise<void> {
     const client = new GitHubClient(env.GITHUB_TOKEN);
     const repo = env.TARGET_REPO;
     const branch = env.TARGET_BRANCH;
     
     // Check for existing file
     let filename = `${date}-daily.md`;
     let path = `_posts/${filename}`;
     let existing = await client.getFileContent(repo, path, branch);
     
     // Handle versioning
     if (existing) {
       logInfo('File already exists, checking for next version', { filename });
       let version = 2;
       while (true) {
         filename = `${date}-daily-v${version}.md`;
         path = `_posts/${filename}`;
         existing = await client.getFileContent(repo, path, branch);
         if (!existing) break;
         version++;
       }
       logInfo('Using versioned filename', { filename });
     }
     
     // Generate commit message
     const versionSuffix = filename.includes('-v') ? ` (${filename.match(/-v(\d+)/)[1]})` : '';
     const message = `Add HackerNews daily export for ${date}${versionSuffix}`;
     
     // Push file
     try {
       await client.createOrUpdateFile(repo, path, branch, markdown, message, existing?.sha);
       logInfo('Successfully pushed to GitHub', { filename, repo, branch });
     } catch (error) {
       logError('Failed to push to GitHub', error, { filename, repo });
       throw error;
     }
   }
   ```
2. Add retry logic with exponential backoff (1s, 2s, 4s, max 3 retries)
3. Handle 409 Conflict (concurrent update) by incrementing version

### Validation
- Test with local Wrangler dev + real GitHub token
- Trigger export twice on same day → verify versioned file (v2) created
- Verify commit message format matches GitHub Actions convention

---

## Task 10: Integrate GitHub Push into Export Pipeline
**User Value**: Complete end-to-end automation works  
**Dependencies**: Tasks 6-9  
**Estimated Effort**: 30 minutes

### Steps
1. Update `src/worker/exportHandler.ts` to call `pushToGitHub()` after Markdown generation:
   ```typescript
   // ... after generating markdown ...
   
   const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
   await pushToGitHub(markdown, dateStr, {
     GITHUB_TOKEN: env.GITHUB_TOKEN,
     TARGET_REPO: env.TARGET_REPO,
     TARGET_BRANCH: env.TARGET_BRANCH,
   });
   
   console.log('Export and push completed successfully');
   ```
2. Update `handleDailyExport()` in `src/worker/index.ts` to catch and log errors
3. Return HTTP 500 on failure (for manual triggers)

### Validation
- Run Worker locally: `wrangler dev --local`
- Trigger export: `curl -X POST http://localhost:8787/trigger-export`
- Verify Markdown file appears in tldr-hacknews-24 `_posts/` directory
- Verify commit author and message format

---

## Task 11: Add Deployment npm Scripts
**User Value**: Developers can deploy Worker with simple commands  
**Dependencies**: Tasks 1-10  
**Estimated Effort**: 15 minutes

### Steps
1. Add scripts to `package.json`:
   ```json
   "dev:worker": "wrangler dev --local --persist",
   "deploy:worker": "npm run build:worker && wrangler deploy",
   "deploy:worker:staging": "npm run build:worker && wrangler deploy --env staging",
   "logs:worker": "wrangler tail",
   "validate:worker": "wrangler validate"
   ```
2. Add `.wrangler/` to `.gitignore`

### Validation
- Run `npm run validate:worker` and verify no errors
- Run `npm run deploy:worker -- --dry-run` and verify output

---

## Task 12: Write Deployment Documentation
**User Value**: Developers can deploy Worker without assistance  
**Dependencies**: Task 11  
**Estimated Effort**: 45 minutes

### Steps
1. Create `docs/cloudflare-worker-deployment.md` with sections:
   - Prerequisites (Cloudflare account, Wrangler CLI)
   - Initial setup (authentication, secrets configuration)
   - Local development workflow
   - Deployment procedure
   - Monitoring and troubleshooting
   - Rollback instructions
2. Update main `README.md` to add:
   - New section "Deployment Options" (GitHub Actions vs Cloudflare Workers)
   - Link to `docs/cloudflare-worker-deployment.md`
   - Comparison table (cost, latency, complexity)
3. Add troubleshooting guide for common errors

### Validation
- Ask a colleague to follow the guide and deploy to their Cloudflare account
- Verify they can complete deployment without asking questions

---

## Task 13: Test Worker in Staging Environment
**User Value**: Validate Worker works in production-like environment  
**Dependencies**: Tasks 1-12  
**Estimated Effort**: 1 hour

### Steps
1. Deploy Worker to staging environment: `npm run deploy:worker:staging`
2. Configure staging secrets:
   ```bash
   wrangler secret put DEEPSEEK_API_KEY --env staging
   wrangler secret put GITHUB_TOKEN --env staging
   ```
3. Manually trigger export: `curl -X POST https://hackernews-daily-export-staging.workers.dev/trigger-export`
4. Monitor logs: `wrangler tail --env staging`
5. Verify Markdown file appears in tldr-hacknews-24 repository
6. Compare output with GitHub Actions result (run both for same day)

### Validation
- Export completes successfully (no errors in logs)
- Generated Markdown matches GitHub Actions output (same stories, translations)
- Execution time is comparable (within 20% variance)
- Bundle size is within Cloudflare limits

---

## Task 14: Deploy Worker to Production
**User Value**: Production Worker is live and ready for cutover  
**Dependencies**: Task 13  
**Estimated Effort**: 30 minutes

### Steps
1. Deploy Worker to production: `npm run deploy:worker`
2. Configure production secrets (same as staging but in default environment)
3. Verify cron trigger is configured: Check Cloudflare dashboard → Workers → Triggers
4. Test manual trigger to production Worker
5. Monitor first scheduled run (wait until 01:00 UTC next day)

### Validation
- Production Worker health check returns 200 OK
- Cron trigger shows "Next execution at 01:00 UTC tomorrow"
- Manual trigger test succeeds

---

## Task 15: Parallel Run with GitHub Actions (7 Days)
**User Value**: Validate Worker reliability before full cutover  
**Dependencies**: Task 14  
**Estimated Effort**: 1 week monitoring

### Steps
1. Keep GitHub Actions `daily-export.yml` active
2. Let Worker run on schedule (01:00 UTC daily)
3. Daily comparison checklist:
   - Both exports completed successfully?
   - Story counts match (±2 tolerance for timing differences)?
   - Translations are equivalent?
   - File formats are identical?
4. Document any discrepancies or failures
5. Fix issues in Worker and redeploy as needed

### Validation
- Worker succeeds ≥6 out of 7 days (85%+ reliability)
- Output quality matches GitHub Actions
- No critical issues requiring rollback

---

## Task 16: Cutover to Worker and Archive GitHub Actions
**User Value**: GitHub Actions dependency removed, Worker is primary automation  
**Dependencies**: Task 15 (successful validation)  
**Estimated Effort**: 30 minutes

### Steps
1. Update GitHub Actions `daily-export.yml`:
   - Comment out `schedule` trigger (keep `workflow_dispatch` for manual fallback)
   - Add comment: "Replaced by Cloudflare Worker. See docs/cloudflare-worker-deployment.md"
2. Commit changes with message: "chore: migrate daily export to Cloudflare Worker"
3. Update README.md to reflect Worker as primary deployment method
4. Add GitHub Actions badge showing "Manual trigger only" status
5. Monitor Worker for next 30 days (set calendar reminder)

### Validation
- No scheduled GitHub Actions runs occur
- Worker continues daily exports successfully
- Team is aware of cutover and fallback procedure

---

## Optional Task 17: Add Optional Webhook Notifications (Future Enhancement)
**User Value**: Team receives alerts on export failures  
**Dependencies**: Task 16  
**Estimated Effort**: 1 hour

### Steps
1. Add `WEBHOOK_URL` to `wrangler.toml` (optional variable)
2. Create `src/worker/notifier.ts` to send webhook notifications (Slack/Discord format)
3. Call notifier on export failure in `handleDailyExport()`
4. Document webhook setup in deployment guide

### Validation
- Test with intentionally broken export (invalid API key)
- Verify webhook notification received with error details

---

## Risk Mitigation Tasks

### Rollback Plan (Emergency Use)
If Worker fails consistently after cutover:
1. Re-enable GitHub Actions schedule in `daily-export.yml`
2. Push commit to trigger immediate Action run
3. Disable Worker cron in Cloudflare dashboard
4. Investigate Worker failures via `wrangler tail` and dashboard logs
5. Fix issues and retry cutover after validation

### Bundle Size Monitoring
- Add script to check bundle size after every build
- Fail CI if bundle exceeds 900KB (safety margin)
- Alert team if bundle size increases >10% between versions
