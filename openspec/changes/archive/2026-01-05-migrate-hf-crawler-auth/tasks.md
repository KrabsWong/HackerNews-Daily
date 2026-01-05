# Implementation Tasks: Migrate to Hugging Face Spaces Crawler with Bearer Token Authentication

## 1. Update Type Definitions

- [x] 1.1 Add `CRAWLER_API_TOKEN` to Env interface in `src/types/worker.ts`
  - Add optional field: `CRAWLER_API_TOKEN?: string`
  - Add JSDoc comment explaining it's for Bearer token authentication
  - Position after `CRAWLER_API_URL` for logical grouping

## 2. Update Crawler API Client

- [x] 2.1 Update `fetchWithCrawlerAPI()` signature in `src/services/articleFetcher/crawler.ts`
  - Add third parameter: `crawlerApiToken?: string`
  - Update function JSDoc to document the token parameter
  
- [x] 2.2 Add Authorization header logic
  - Create headers object with Content-Type
  - Conditionally add Authorization header if token is provided: `Bearer ${crawlerApiToken}`
  - Pass headers to `post()` call in options object
  
- [x] 2.3 Update error logging (security consideration)
  - Ensure token is never logged in error messages
  - Log presence/absence of auth without revealing token value

## 3. Update Caller Functions

- [x] 3.1 Update `fetchArticleMetadata()` in `src/services/articleFetcher/metadata.ts`
  - Add `crawlerApiToken?: string` parameter
  - Pass token to `fetchWithCrawlerAPI()` calls
  - Update function JSDoc

- [x] 3.2 Update `fetchArticlesBatch()` in `src/services/articleFetcher/metadata.ts`
  - Add `crawlerApiToken?: string` parameter
  - Pass token to `fetchArticleMetadata()` calls
  - Update function JSDoc

## 4. Update Service Integration Points

- [x] 4.1 Update task executor in `src/services/task/executor.ts`
  - Pass `this.env.CRAWLER_API_TOKEN` to article fetching calls
  - Update to include token parameter in fetchArticleMetadata calls

- [x] 4.2 Check for other caller sites
  - Search codebase for calls to `fetchArticleMetadata` or `fetchAndProcessArticles`
  - Update all call sites to pass token from env
  - Verify no crawler functions are called without token being threaded through

## 5. Update Environment Configuration

- [x] 5.1 Update `.dev.vars.example`
  - Add example line: `# CRAWLER_API_TOKEN=your_hf_token_here`
  - Add comment explaining it's for private HF Spaces authentication
  - Add example for new HF Spaces URL: `# CRAWLER_API_URL=https://yiiiiiha-tiny-crawl.hf.space`

- [x] 5.2 Update `wrangler.toml.example` (if exists)
  - Document CRAWLER_API_TOKEN in comments
  - Note that it should be set as a secret, not in toml file

## 6. Update Tests

- [x] 6.1 Update unit tests in `src/__tests__/services/articleFetcher.test.ts`
  - Add test case: "should include Authorization header when token provided"
  - Add test case: "should work without Authorization header when token not provided"
  - Update existing test mocks to accept headers parameter
  - Verify token is passed through call chain correctly

- [x] 6.2 Update test fixtures in `src/__tests__/helpers/workerEnvironment.ts`
  - Add `CRAWLER_API_TOKEN: 'test-token'` to mock environment
  - Update mock to use new HF Spaces URL

- [x] 6.3 Update integration tests (if needed)
  - Verify end-to-end flow with token authentication
  - Check that integration tests properly mock or skip crawler calls

## 7. Update Documentation

- [x] 7.1 Update `docs/cloudflare-worker-deployment.md`
  - Add section on setting CRAWLER_API_TOKEN secret
  - Add wrangler command: `npx wrangler secret put CRAWLER_API_TOKEN`
  - Document new HF Spaces URL format
  - Note that old crawler service is deprecated

- [x] 7.2 Update `docs/configuration.md`
  - Add CRAWLER_API_TOKEN environment variable documentation
  - Explain purpose and security considerations
  - Provide example of setting the secret

- [x] 7.3 Update `README.md` (if it mentions crawler)
  - Update any references to crawler configuration
  - Add token requirement for HF Spaces service

- [x] 7.4 Update `openspec/project.md`
  - Update Tech Stack section if it mentions crawler service
  - Update Configuration section with new token variable
  - Update External Dependencies section with HF Spaces information

## 8. Validation and Testing

- [x] 8.1 Run type checking
  - Execute `npx tsc --noEmit`
  - Verify no type errors introduced

- [x] 8.2 Run unit tests
  - Execute `npm test`
  - Verify all tests pass
  - Check coverage for new code paths

- [x] 8.3 Test locally with dev environment
  - Set CRAWLER_API_TOKEN in `.dev.vars`
  - Set CRAWLER_API_URL to HF Spaces endpoint
  - Run `npm run dev:worker`
  - Trigger article fetch and verify crawler works

- [x] 8.4 Manual verification
  - Check logs for Authorization header (should show "present" not actual token)
  - Verify no token leakage in error messages
  - Test with and without token to ensure graceful degradation

## 9. Deployment Preparation

- [x] 9.1 Document migration steps for production
  - Create migration checklist for users
  - Note that CRAWLER_API_TOKEN must be set via wrangler secret
  - Document rollback procedure if issues arise

- [x] 9.2 Prepare deployment commands
  - Document: `npx wrangler secret put CRAWLER_API_TOKEN`
  - Document: Update CRAWLER_API_URL if stored as secret
  - Note: No code deployment needed until secret is set

## 10. Documentation Update (REQUIRED)

- [x] 10.1 Check README.md for affected sections
  - Search for "crawler" or "CRAWLER_API" references
  - Update configuration examples
  - Add security note about token handling

- [x] 10.2 Check openspec/project.md for structural changes
  - Update Configuration section with CRAWLER_API_TOKEN
  - Update External Dependencies with HF Spaces info
  - Verify environment variable list is complete

- [x] 10.3 Check docs/ for affected guides
  - Review all files in docs/ for crawler mentions
  - Update cloudflare-worker-deployment.md thoroughly
  - Update configuration.md with new variable

- [x] 10.4 Update or remove references to changed features
  - Search for old crawler service URLs
  - Update to new HF Spaces URL format
  - Remove references to deprecated services

- [x] 10.5 Test code examples in documentation
  - Verify wrangler commands work correctly
  - Test example .dev.vars configurations
  - Ensure curl examples (if any) include proper auth

- [x] 10.6 Verify no broken links or outdated information
  - Check all crawler-related documentation links
  - Verify HF Spaces URL is correct
  - Ensure migration guide is accurate

