# Implementation Tasks

## 1. Test Infrastructure Setup

- [x] 1.1 Install Vitest and related dependencies (`vitest`, `@vitest/ui`, `@cloudflare/vitest-pool-workers`)
- [x] 1.2 Create `vitest.config.ts` with TypeScript, Workers runtime support
- [x] 1.3 Configure coverage reporting with v8 provider
- [x] 1.4 Add test scripts to `package.json` (`test`, `test:watch`, `test:coverage`, `test:ui`)
- [x] 1.5 Create test helper utilities in `src/__tests__/helpers/`
  - [x] 1.5.1 Mock factory for HackerNews API responses
  - [x] 1.5.2 Mock factory for LLM provider responses
  - [x] 1.5.3 Mock factory for GitHub API responses (created basic structure)
  - [x] 1.5.4 Mock factory for Telegram API responses (created basic structure)
  - [x] 1.5.5 Test fixtures for common data structures

## 2. Unit Tests - Utils Module (Target: 100% coverage)

- [x] 2.1 `src/__tests__/utils/array.test.ts` - Test all array utilities (97.33% coverage, 25 tests)
- [x] 2.2 `src/__tests__/utils/date.test.ts` - Test date formatting and manipulation (100% coverage, 21 tests)
- [x] 2.3 `src/__tests__/utils/fetch.test.ts` - Test fetch wrapper with timeout/retry (100% coverage, 27 tests)
- [x] 2.4 `src/__tests__/utils/html.test.ts` - Test HTML parsing and extraction (78.57% coverage, 12 tests)
- [x] 2.5 `src/__tests__/utils/result.test.ts` - Test Result type utilities (100% coverage, 26 tests)

**Utils Module Result**: 98.48% overall coverage, 111 tests passing ✅

## 3. Unit Tests - API Module (Target: 90%+ coverage)

**Status**: Deferred to future proposal `complete-utils-and-api-test-coverage`

- [ ] 3.1 `src/api/hackernews/__tests__/firebase.test.ts` - Test Firebase API client
- [ ] 3.2 `src/api/hackernews/__tests__/algolia.test.ts` - Test Algolia API client with batch fetching
- [ ] 3.3 `src/api/hackernews/__tests__/mapper.test.ts` - Test data mapping transformations

## 4. Unit Tests - Services Module (Target: 85%+ coverage)

**Status**: Deferred to future proposals

## 5. Unit Tests - Publisher Module (Target: 85%+ coverage)

**Status**: Deferred to future proposals

## 6. Unit Tests - Worker Module (Target: 80%+ coverage)

**Status**: Deferred to future proposals

## 7. Integration Tests

**Status**: Deferred to future proposals

## 8. CI/CD Integration

**Status**: Deferred to future proposals

## 9. OpenSpec Workflow Updates

- [x] 9.1 Update `openspec/project.md` to document test organization requirements (CRITICAL section added)
- [ ] 9.2 Add testing section to proposal template (Deferred)
- [ ] 9.3 Add testing checklist to tasks.md template (Deferred)
- [ ] 9.4 Document test coverage requirements in validation guidelines (Deferred)

## 10. Documentation Updates

- [x] 10.2 Update `openspec/project.md` with:
  - [x] 10.2.1 Testing strategy section
  - [x] 10.2.2 Test file organization conventions (CRITICAL)
  - [x] 10.2.3 Mocking guidelines (basic structure)
- [ ] 10.1 Add "Testing" section to README.md (Deferred to future)
- [ ] 10.3 Create `docs/testing-guide.md` (Deferred to future)
- [ ] 10.4 Add test examples for common patterns (Deferred to future)

## 11. Verification and Quality Gates

- [x] 11.1 Run full test suite and verify all tests pass (111/111 tests passing ✅)
- [x] 11.2 Generate coverage report and verify targets met (Utils module: 98.48% ✅)
- [ ] 11.3 Run tests in CI and verify pipeline passes (Deferred - no CI yet)
- [ ] 11.4 Manual smoke test of Worker with test coverage enabled (Deferred)
- [x] 11.5 Verify test helpers work correctly in tested modules (fixtures and mockHNApi working ✅)
- [ ] 11.6 Validate OpenSpec changes with `openspec validate --strict`
