# Design: Comprehensive Test Coverage Infrastructure

## Context

This project currently has zero automated test coverage, which creates significant technical debt and risk. We need to establish a robust testing infrastructure that:
- Supports TypeScript and Cloudflare Workers runtime
- Provides fast feedback during development
- Enables confident refactoring
- Becomes a mandatory part of the development workflow

## Goals / Non-Goals

### Goals
- Establish Vitest as the testing framework for TypeScript and Workers compatibility
- Achieve 80%+ code coverage across all modules
- Create reusable test helpers and mocks for external dependencies
- Integrate testing into CI/CD pipeline
- Make test coverage a requirement for all future proposals
- Provide clear testing guidelines and examples

### Non-Goals
- End-to-end testing in production environments (out of scope)
- Performance/load testing (can be added later)
- Visual regression testing (not applicable)
- Mutation testing (nice-to-have, but not required initially)

## Decisions

### Testing Framework: Vitest

**Decision**: Use Vitest as the primary testing framework.

**Rationale**:
- Native TypeScript support without additional configuration
- Fast execution with smart watch mode
- Compatible with Cloudflare Workers via `@cloudflare/vitest-pool-workers`
- Modern API similar to Jest but optimized for Vite/ESM
- Built-in coverage reporting with v8
- UI mode for interactive debugging

**Alternatives Considered**:
- **Jest**: Popular but requires additional TypeScript config; slower; doesn't integrate well with Workers runtime
- **Mocha + Chai**: Requires more setup; less integrated; no Workers support
- **Cloudflare's Miniflare**: Good for Workers testing but lacks full testing features; would need additional test runner

### Test File Organization

**Decision**: Centralize all tests in `src/__tests__/` directory, organized by module.

**Structure**:
```
src/
├── __tests__/           # All test files (CRITICAL: 禁止在其他目录创建测试)
│   ├── utils/           # Utils module tests
│   │   ├── array.test.ts
│   │   ├── date.test.ts
│   │   └── fetch.test.ts
│   ├── api/             # API module tests
│   ├── services/        # Services module tests
│   ├── worker/          # Worker module tests
│   ├── helpers/         # Test utilities (mocks, fixtures)
│   │   ├── fixtures.ts
│   │   ├── mockHNApi.ts
│   │   └── mockLLMProvider.ts
│   └── integration/     # Integration tests
├── utils/               # Source code
│   ├── array.ts
│   ├── date.ts
│   └── fetch.ts
```

**Rationale**:
- Single source of truth for all test files
- Easy to find all tests in one location
- Simplifies CI/CD configuration (single test directory to scan)
- Clear separation between source code and test code
- Consistent with project conventions (similar to `src/types/` for all types)
- Easy to exclude from production builds

**Alternatives Considered**:
- **Co-located `__tests__` directories**: Scatters test files across the codebase; harder to manage; conflicts with project convention
- **Separate root-level `tests/` directory**: Creates distance from source code; breaks import path consistency

### Mocking Strategy

**Decision**: Create centralized mock factories in `src/__tests__/helpers/`.

**Rationale**:
- External APIs (HN, LLM, GitHub, Telegram) should be mocked to ensure fast, deterministic tests
- Centralized mocks reduce duplication and ensure consistency
- Mock factories allow customization per test while providing sensible defaults

**Mock Factories to Create**:
1. `mockHNApi.ts` - Firebase and Algolia responses
2. `mockLLMProvider.ts` - DeepSeek/OpenRouter/Zhipu responses
3. `mockGitHubApi.ts` - GitHub API responses
4. `mockTelegramApi.ts` - Telegram API responses
5. `fixtures.ts` - Common test data (stories, articles, etc.)

### Coverage Targets

**Decision**: Set differentiated coverage targets by module criticality:

| Module | Target | Rationale |
|--------|--------|-----------|
| Utils | 100% | Pure functions, easy to test, critical for reliability |
| API | 90%+ | Core integration points, high value |
| Services | 85%+ | Business logic, moderate complexity |
| Publishers | 85%+ | External integrations with good mocking |
| Worker | 80%+ | Entry points, harder to test due to runtime |

**Rationale**:
- Allows pragmatic balance between coverage and effort
- Critical utils deserve 100% coverage as foundation
- Complex integration code (Worker runtime) gets reasonable but not perfect coverage

### CI/CD Integration

**Decision**: Run tests on every PR and main branch push via GitHub Actions.

**Workflow**:
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    - Run npm test
    - Check coverage thresholds (80% minimum)
    - Fail PR if tests fail or coverage drops
    - Upload coverage report
```

**Rationale**:
- Prevents regressions from being merged
- Ensures test suite remains healthy
- Provides visibility into code quality

### OpenSpec Workflow Integration

**Decision**: Make test coverage a mandatory requirement in all future proposals.

**Implementation**:
1. Update `openspec/AGENTS.md` to include testing in workflow stages
2. Add testing section to all `tasks.md` templates
3. Require test deltas in spec changes (similar to code changes)
4. Document testing requirements in `openspec/project.md`

**Required Changes**:
- Every proposal with code changes MUST include corresponding test changes
- `tasks.md` MUST include a testing section
- Archive checklist MUST verify tests are in sync with specs

## Risks / Trade-offs

### Risk: Initial Time Investment
**Impact**: Developing comprehensive tests will take significant time upfront.

**Mitigation**: 
- Phase the rollout (infrastructure → critical paths → full coverage)
- Start with high-value, easy-to-test modules (utils)
- Accept incremental progress toward coverage targets

### Risk: False Sense of Security
**Impact**: High coverage doesn't guarantee correct behavior if tests are poorly written.

**Mitigation**:
- Provide testing guidelines and examples
- Review test quality in code reviews
- Focus on meaningful scenarios, not just line coverage

### Risk: Test Maintenance Burden
**Impact**: Tests become outdated or brittle over time.

**Mitigation**:
- Use good mocking patterns to isolate tests from external changes
- Make test updates a required part of the OpenSpec workflow
- Keep tests simple and focused

### Risk: Cloudflare Workers Runtime Compatibility
**Impact**: Some Workers-specific features may be hard to test locally.

**Mitigation**:
- Use `@cloudflare/vitest-pool-workers` for Workers runtime support
- Mock Workers APIs where necessary
- Keep integration tests focused and minimal

## Migration Plan

### Phase 1: Infrastructure (Week 1)
1. Install Vitest and dependencies
2. Configure `vitest.config.ts`
3. Add test scripts to `package.json`
4. Create test helper structure
5. Verify basic test runs

### Phase 2: Critical Path Testing (Week 2-3)
1. Test all utils (100% coverage)
2. Test API modules (90%+ coverage)
3. Create mock factories
4. Validate coverage reports

### Phase 3: Services and Integration (Week 3-4)
1. Test translator and content filter
2. Test LLM providers
3. Add integration tests for main flows
4. Verify end-to-end scenarios

### Phase 4: Publishers and Worker (Week 4-5)
1. Test all publishers
2. Test Worker config validation and sources
3. Add local test mode integration tests
4. Achieve target coverage

### Phase 5: CI and Documentation (Week 5-6)
1. Set up GitHub Actions workflow
2. Configure coverage enforcement
3. Update all documentation
4. Update OpenSpec workflow
5. Validate everything works end-to-end

### Rollback Plan
If critical issues arise:
- Tests are purely additive and can be disabled via CI config
- No production code is affected
- Can iterate on test implementation without blocking features

## Open Questions

1. **Q**: Should we use snapshot testing for Markdown output?
   **A**: Yes, for stable outputs like formatted articles. Use sparingly to avoid brittle tests.

2. **Q**: How do we test cron-triggered Workers?
   **A**: Use Vitest's Workers pool with mocked environments and trigger handlers directly.

3. **Q**: Should we mock all external APIs or allow some real calls in integration tests?
   **A**: Mock all external APIs to ensure fast, deterministic tests. Use manual testing for real API validation.

4. **Q**: What about testing error scenarios and edge cases?
   **A**: Each test file should include both happy path and error scenarios. Use test helpers to simulate failures.

5. **Q**: How do we ensure tests don't slow down the development workflow?
   **A**: Use Vitest's watch mode during development, run full suite in CI only. Keep unit tests fast (<1s per file).
