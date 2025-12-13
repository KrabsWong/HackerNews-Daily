# Design Document: Worker Extensibility Refactor

## Context

The current worker implementation is tightly coupled to HackerNews data source and GitHub publishing. As the project matures and aims to support multiple content sources (Reddit, ProductHunt, etc.) and multiple publishing channels (Telegram, RSS, email), the architecture needs to be refactored for extensibility while maintaining simplicity.

**Key Constraints:**
- Must maintain backward compatibility with existing API layer (`src/api/`) 
- Must work within Cloudflare Workers environment (no Node.js fs, limited CPU time)
- Must preserve existing reliability and performance characteristics
- Must fail fast on misconfiguration (prevent accidental publishes to wrong repos)

**Current Pain Points:**
1. Type `'deepseek' | 'openrouter'` repeated in multiple files without type safety
2. `TARGET_REPO` has a default value (`KrabsWong/tldr-hacknews-24`), risking accidental pushes
3. GitHub publishing logic is embedded in worker handler, not reusable
4. Adding a new content source requires modifying multiple worker files
5. Unused imports clutter the codebase
6. LLM-related code scattered across multiple files (`llmProvider.ts`, `llmProviderUtils.ts`)
7. Type definitions mixed with implementation code
8. Duplicate provider option building logic in CLI and Worker
9. Dangerous `!.` non-null assertions instead of proper validation

## Goals / Non-Goals

**Goals:**
- ✅ Centralize LLM provider type definition using enum (not type alias) for compile-time safety
- ✅ Create pluggable architecture for content sources (HackerNews, future: Reddit, etc.)
- ✅ Create pluggable architecture for publishers (GitHub, future: Telegram, RSS)
- ✅ Make critical configuration (LLM_PROVIDER, TARGET_REPO) mandatory with validation
- ✅ Organize worker code into logical directories (`sources/`, `publishers/`, `config/`)
- ✅ Consolidate LLM code into `src/services/llm/` module
- ✅ Centralize type definitions in `src/types/`
- ✅ Eliminate duplicate code (provider option builders, switch statements)
- ✅ Remove dangerous `!.` non-null assertions
- ✅ Remove unused imports and clean up code quality
- ✅ Update documentation to reflect new architecture

**Non-Goals:**
- ❌ Refactoring the API layer (`src/api/`) - it works well and is stable
- ❌ Changing CLI behavior - only worker is affected
- ❌ Implementing new sources/publishers in this PR (only the infrastructure)
- ❌ Migrating to a different runtime (stay on Cloudflare Workers)
- ❌ Breaking existing deployments without clear migration path

## Decisions

### Decision 1: Type-Safe LLM Provider with Enum

**Choice:** Define `LLMProviderType` as an enum (not type alias) in `config/constants.ts` and use it consistently across all LLM-related code.

**Rationale:**
- Enums provide runtime values that can be used in switch statements
- TypeScript compiler catches invalid provider strings at compile time
- IDE autocomplete improves developer experience
- Easy to add new providers (one place to update)

**Implementation:**
```typescript
// src/config/constants.ts
export enum LLMProviderType {
  DEEPSEEK = 'deepseek',
  OPENROUTER = 'openrouter',
}

// All consuming code
import { LLMProviderType } from '../config/constants';
const provider: LLMProviderType = LLMProviderType.DEEPSEEK;
```

**Alternatives Considered:**
- Keep inline type definitions → ❌ Rejected: leads to type drift and duplication
- Use string literal type → ❌ Rejected: no runtime value for switch statements

### Decision 2: Consolidated LLM Module Structure

**Choice:** Create a dedicated `src/services/llm/` directory with clear separation of concerns.

**Directory Structure:**
```
src/services/llm/
├── index.ts      # Main entry point, re-exports all public APIs
├── providers.ts  # DeepSeekProvider, OpenRouterProvider implementations
└── utils.ts      # Utility functions for provider resolution
```

**Rationale:**
- Single import point for all LLM functionality: `import { ... } from './services/llm'`
- Clear separation between provider implementations and utilities
- Follows the pattern established by `src/services/translator/`
- Easy to extend with new providers

**Files and Responsibilities:**
- `index.ts`: Factory functions (`createLLMProvider`, `createLLMProviderFromEnv`), re-exports
- `providers.ts`: `DeepSeekProvider`, `OpenRouterProvider` class implementations
- `utils.ts`: `parseProvider`, `getApiKeyForProvider`, `resolveProviderConfig`, `buildProviderOptions`, `buildCliProviderOptions`

### Decision 3: Centralized Type Definitions

**Choice:** Move all LLM and Worker type definitions to `src/types/` directory.

**New Type Files:**
```typescript
// src/types/llm.ts
export interface ChatMessage { ... }
export interface ChatCompletionRequest { ... }
export interface ChatCompletionResponse { ... }
export interface ProviderEnv { ... }
export interface ResolvedProviderConfig { ... }
export interface ProviderConfig { ... }
export interface CreateProviderOptions { ... }
export interface LLMProvider { ... }
export interface OpenAIStyleResponse { ... }

// src/types/worker.ts
export interface WorkerEnv { ... }
```

**Rationale:**
- Consistent with existing `src/types/` pattern (api.ts, shared.ts, task.ts)
- Types are easily discoverable and reusable
- Implementation files focus on logic, not type definitions
- Avoids circular dependencies

### Decision 4: Unified Provider Option Builders

**Choice:** Consolidate all provider option building logic into `src/services/llm/utils.ts`.

**Functions:**
```typescript
// Generic builder - accepts any ProviderEnv-compatible object
export function buildProviderOptions(env: ProviderEnv): CreateProviderOptions;

// CLI-specific builder - reads from process.env, applies CLI defaults
export function buildCliProviderOptions(): CreateProviderOptions;
```

**Rationale:**
- Single source of truth for building provider options
- CLI and Worker use the same underlying logic
- CLI-specific defaults (DEEPSEEK as default provider) are encapsulated
- No duplicate code in `src/index.ts` or `worker/sources/hackernews.ts`

**Usage:**
```typescript
// Worker
import { buildProviderOptions } from '../../services/llm';
const options = buildProviderOptions(env);

// CLI
import { buildCliProviderOptions } from './services/llm';
const options = buildCliProviderOptions();
```

### Decision 5: Source Abstraction Layer

**Choice:** Create a `ContentSource` interface and move source-specific logic to `src/worker/sources/` directory.

**Interface:**
```typescript
interface ContentSource {
  name: string;
  fetchContent(date: Date, config: SourceConfig): Promise<SourceContent>;
}

interface SourceContent {
  markdown: string;
  dateStr: string;
  metadata: Record<string, any>;
}
```

**Directory Structure:**
```
src/worker/
├── sources/
│   ├── index.ts           # ContentSource interface
│   ├── hackernews.ts      # HackerNewsSource implementation
│   └── [future sources]   # reddit.ts, producthunt.ts, etc.
```

**Rationale:**
- Clear separation of concerns (source logic isolated)
- Easy to add new sources without modifying core worker
- Each source can have its own configuration schema
- Testable in isolation

### Decision 6: Publisher Abstraction Layer

**Choice:** Create a `Publisher` interface and move publishing logic to `src/worker/publishers/` directory.

**Interface:**
```typescript
interface Publisher {
  name: string;
  publish(content: PublishContent, config: PublisherConfig): Promise<void>;
}

interface PublishContent {
  markdown: string;
  dateStr: string;
  metadata: Record<string, any>;
}
```

**Directory Structure:**
```
src/worker/
├── publishers/
│   ├── index.ts                 # Publisher interface
│   └── github/
│       ├── index.ts             # GitHubPublisher implementation
│       ├── client.ts            # GitHubClient (moved from githubClient.ts)
│       └── versioning.ts        # File versioning logic (moved from githubPush.ts)
```

**Rationale:**
- Publishing logic becomes reusable and testable
- Easy to add new publishers (Telegram, RSS, email)
- GitHub-specific code is isolated in its own module
- Each publisher can validate its own required configuration

### Decision 7: Required Configuration with Fail-Fast Validation

**Choice:** Remove default values for `LLM_PROVIDER` and `TARGET_REPO`, validate on worker startup, throw errors if missing.

**Implementation:**
```typescript
// src/worker/config/validation.ts
import { parseProvider, getApiKeyForProvider } from '../../services/llm';

export function validateWorkerConfig(env: Env): void {
  const errors: string[] = [];
  
  // Validate LLM_PROVIDER and corresponding API key using centralized utilities
  try {
    const provider = parseProvider(env.LLM_PROVIDER);
    getApiKeyForProvider(provider, env);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  
  if (!env.TARGET_REPO) {
    errors.push('TARGET_REPO is required (format: "owner/repo")');
  }
  
  if (!env.GITHUB_TOKEN) {
    errors.push('GITHUB_TOKEN is required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Worker configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  }
}
```

**Rationale:**
- Prevents accidental pushes to maintainer's repository by new users
- Fails fast with clear error messages during development/testing
- Forces explicit configuration choices (aligns with open-source best practices)
- Uses centralized utility functions - no duplicate switch statements

### Decision 8: Eliminate Dangerous Patterns

**Choice:** Replace all `!.` non-null assertions with proper validation via utility functions.

**Before (dangerous):**
```typescript
const provider = env.LLM_PROVIDER!.toLowerCase();
switch (provider) {
  case 'deepseek':
    apiKey = env.DEEPSEEK_API_KEY!;
    break;
  // ...
}
```

**After (safe):**
```typescript
import { resolveProviderConfig } from '../../services/llm';

const resolved = resolveProviderConfig(env);
// resolved.provider and resolved.apiKey are guaranteed to be valid
// or an error is thrown with a clear message
```

**Rationale:**
- `!.` assertions can cause runtime crashes with unhelpful error messages
- Utility functions throw descriptive errors that help users fix configuration
- Single point of validation - no scattered switch statements
- TypeScript can properly track non-null types after validation

## Risks / Trade-offs

### Risk 1: Breaking Changes for Existing Users

**Risk:** Users with existing deployments will see failures after upgrade if they don't update configuration.

**Mitigation:**
- Clear documentation in README.md with "⚠️ BREAKING CHANGE" section
- Migration guide in docs/ with step-by-step checklist
- Version the worker (bump to v4.0.0 to signal major breaking change)
- Consider detecting missing vars and logging helpful error with migration link

**Trade-off:** Short-term friction for long-term safety and clarity.

### Risk 2: Over-Engineering

**Risk:** Adding abstraction layers may be overkill if no new sources/publishers are added soon.

**Mitigation:**
- Keep interfaces minimal and pragmatic (3-4 methods max)
- Don't implement new sources/publishers in this PR (prove extensibility later)
- Ensure the abstractions solve real problems (type safety, config validation, organization)

**Trade-off:** Slight increase in code complexity for significant gains in maintainability and extensibility.

### Risk 3: File Moving Breaks Git History

**Risk:** Moving files (`exportHandler.ts` → `sources/hackernews.ts`) loses `git blame` history.

**Mitigation:**
- Use `git mv` to preserve history
- Document the move in commit message with old/new paths
- Consider using `git log --follow` for tracking history across moves

**Trade-off:** Temporary inconvenience for cleaner architecture.

### Risk 4: Import Path Changes

**Risk:** Changing from `import { ... } from './services/llmProvider'` to `import { ... } from './services/llm'` may break external consumers.

**Mitigation:**
- This is an internal refactor, no public API
- All import paths updated in the same PR
- Build verification ensures no broken imports

## Migration Plan

### Phase 1: Type Safety and Code Organization (Non-Breaking)
1. Change `LLMProviderType` from type alias to enum
2. Create `src/services/llm/` directory structure
3. Create `src/types/llm.ts` and `src/types/worker.ts`
4. Move provider implementations to `llm/providers.ts`
5. Move utilities to `llm/utils.ts` with `buildCliProviderOptions`
6. Update all import paths
7. Delete old files (`llmProvider.ts`, `llmProviderUtils.ts`, `worker/config/types.ts`)
8. Run tests to ensure no regressions

### Phase 2: Worker Restructure (Breaking)
1. Create new directory structure (`sources/`, `publishers/`, `config/`)
2. Move files with `git mv`:
   - `exportHandler.ts` → `sources/hackernews.ts`
   - `githubClient.ts` → `publishers/github/client.ts`
   - `githubPush.ts` → `publishers/github/versioning.ts`
3. Create interface files (`sources/index.ts`, `publishers/index.ts`)
4. Extract config validation to `config/validation.ts`
5. Update `worker/index.ts` to use new modules

### Phase 3: Configuration Validation (Breaking)
1. Remove default values from `worker/index.ts` for `TARGET_REPO`
2. Remove fallback for `LLM_PROVIDER` (make explicit)
3. Add config validation on worker startup using centralized utilities
4. Update Env interface to reflect required vs optional variables
5. Test worker throws clear errors on missing config

### Phase 4: Documentation
1. Update README.md with breaking change notice and migration guide
2. Update `openspec/project.md` with new architecture
3. Create migration guide in `docs/`
4. Update `wrangler.toml.example`

### Phase 5: Deployment Testing
1. Deploy to staging Cloudflare Worker
2. Test with missing config (expect clear error)
3. Test with valid config (expect normal operation)
4. Test manual trigger endpoints
5. Test scheduled cron trigger

### Rollback Plan
If critical issues are discovered post-deployment:
1. Revert worker deployment to previous version (v3.x)
2. Keep code changes in a feature branch
3. Address issues identified
4. Re-deploy when stable

## Final Architecture

```
src/
├── types/                      # Centralized type definitions
│   ├── api.ts                  # HackerNews API types
│   ├── shared.ts               # Shared types (ProcessedStory)
│   ├── task.ts                 # Task-related types
│   ├── llm.ts                  # LLM types (NEW)
│   └── worker.ts               # Worker environment types (NEW)
│
├── services/
│   ├── llm/                    # LLM module (CONSOLIDATED)
│   │   ├── index.ts            # Main entry, exports all APIs
│   │   ├── providers.ts        # DeepSeekProvider, OpenRouterProvider
│   │   └── utils.ts            # parseProvider, buildProviderOptions, buildCliProviderOptions
│   │
│   ├── translator/             # Translation service (unchanged)
│   │   ├── index.ts
│   │   ├── title.ts
│   │   └── summary.ts
│   │
│   ├── contentFilter.ts        # Content filter (updated imports)
│   └── ...other services
│
├── worker/
│   ├── index.ts                # Main entry, orchestration
│   ├── config/
│   │   └── validation.ts       # Config validation (uses llm utilities)
│   ├── sources/
│   │   ├── index.ts            # ContentSource interface
│   │   └── hackernews.ts       # HackerNewsSource (uses buildProviderOptions)
│   ├── publishers/
│   │   ├── index.ts            # Publisher interface
│   │   └── github/
│   │       ├── index.ts
│   │       ├── client.ts
│   │       └── versioning.ts
│   ├── logger.ts
│   └── stubs/
│
└── index.ts                    # CLI entry (uses buildCliProviderOptions)
```

## Open Questions

1. **Q: Should we support multiple publishers per source?**
   - A: Not in this PR. Keep it simple with 1 source → 1 publisher. Can extend later if needed.

2. **Q: Should we make TARGET_BRANCH required too?**
   - A: No. `main` is a sensible default for most users. Only `TARGET_REPO` lacks a universal default.

3. **Q: Should we version the publisher interface for forward compatibility?**
   - A: Not yet. Interfaces are internal. If we ever release a plugin system, we'll version then.

4. **Q: Should we add unit tests as part of this refactor?**
   - A: Nice-to-have but not required. The refactor focuses on structure and safety. Testing can be a follow-up task.

5. **Q: Should we support `.env` files in the worker?**
   - A: No. Cloudflare Workers use wrangler.toml + secrets. Adding .env support adds complexity with no clear benefit.
