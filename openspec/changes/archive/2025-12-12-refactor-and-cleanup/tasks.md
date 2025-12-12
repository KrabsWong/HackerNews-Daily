# Tasks: Code Refactoring and Cleanup

## Phase 1: Remove Unused Code

### 1.1 Remove Deprecated Firebase Comment Functions
- [x] Remove `fetchCommentsBatch` from `hackerNews.ts` (line 534-538)
- [x] Remove `fetchComments` from `hackerNews.ts` (line 442-467)
- [x] Remove `fetchCommentDetails` from `hackerNews.ts` (line 417-434)
- [x] Update CLI to use `fetchCommentsBatchFromAlgolia` instead

### 1.2 Remove Unused Config (Pending Confirmation)
- [x] Remove `SERVER_CONFIG` from `constants.ts` (line 269-274)
- [x] Update `project.md` to remove Axios references
- [x] Update `project.md` to remove Vue.js/Web Frontend references

---

## Phase 2: Extract Shared Utilities

### 2.1 Create Date Utilities Module
- [x] Create `src/shared/dateUtils.ts`
- [x] Move `getPreviousDayBoundaries()` to shared module
- [x] Move `formatTimestamp()` to shared module (standardize format)
- [x] Update `index.ts` to import from shared
- [x] Update `exportHandler.ts` to import from shared

### 2.2 Create Shared Types Module
- [x] Create `src/shared/types.ts`
- [x] Move `ProcessedStory` interface to shared module
- [x] Update `index.ts` to import from shared
- [x] Update `exportHandler.ts` to import from shared

---

## Phase 3: Align CLI with Worker

### 3.1 Update Comment Fetching
- [x] Change CLI to use `fetchCommentsBatchFromAlgolia`
- [x] Remove import of deprecated `fetchCommentsBatch`
- [x] Test CLI to verify comment fetching works

### 3.2 Standardize Timestamp Format
- [x] Decide on standard format (recommend: `YYYY-MM-DD HH:mm UTC`)
- [x] Update shared `formatTimestamp()` function
- [x] Verify both CLI and Worker use the same format

---

## Phase 4: Refactor Large Files

### 4.1 Split hackerNews.ts
- [x] Create `src/api/types.ts` for interfaces
- [x] Create `src/api/algolia.ts` for Algolia functions
- [x] Create `src/api/firebase.ts` for Firebase functions
- [x] Create `src/api/utils.ts` for utility functions
- [x] Update `hackerNews.ts` as index file re-exporting all modules
- [x] Update imports across codebase

### 4.2 Refactor translator.ts
- [x] Update to use new API module structure
- [x] Keep as single file (700 lines is acceptable for cohesive class)

---

## Validation Steps

After each phase:
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Run `npm run build:worker` to verify Worker bundle (688.33 KB)

---

## Phase 5: Error Handling Refactoring (Try-Catch Optimization)

### 5.1 Create Result Pattern Infrastructure
- [x] Create `src/shared/result.ts` with Result type
- [x] Add `Ok()`, `Err()` helper functions
- [x] Add `fromPromise()` async wrapper
- [x] Add `collectResults()` for batch error accumulation

### 5.2 Refactor High-Priority Files (P0)
- [x] `algolia.ts`: Refactor `fetchStoriesFromAlgoliaByIds` with error accumulation
- [x] `algolia.ts`: Refactor `fetchCommentsFromAlgolia` to use Result internally
- [x] `translator.ts`: Convert recursive retry to loop-based retry
- [x] `translator.ts`: Refactor `translateTitlesBatch` with Result pattern
- [x] `translator.ts`: Refactor `summarizeContentBatch` with Result pattern
- [x] `translator.ts`: Refactor `summarizeCommentsBatch` with Result pattern

### 5.3 Fix Empty Catch Blocks (P1)
- [x] `markdownExporter.ts:121`: Add `_` variable to empty catch
- [x] `cache.ts:149`: Add `_` variable and comment explaining why error is ignored

### 5.4 Refactor Nested Try-Catch (P1)
- [x] `translator.ts`: Extract JSON parsing to `parseJsonArray()` function returning Result
- [x] `algolia.ts`: Extract batch fetch to `fetchBatchFromAlgolia()` function returning Result

### 5.5 Apply Optional Chaining (P3)
- [x] `firebase.ts:84-102`: Use `response?.data?.title` pattern
- [x] `exportHandler.ts`: Use nullish coalescing `??` instead of `||`
- [x] `algolia.ts`: Use `??` in comment mapping

### 5.6 Validation
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Run `npm run build:worker` to verify Worker bundle (688.40 KB)

---

## Phase 6: Directory Structure Optimization

### 6.1 Move shared/types.ts to types/ Directory
- [x] Create `src/types/shared.ts` with ProcessedStory interface
- [x] Update all imports from `shared/types` to `types/shared`
- [x] Remove `src/shared/types.ts`
- [x] Verify no broken imports

### 6.2 Split translator.ts into Module
- [x] Create `src/services/translator/` directory
- [x] Create `src/services/translator/utils.ts` - JSON parsing utilities (57 lines)
- [x] Create `src/services/translator/titleTranslator.ts` - Title translation methods (115 lines)
- [x] Create `src/services/translator/summarizer.ts` - Content/comment summarization (137 lines)
- [x] Create `src/services/translator/batch.ts` - Batch operation methods (347 lines)
- [x] Create `src/services/translator/index.ts` - TranslationService class export (168 lines)
- [x] Update all imports across codebase (no changes needed - index.ts auto-resolved)
- [x] Remove old `src/services/translator.ts`

### 6.3 Validation
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Run `npm run build:worker` to verify Worker bundle (687.76 KB)

---

## Phase 7: Global Directory Structure Unification

### 7.1 Unify Types to types/ Directory
- [x] Create `src/types/api.ts` with API types (HNStory, AlgoliaStory, HNComment, AlgoliaSearchResponse)
- [x] Create `src/api/mapper.ts` with `mapAlgoliaStoryToHNStory()` function
- [x] Update all imports from `api/types` to `types/api` and `api/mapper`
- [x] Remove `src/api/types.ts`

### 7.2 Unify Utils to utils/ Directory
- [x] Move `src/shared/dateUtils.ts` to `src/utils/date.ts`
- [x] Move `src/shared/result.ts` to `src/utils/result.ts`
- [x] Create `src/utils/html.ts` with `stripHTML()` function (from api/utils.ts)
- [x] Create `src/utils/array.ts` with `chunk()`, `delay()`, `parseJsonArray()` functions
- [x] Update all imports across codebase
- [x] Remove `src/shared/` directory
- [x] Remove `src/api/utils.ts`

### 7.3 Reorganize Translator Module
- [x] Create `src/services/translator/title.ts` (single + batch title operations)
- [x] Create `src/services/translator/summary.ts` (single + batch summarization)
- [x] Update `index.ts` to import from new structure
- [x] Remove `batch.ts`, `titleTranslator.ts`, `summarizer.ts`, `utils.ts`

### 7.4 Validation
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Run `npm run build:worker` to verify Worker bundle (687.68 KB)

---

## Phase 8: Multi-Source API Architecture

### 8.1 Create HackerNews Module Directory
- [x] Create `src/api/hackernews/` directory
- [x] Move `src/api/algolia.ts` to `src/api/hackernews/algolia.ts`
- [x] Move `src/api/firebase.ts` to `src/api/hackernews/firebase.ts`
- [x] Move `src/api/mapper.ts` to `src/api/hackernews/mapper.ts`

### 8.2 Create Module Entry Points
- [x] Create `src/api/hackernews/index.ts` - re-export all HN functions
- [x] Create `src/api/index.ts` - unified export for all data sources

### 8.3 Update Import Paths
- [x] Update imports in `src/index.ts`
- [x] Update imports in `src/worker/exportHandler.ts`
- [x] Update imports in `src/services/contentFilter.ts`
- [x] Update internal imports in `hackernews/` modules (relative paths)

### 8.4 Cleanup
- [x] Remove old `src/api/hackerNews.ts`
- [x] Verify no broken imports

### 8.5 Validation
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Run `npm run build:worker` to verify Worker bundle (687.71 KB)

---

## Summary of Changes

### Final Directory Structure (After Phase 8)

```
src/
├── api/
│   ├── hackernews/          # HackerNews data source module
│   │   ├── index.ts         # Unified HN API exports
│   │   ├── algolia.ts       # Algolia HN Search API
│   │   ├── firebase.ts      # Firebase HN API
│   │   └── mapper.ts        # Type mappers
│   └── index.ts             # Unified API entry point (all data sources)
├── config/
│   └── constants.ts         # Configuration constants
├── services/
│   ├── translator/
│   │   ├── index.ts         # TranslationService class (~170 lines)
│   │   ├── title.ts         # Title translation (single + batch, ~250 lines)
│   │   └── summary.ts       # Summarization (single + batch, ~350 lines)
│   ├── articleFetcher.ts
│   ├── cache.ts
│   ├── contentFilter.ts
│   ├── llmProvider.ts
│   └── markdownExporter.ts
├── types/
│   ├── api.ts               # API types (HNStory, AlgoliaStory, HNComment, etc.)
│   ├── shared.ts            # Shared types (ProcessedStory)
│   └── task.ts          # Worker task types
├── utils/
│   ├── array.ts         # Array utilities (chunk, delay, parseJsonArray)
│   ├── date.ts          # Date utilities
│   ├── fetch.ts         # Fetch wrapper
│   ├── html.ts          # HTML utilities (stripHTML)
│   └── result.ts        # Result pattern for error handling
├── worker/
│   └── ...
└── index.ts             # CLI entry point
```

### Files Created (All Phases)
- `src/types/api.ts` - API type definitions
- `src/types/shared.ts` - Shared ProcessedStory type
- `src/api/mapper.ts` - Type mapping function
- `src/utils/date.ts` - Date utilities
- `src/utils/result.ts` - Result pattern
- `src/utils/html.ts` - HTML utilities
- `src/utils/array.ts` - Array and async utilities
- `src/services/translator/index.ts` - TranslationService class
- `src/services/translator/title.ts` - Title translation (single + batch)
- `src/services/translator/summary.ts` - Summarization (single + batch)

### Files Removed
- `src/api/types.ts` - Moved to `src/types/api.ts`
- `src/api/utils.ts` - Moved to `src/utils/html.ts`
- `src/shared/` directory - Contents moved to `types/` and `utils/`
- `src/services/translator.ts` - Split into module
- `src/services/translator/batch.ts` - Merged into title.ts and summary.ts
- `src/services/translator/titleTranslator.ts` - Merged into title.ts
- `src/services/translator/summarizer.ts` - Merged into summary.ts
- `src/services/translator/utils.ts` - Moved to `src/utils/array.ts`

### Key Improvements
1. **Types unified**: All type definitions in `types/` directory
2. **Utils unified**: All utility functions in `utils/` directory
3. **No more `shared/` directory**: Contents properly organized
4. **Translator simplified**: 2 files instead of 4 (by function domain)
5. **Clear separation of concerns**: Types, Utils, Services each have dedicated directories
