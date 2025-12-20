# Implementation Tasks

## 1. Complete Utils Module Testing (Target: 100%)

- [ ] 1.1 Create `src/__tests__/utils/fetch.test.ts`
  - [ ] 1.1.1 Test fetchJSON() with successful responses
  - [ ] 1.1.2 Test fetchJSON() timeout handling
  - [ ] 1.1.3 Test fetchJSON() retry logic (network errors, 5xx errors)
  - [ ] 1.1.4 Test fetchJSON() exponential backoff
  - [ ] 1.1.5 Test fetchJSON() content-type validation
  - [ ] 1.1.6 Test get() helper function
  - [ ] 1.1.7 Test post() helper function
  - [ ] 1.1.8 Test FetchError class
  - [ ] 1.1.9 Verify 90%+ coverage for fetch.ts

- [ ] 1.2 Improve `src/__tests__/utils/array.test.ts`
  - [ ] 1.2.1 Add test for chunk() warning log path (lines 43-44)
  - [ ] 1.2.2 Add test for parseJsonArray() specific error context (lines 99-100)
  - [ ] 1.2.3 Verify 100% coverage for array.ts

- [ ] 1.3 Improve `src/__tests__/utils/html.test.ts`
  - [ ] 1.3.1 Add test for error handling warning path (lines 26-28)
  - [ ] 1.3.2 Verify 100% coverage for html.ts

- [ ] 1.4 Verify Utils module coverage
  - [ ] 1.4.1 Run coverage report
  - [ ] 1.4.2 Confirm all 5 files at 95%+ coverage
  - [ ] 1.4.3 Confirm module average at 100%

## 2. Complete API Module Testing (Target: 90%+)

- [ ] 2.1 Create `src/__tests__/api/` directory structure
  - [ ] 2.1.1 Create `src/__tests__/api/hackernews/` subdirectory

- [ ] 2.2 Create `src/__tests__/api/hackernews/firebase.test.ts`
  - [ ] 2.2.1 Test fetchBestStories() success path
  - [ ] 2.2.2 Test fetchBestStories() with network errors
  - [ ] 2.2.3 Test fetchBestStories() with invalid response
  - [ ] 2.2.4 Test fetchStoryById() success path
  - [ ] 2.2.5 Test fetchStoryById() with missing story
  - [ ] 2.2.6 Test fetchCommentById() success path
  - [ ] 2.2.7 Test timeout handling
  - [ ] 2.2.8 Use mockHNApi helper for mocking
  - [ ] 2.2.9 Verify 90%+ coverage for firebase.ts

- [ ] 2.3 Create `src/__tests__/api/hackernews/algolia.test.ts`
  - [ ] 2.3.1 Test searchStories() basic search
  - [ ] 2.3.2 Test searchStories() with filters (tags, date range)
  - [ ] 2.3.3 Test searchStories() pagination
  - [ ] 2.3.4 Test batchFetchStoryDetails() with story IDs
  - [ ] 2.3.5 Test batchFetchStoryDetails() chunking logic
  - [ ] 2.3.6 Test batchFetchStoryDetails() error handling
  - [ ] 2.3.7 Test fetchStoryComments() success path
  - [ ] 2.3.8 Test fetchStoryComments() with no comments
  - [ ] 2.3.9 Test API rate limiting scenarios
  - [ ] 2.3.10 Use mockHNApi helper for mocking
  - [ ] 2.3.11 Verify 90%+ coverage for algolia.ts

- [ ] 2.4 Create `src/__tests__/api/hackernews/mapper.test.ts`
  - [ ] 2.4.1 Test mapAlgoliaStoryToHNStory() basic mapping
  - [ ] 2.4.2 Test mapAlgoliaStoryToHNStory() with missing fields
  - [ ] 2.4.3 Test mapAlgoliaCommentToHNComment() basic mapping
  - [ ] 2.4.4 Test mapAlgoliaCommentToHNComment() with optional fields
  - [ ] 2.4.5 Test field type conversions (timestamps, IDs)
  - [ ] 2.4.6 Verify 90%+ coverage for mapper.ts

- [ ] 2.5 Verify API module coverage
  - [ ] 2.5.1 Run coverage report for api/ directory
  - [ ] 2.5.2 Confirm all files at 90%+ coverage
  - [ ] 2.5.3 Confirm module average at 90%+

## 3. Integration and Verification

- [ ] 3.1 Run complete test suite
  - [ ] 3.1.1 Execute `npm test`
  - [ ] 3.1.2 Verify all tests pass
  - [ ] 3.1.3 No new test failures introduced

- [ ] 3.2 Generate coverage report
  - [ ] 3.2.1 Execute `npm run test:coverage`
  - [ ] 3.2.2 Verify Utils module at 100%
  - [ ] 3.2.3 Verify API module at 90%+
  - [ ] 3.2.4 Verify overall coverage improvement (15-20%)

- [ ] 3.3 Code quality checks
  - [ ] 3.3.1 Verify test file organization (all in `src/__tests__/`)
  - [ ] 3.3.2 Verify import paths use relative imports
  - [ ] 3.3.3 Verify tests use helpers from `src/__tests__/helpers/`
  - [ ] 3.3.4 Verify test naming conventions (.test.ts suffix)

## 4. Documentation Update (REQUIRED)

- [ ] 4.1 Update README.md
  - [ ] 4.1.1 Update coverage badges/statistics
  - [ ] 4.1.2 Document completed test modules

- [ ] 4.2 Update openspec/project.md
  - [ ] 4.2.1 Update Testing Strategy with new coverage numbers
  - [ ] 4.2.2 Mark Utils and API modules as tested

- [ ] 4.3 Update test-infrastructure spec
  - [ ] 4.3.1 Document Utils module 100% achievement
  - [ ] 4.3.2 Document API module 90%+ achievement

- [ ] 4.4 Verify no broken links or outdated information
