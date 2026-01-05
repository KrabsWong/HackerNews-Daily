# Implementation Tasks

## 1. Create articleFetcher Directory Structure
- [ ] 1.1 Create `src/services/articleFetcher/` directory
- [ ] 1.2 Create `src/services/articleFetcher/index.ts` with re-exports
- [ ] 1.3 Create `src/services/articleFetcher/crawler.ts` with crawler API functions
- [ ] 1.4 Create `src/services/articleFetcher/truncation.ts` with truncation logic
- [ ] 1.5 Create `src/services/articleFetcher/metadata.ts` with metadata processing functions
- [ ] 1.6 Verify TypeScript compilation passes for articleFetcher module
- [ ] 1.7 Delete original `src/services/articleFetcher.ts` file

## 2. Create contentFilter Directory Structure
- [ ] 2.1 Create `src/services/contentFilter/` directory
- [ ] 2.2 Create `src/services/contentFilter/index.ts` with class re-export
- [ ] 2.3 Create `src/services/contentFilter/classifier.ts` with classification logic
- [ ] 2.4 Create `src/services/contentFilter/prompt.ts` with prompt building functions
- [ ] 2.5 Create `src/services/contentFilter/parser.ts` with response parsing logic
- [ ] 2.6 Verify TypeScript compilation passes for contentFilter module
- [ ] 2.7 Delete original `src/services/contentFilter.ts` file

## 3. Verify Backward Compatibility
- [ ] 3.1 Run existing articleFetcher tests: `npm test -- articleFetcher.test.ts`
- [ ] 3.2 Run existing contentFilter tests: `npm test -- contentFilter.test.ts`
- [ ] 3.3 Verify imports in `src/worker/sources/hackernews.ts` still work
- [ ] 3.4 Verify imports in `src/services/task/executor.ts` still work
- [ ] 3.5 Run full test suite: `npm test`
- [ ] 3.6 Verify no TypeScript errors: `npx tsc --noEmit`

## 4. Integration Testing
- [ ] 4.1 Run worker integration tests: `npm test -- alignment.test.ts`
- [ ] 4.2 Test articleFetcher batch processing with real mock data
- [ ] 4.3 Test contentFilter classification with real mock data
- [ ] 4.4 Verify error handling paths still work correctly

## 5. Documentation Update (REQUIRED)
- [ ] 5.1 Update `openspec/project.md` directory structure section
- [ ] 5.2 Verify no broken links in documentation
- [ ] 5.3 Update any inline comments referencing old file paths

## 6. Code Review and Finalization
- [ ] 6.1 Review all new files for consistent code style
- [ ] 6.2 Verify all public APIs are properly exported from index.ts files
- [ ] 6.3 Check for any circular dependencies between new files
- [ ] 6.4 Ensure proper TypeScript types are exported and re-exported
- [ ] 6.5 Final validation with `openspec validate refactor-services-directories --strict`
