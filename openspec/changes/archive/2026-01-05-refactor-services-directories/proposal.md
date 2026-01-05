# Refactor Services to Directory Structure

## Overview
This change proposes refactoring the `articleFetcher.ts` and `contentFilter.ts` services from single files into directory-based module structures. Both services have grown in complexity and would benefit from better organization, similar to how the `translator/` and `llm/` services are already structured as directories.

## Motivation
- **Maintainability**: Both services contain multiple related functions that could be better organized into separate files
- **Readability**: Smaller, focused files are easier to understand and navigate
- **Consistency**: Aligns with existing project patterns (`translator/`, `llm/` already use directory structures)
- **Extensibility**: Makes it easier to add new features without making individual files unwieldy
- **Testability**: Easier to test individual components when they're in separate files

## Current State
- `src/services/articleFetcher.ts` (159 lines): Contains content fetching, truncation, crawler API integration
- `src/services/contentFilter.ts` (259 lines): Contains AI classification, filtering logic, prompt building, error handling

## Proposed Changes

### articleFetcher → articleFetcher/
**Target Structure:**
```
src/services/articleFetcher/
├── index.ts          # Main exports (backward compatibility)
├── crawler.ts        # Crawler API integration
├── truncation.ts     # Content truncation logic
└── metadata.ts       # Article metadata processing
```

**File Responsibilities:**
- `index.ts`: Re-export all public functions, maintain backward compatibility
- `crawler.ts`: `fetchWithCrawlerAPI` - handle crawler API communication
- `truncation.ts`: `truncateContent` - content truncation logic
- `metadata.ts`: `fetchArticleMetadata`, `fetchArticlesBatch` - main public API

### contentFilter → contentFilter/
**Target Structure:**
```
src/services/contentFilter/
├── index.ts          # Main exports and AIContentFilter class
├── classifier.ts     # AI classification logic
├── prompt.ts         # Prompt building for LLM
└── parser.ts         # Response parsing and validation
```

**File Responsibilities:**
- `index.ts`: `AIContentFilter` class, `filterStories`, `isEnabled`, `getSensitivityLevel`
- `classifier.ts`: `classifyTitles`, `sendClassificationRequest`
- `prompt.ts`: `buildClassificationPrompt`, sensitivity guidelines
- `parser.ts`: `parseClassificationResponse`, JSON validation

## Backward Compatibility
Both refactored services will maintain 100% backward compatibility by:
- Re-exporting all public functions/classes from `index.ts`
- Keeping the same import paths: `import { fetchArticlesBatch } from '../services/articleFetcher'`
- Preserving all function signatures and return types
- No changes to existing test files required

## Affected Files
**Direct Changes:**
- `src/services/articleFetcher.ts` → deleted (moved to directory)
- `src/services/contentFilter.ts` → deleted (moved to directory)

**Import Paths (No changes required - backward compatible):**
- `src/worker/sources/hackernews.ts` - imports from both services
- `src/services/task/executor.ts` - imports from both services
- `src/__tests__/services/articleFetcher.test.ts` - no changes needed
- `src/__tests__/services/contentFilter.test.ts` - no changes needed

## Testing Strategy
- All existing tests should continue to pass without modification
- No new tests required (this is pure refactoring, no behavior changes)
- Verification: Run `npm test` to ensure no regressions

## Documentation Updates
- Update `openspec/project.md` directory structure documentation
- No user-facing changes, so README.md requires no updates
- Update any inline code comments that reference file paths

## Risks and Mitigations
- **Risk**: Import paths might break if not properly re-exported
  - **Mitigation**: Thorough test coverage ensures imports still work
- **Risk**: Circular dependencies between new files
  - **Mitigation**: Clear separation of concerns, each file has single responsibility
- **Risk**: Type exports may be lost
  - **Mitigation**: Ensure all types are re-exported from `index.ts`

## Success Criteria
- [ ] All existing tests pass without modification
- [ ] Backward compatibility maintained (no import path changes required)
- [ ] Code compiles without TypeScript errors
- [ ] Directory structure matches proposed layout
- [ ] Documentation updated in `openspec/project.md`

## Related Specs
- `article-content-extraction` - may need spec delta updates
- `content-filtering` - may need spec delta updates
