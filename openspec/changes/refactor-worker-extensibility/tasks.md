# Implementation Tasks

## 1. Type Safety Improvements

- [x] 1.1 Change `LLMProviderType` from type alias to enum in `src/config/constants.ts`
- [x] 1.2 Update `src/worker/index.ts` to import and use `LLMProviderType`
- [x] 1.3 Update `src/worker/exportHandler.ts` to import and use `LLMProviderType`
- [x] 1.4 Update `src/services/llmProvider.ts` to import and use `LLMProviderType`
- [x] 1.5 Update `src/services/contentFilter.ts` to import and use `LLMProviderType`
- [x] 1.6 Update `src/services/translator/index.ts` to import and use `LLMProviderType`
- [x] 1.7 Search for all occurrences of inline `'deepseek' | 'openrouter'` and replace with imported type
- [x] 1.8 Remove unused imports from all worker files
- [x] 1.9 Replace all `!.` non-null assertions with proper validation via utility functions

## 2. Directory Restructure

- [x] 2.1 Create directory structure: `src/worker/sources/`, `src/worker/publishers/`, `src/worker/config/`
- [x] 2.2 Create `src/worker/sources/index.ts` with `ContentSource` interface
- [x] 2.3 Move `src/worker/exportHandler.ts` → `src/worker/sources/hackernews.ts` using `git mv`
- [x] 2.4 Refactor `sources/hackernews.ts` to implement `ContentSource` interface
- [x] 2.5 Create `src/worker/publishers/index.ts` with `Publisher` interface
- [x] 2.6 Create `src/worker/publishers/github/` directory
- [x] 2.7 Move `src/worker/githubClient.ts` → `src/worker/publishers/github/client.ts` using `git mv`
- [x] 2.8 Move `src/worker/githubPush.ts` → `src/worker/publishers/github/versioning.ts` using `git mv`
- [x] 2.9 Create `src/worker/publishers/github/index.ts` implementing `Publisher` interface
- [x] 2.10 Refactor GitHub publisher to use versioning logic from versioning.ts

## 3. Configuration Validation

- [x] 3.1 Create `src/worker/config/validation.ts` with `validateWorkerConfig()` function
- [x] 3.2 Create `src/worker/config/types.ts` for worker-specific type definitions
- [x] 3.3 Update `Env` interface in `src/worker/index.ts` to mark required vs optional variables
- [x] 3.4 Remove default value for `TARGET_REPO` in `src/worker/index.ts` (line 93)
- [x] 3.5 Remove fallback logic for `LLM_PROVIDER` in `src/worker/exportHandler.ts` (line 47, 51, 110)
- [x] 3.6 Add `validateWorkerConfig(env)` call at start of `handleDailyExport()` function
- [x] 3.7 Update validation logic to check provider-specific API keys
- [x] 3.8 Ensure validation provides clear, actionable error messages

## 4. Worker Entry Point Refactor

- [x] 4.1 Update `src/worker/index.ts` imports to use new module paths
- [x] 4.2 Refactor `handleDailyExport()` to use `ContentSource` and `Publisher` abstractions
- [x] 4.3 Replace direct calls to `runDailyExport()` with `HackerNewsSource.fetchContent()`
- [x] 4.4 Replace direct calls to `pushToGitHub()` with `GitHubPublisher.publish()`
- [x] 4.5 Add source and publisher initialization logic
- [x] 4.6 Update error handling to propagate publisher/source-specific errors

## 5. Code Quality

- [x] 5.1 Review all worker files and remove unused imports
- [x] 5.2 Ensure consistent import ordering (external → internal → relative)
- [x] 5.3 Run TypeScript compiler and fix any type errors
- [x] 5.4 Verify no runtime regressions with local testing

## 6. Testing

- [x] 6.1 Test worker startup with missing `LLM_PROVIDER` (expect error)
- [x] 6.2 Test worker startup with missing `TARGET_REPO` (expect error)
- [x] 6.3 Test worker startup with missing `DEEPSEEK_API_KEY` when `LLM_PROVIDER=deepseek` (expect error)
- [x] 6.4 Test worker startup with missing `OPENROUTER_API_KEY` when `LLM_PROVIDER=openrouter` (expect error)
- [x] 6.5 Test worker with valid configuration (expect normal operation)
- [x] 6.6 Test manual export trigger via HTTP endpoint
- [x] 6.7 Test scheduled cron trigger (if possible in local environment)
- [x] 6.8 Verify exported markdown content matches previous version

## 7. Documentation Update (REQUIRED)

- [x] 7.1 Update `README.md`:
  - [x] 7.1.1 Add "⚠️ BREAKING CHANGES" section at the top with v4.0.0 notice
  - [x] 7.1.2 Update "Prerequisites" section to include required environment variables
  - [x] 7.1.3 Update "Deployment" section with new configuration requirements
  - [x] 7.1.4 Update configuration table to mark `LLM_PROVIDER` and `TARGET_REPO` as **required**
  - [x] 7.1.5 Add migration guide link for users upgrading from v3.x

- [x] 7.2 Update `openspec/project.md`:
  - [x] 7.2.1 Update "Directory Structure" section with new worker layout (sources/, publishers/, config/)
  - [x] 7.2.2 Update "Architecture Patterns" section with source/publisher abstractions
  - [x] 7.2.3 Update "Configuration" section to reflect required vs optional variables
  - [x] 7.2.4 Add documentation for ContentSource and Publisher interfaces

- [x] 7.3 Create migration guide `docs/migration-v3-to-v4.md`:
  - [x] 7.3.1 Document breaking changes
  - [x] 7.3.2 Provide step-by-step migration checklist
  - [x] 7.3.3 Include example `wrangler.toml` with all required variables
  - [x] 7.3.4 Add troubleshooting section for common errors

- [x] 7.4 Update `wrangler.toml` (or create `wrangler.toml.example`):
  - [x] 7.4.1 Add all required environment variables with comments
  - [x] 7.4.2 Remove or comment out default values for `TARGET_REPO`
  - [x] 7.4.3 Add validation instructions

- [x] 7.5 Update `.env.example`:
  - [x] 7.5.1 Mark `LLM_PROVIDER` as required
  - [x] 7.5.2 Add comments explaining valid values

- [x] 7.6 Verify no broken links in documentation
- [x] 7.7 Test all code examples in documentation

## 8. Deployment Preparation

- [x] 8.1 Update package.json version to 4.0.0 (semantic versioning for breaking change)
- [x] 8.2 Create deployment checklist for staging environment
- [x] 8.3 Test deployment to staging Cloudflare Worker
- [x] 8.4 Verify worker logs show clear errors for missing config
- [x] 8.5 Verify worker functions correctly with all required config
- [x] 8.6 Prepare rollback plan documentation
- [x] 8.7 Create release notes with migration instructions

## 9. LLM Module Consolidation (Phase 2)

- [x] 9.1 Create `src/services/llm/` directory structure
- [x] 9.2 Create `src/services/llm/providers.ts` with DeepSeekProvider and OpenRouterProvider
- [x] 9.3 Create `src/services/llm/utils.ts` with utility functions:
  - [x] 9.3.1 `parseProvider()` - parse and validate provider string
  - [x] 9.3.2 `getApiKeyForProvider()` - get API key for provider
  - [x] 9.3.3 `resolveProviderConfig()` - resolve complete provider config
  - [x] 9.3.4 `buildProviderOptions()` - build CreateProviderOptions from env
  - [x] 9.3.5 `buildCliProviderOptions()` - CLI-specific builder from process.env
- [x] 9.4 Create `src/services/llm/index.ts` as main entry point with re-exports
- [x] 9.5 Delete old `src/services/llmProvider.ts`
- [x] 9.6 Delete old `src/services/llmProviderUtils.ts`

## 10. Type Definition Centralization (Phase 2)

- [x] 10.1 Create `src/types/llm.ts` with all LLM-related types:
  - [x] 10.1.1 ChatMessage, ChatCompletionRequest, ChatCompletionResponse
  - [x] 10.1.2 ProviderEnv, ResolvedProviderConfig
  - [x] 10.1.3 ProviderConfig, CreateProviderOptions
  - [x] 10.1.4 LLMProvider interface
  - [x] 10.1.5 OpenAIStyleResponse (internal)
- [x] 10.2 Create `src/types/worker.ts` with WorkerEnv interface
- [x] 10.3 Delete old `src/worker/config/types.ts`
- [x] 10.4 Update all files to import types from `src/types/`

## 11. Import Path Updates (Phase 2)

- [x] 11.1 Update `src/services/translator/index.ts` to import from `../llm`
- [x] 11.2 Update `src/services/translator/title.ts` to import from `../llm`
- [x] 11.3 Update `src/services/translator/summary.ts` to import from `../llm`
- [x] 11.4 Update `src/services/contentFilter.ts` to import from `./llm`
- [x] 11.5 Update `src/worker/config/validation.ts` to import from `../../services/llm`
- [x] 11.6 Update `src/worker/sources/hackernews.ts` to import from `../../services/llm`
- [x] 11.7 Update `src/index.ts` to import `buildCliProviderOptions` from `./services/llm`
- [x] 11.8 Remove local `buildCliProviderOptions` function from `src/index.ts`

## 12. Final Validation

- [x] 12.1 Run `npm run build` to verify CLI builds successfully
- [x] 12.2 Run `npm run build:worker` to verify worker builds successfully (if applicable)
- [x] 12.3 Verify TypeScript compilation has no errors
- [x] 12.4 Review all changed files for consistency
- [x] 12.5 Verify all tasks in this checklist are complete
- [x] 12.6 Update proposal.md and design.md to reflect all changes made
