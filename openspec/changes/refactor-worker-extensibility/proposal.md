# Change: Refactor Worker for Multi-Source Extensibility and Type Safety

## Why

The current worker implementation has several issues that limit extensibility, maintainability, and safety for open-source usage:

1. **Type Safety**: LLM provider type (`'deepseek' | 'openrouter'`) is scattered across the codebase without centralized type definition
2. **Single-Purpose**: Worker is hardcoded to export only HackerNews data to a single GitHub repository
3. **Unsafe Defaults**: Default GitHub repository configuration could cause open-source users to inadvertently push to the maintainer's repository
4. **Code Quality**: Unused imports remain in worker files
5. **Limited Extensibility**: GitHub push is embedded in the worker logic, preventing future extension to other channels (Telegram, email, RSS, etc.)
6. **Poor Code Organization**: LLM-related code scattered across `services/llmProvider.ts` and `services/llmProviderUtils.ts`, type definitions mixed with implementation
7. **Duplicate Logic**: Provider option building functions duplicated in CLI (`src/index.ts`) and Worker (`worker/sources/hackernews.ts`)
8. **Dangerous Patterns**: Use of `!.` non-null assertions for provider type checking instead of proper validation

The worker needs to be refactored to support multiple content sources, multiple output destinations, proper type safety, and extensible architecture.

## What Changes

### Phase 1: Core Refactoring
- **Type Safety**: Define `LLMProviderType` as an enum (not type alias) in `config/constants.ts` for compile-time safety
- **Multi-Source Support**: Refactor worker to support multiple content sources (HackerNews, Reddit, etc.) with source-specific configuration
- **Multi-Destination Support**: Abstract publishing logic into pluggable publishers (GitHub, Telegram, RSS, etc.) with a common interface
- **Required Configuration**: Make `LLM_PROVIDER` and `TARGET_REPO` required environment variables with no defaults (fail fast if missing)
- **Code Quality**: Remove unused imports from worker files
- **Worker Directory Restructure**: Organize worker code into logical modules (`sources/`, `publishers/`, `config/`)
- **Documentation**: Update README.md and openspec/project.md to reflect new architecture

### Phase 2: Code Organization Improvements
- **LLM Module Consolidation**: Create `src/services/llm/` directory with unified structure:
  - `index.ts` - Main entry point, exports all public APIs
  - `providers.ts` - DeepSeekProvider and OpenRouterProvider implementations
  - `utils.ts` - Provider utilities (parseProvider, getApiKeyForProvider, buildProviderOptions, buildCliProviderOptions)
- **Type Definition Centralization**: Move all LLM and Worker types to `src/types/`:
  - `llm.ts` - LLMProvider interface, ChatMessage, CreateProviderOptions, ProviderEnv, etc.
  - `worker.ts` - WorkerEnv interface
- **Provider Options Consolidation**: Unify `buildProviderOptions()` and `buildCliProviderOptions()` into `services/llm/utils.ts`
- **Remove Dangerous Patterns**: Replace all `!.` non-null assertions with proper validation via utility functions
- **Eliminate Duplicate Switch Statements**: Centralize provider type switching in `parseProvider()` and `getApiKeyForProvider()`

**BREAKING**: This refactor introduces breaking changes to worker environment variable requirements (LLM_PROVIDER and TARGET_REPO become mandatory) and internal architecture (file structure and exports change).

## Impact

- **Affected specs**: 
  - `cloudflare-worker-runtime` (environment variables, architecture)
  - `llm-provider-abstraction` (type consistency, module structure)
  - `github-api-integration` (extracted to publisher module)
  - New specs: `worker-source-abstraction`, `worker-publisher-abstraction`, `worker-config-validation`

- **Affected code**:
  - `src/worker/index.ts` (architecture restructure)
  - `src/worker/exportHandler.ts` (rename to `sources/hackernews.ts`)
  - `src/worker/githubClient.ts` (move to `publishers/github/client.ts`)
  - `src/worker/githubPush.ts` (move to `publishers/github/publisher.ts`)
  - `src/config/constants.ts` (LLMProviderType as enum)
  - `src/services/llmProvider.ts` → `src/services/llm/` (directory restructure)
  - `src/services/llmProviderUtils.ts` → `src/services/llm/utils.ts` (consolidated)
  - `src/worker/config/types.ts` → `src/types/worker.ts` (centralized types)
  - `src/index.ts` (remove local buildCliProviderOptions, import from llm module)
  - All files importing LLMProvider types (update import paths)
  - Documentation: `README.md`, `openspec/project.md`

- **User Impact**:
  - **BREAKING**: Users must explicitly set `LLM_PROVIDER` and `TARGET_REPO` environment variables (no defaults)
  - New users benefit from fail-fast validation preventing accidental pushes to wrong repositories
  - Existing deployments need to update wrangler.toml and secrets before upgrading
  - Future extensibility: Users can add custom sources and publishers via plugin architecture

## Final Directory Structure

```
src/
├── types/
│   ├── api.ts          # HackerNews API types
│   ├── shared.ts       # Shared types (ProcessedStory)
│   ├── task.ts         # Task-related types
│   ├── llm.ts          # LLM types (LLMProvider, ChatMessage, CreateProviderOptions, etc.)
│   └── worker.ts       # Worker environment types (WorkerEnv)
│
├── services/
│   ├── llm/            # LLM module (consolidated)
│   │   ├── index.ts    # Main entry, exports all public APIs
│   │   ├── providers.ts # DeepSeekProvider, OpenRouterProvider
│   │   └── utils.ts    # parseProvider, getApiKeyForProvider, buildProviderOptions, buildCliProviderOptions
│   │
│   ├── translator/     # Translation service
│   │   ├── index.ts
│   │   ├── title.ts
│   │   └── summary.ts
│   │
│   └── ...other services
│
├── worker/
│   ├── index.ts        # Main entry, orchestration
│   ├── config/
│   │   └── validation.ts
│   ├── sources/
│   │   ├── index.ts    # ContentSource interface
│   │   └── hackernews.ts
│   ├── publishers/
│   │   ├── index.ts    # Publisher interface
│   │   └── github/
│   │       ├── index.ts
│   │       ├── client.ts
│   │       └── versioning.ts
│   ├── logger.ts
│   └── stubs/
```
