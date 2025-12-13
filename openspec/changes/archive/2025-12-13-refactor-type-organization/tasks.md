# Tasks: Refactor Type Organization and Fix OpenRouter Worker Config

## 1. Fix OpenRouter Worker Configuration

- [x] 1.1 Update `wrangler.toml` to add OpenRouter configuration comments
  - Add comment section for OPENROUTER_API_KEY secret
  - Explain conditional requirement based on LLM_PROVIDER
  - Add `wrangler secret put` command example

- [x] 1.2 Update README.md Worker deployment section
  - Add OpenRouter secret configuration instructions
  - Clarify which secrets are required for each provider

- [x] 1.3 Verify configuration validation handles OpenRouter correctly
  - Review `src/worker/config/validation.ts`
  - Ensure error messages are clear for missing OPENROUTER_API_KEY

## 2. Create New Type Files in src/types/

- [x] 2.1 Create `src/types/cache.ts`
  - Move CacheConfig, CachedStory, CacheData, CacheResult from services/cache.ts

- [x] 2.2 Create `src/types/content.ts`
  - Move FilterClassification, ContentFilter from services/contentFilter.ts
  - Move ArticleMetadata from services/articleFetcher.ts

- [x] 2.3 Create `src/types/logger.ts`
  - Move LogContext, ExportMetrics from worker/logger.ts

- [x] 2.4 Create `src/types/publisher.ts`
  - Move PublisherConfig, PublishContent, Publisher from worker/publishers/index.ts
  - Move GitHubPublisherConfig from worker/publishers/github/index.ts
  - Move GitHubFileResponse, GitHubCreateFileRequest from worker/publishers/github/client.ts
  - Move PushConfig from worker/publishers/github/versioning.ts

- [x] 2.5 Create `src/types/source.ts`
  - Move SourceConfig, SourceContent, ContentSource from worker/sources/index.ts

- [x] 2.6 Create `src/types/utils.ts`
  - Move FetchOptions from utils/fetch.ts
  - Move DayBoundaries from utils/date.ts

- [x] 2.7 Update `src/types/worker.ts`
  - Consolidate Env interface (remove duplicate from worker/index.ts)
  - Ensure WorkerEnv and Env are properly unified or documented

- [x] 2.8 Create/Update `src/types/index.ts`
  - Add barrel exports for all type files
  - Ensure convenient imports for common types

## 3. Migrate Interface Definitions from Business Code

- [x] 3.1 Update `src/services/cache.ts`
  - Remove interface definitions
  - Import from types/cache.ts

- [x] 3.2 Update `src/services/contentFilter.ts`
  - Remove interface definitions
  - Import from types/content.ts

- [x] 3.3 Update `src/services/articleFetcher.ts`
  - Remove interface definitions
  - Import from types/content.ts

- [x] 3.4 Update `src/worker/logger.ts`
  - Remove interface definitions
  - Import from types/logger.ts

- [x] 3.5 Update `src/worker/index.ts`
  - Remove Env interface definition
  - Import from types/worker.ts

- [x] 3.6 ~~Update `src/worker/publishers/index.ts`~~ **DELETED** (dead code cleanup)
  - File only contained type re-exports with no business logic
  - All types now imported directly from types/publisher.ts

- [x] 3.7 Update `src/worker/publishers/github/index.ts`
  - Remove interface definitions
  - Import from types/publisher.ts
  - Updated to import directly from types/publisher.ts instead of ../index

- [x] 3.8 Update `src/worker/publishers/github/client.ts`
  - Remove interface definitions
  - Import from types/publisher.ts

- [x] 3.9 Update `src/worker/publishers/github/versioning.ts`
  - Remove interface definitions
  - Import from types/publisher.ts

- [x] 3.10 ~~Update `src/worker/sources/index.ts`~~ **DELETED** (dead code cleanup)
  - File only contained type re-exports with no business logic
  - All types now imported directly from types/source.ts

- [x] 3.11 Update `src/utils/fetch.ts`
  - Remove interface definitions
  - Import from types/utils.ts

- [x] 3.12 Update `src/utils/date.ts`
  - Remove interface definitions
  - Import from types/utils.ts

## 4. Update Project Conventions

- [x] 4.1 Update `openspec/project.md`
  - Add "Type Organization" section under Project Conventions
  - Document rule: all exported types/interfaces MUST be in src/types/
  - Document exception: internal-only types may be inline but not exported
  - Update Directory Structure to reflect new type files

## 5. Verification

- [x] 5.1 Run TypeScript compilation to verify all imports work
  - `npm run build` or `npx tsc --noEmit`

- [x] 5.2 Run Worker build to verify worker compiles correctly
  - `npm run build:worker`

- [x] 5.3 Verify no interface definitions remain in business code
  - `grep -r "export interface" src/services src/worker src/utils --include="*.ts" | grep -v "types/"`

## 6. Documentation Update (REQUIRED)

- [x] 6.1 Check README.md for affected sections
  - Update Worker deployment section with OpenRouter instructions
  - Verify configuration examples are accurate

- [x] 6.2 Check openspec/project.md for structural changes
  - Update Directory Structure to show new type files
  - Add Type Organization convention rules

- [x] 6.3 Check docs/ for affected guides
  - Update any deployment or configuration guides

- [x] 6.4 Update or remove references to changed features

- [x] 6.5 Test code examples in documentation

- [x] 6.6 Verify no broken links or outdated information
