# Change: Add Comprehensive Test Coverage and Testing Requirements

## Why

The project currently has no automated test coverage, which poses significant risks to code robustness, maintainability, and future development velocity. Without tests:
- Refactoring is risky and time-consuming
- Regressions can be introduced without detection
- New contributors lack confidence in making changes
- Feature changes require extensive manual testing

Establishing comprehensive test coverage now will ensure future code quality and make the testing requirement a standard practice for all new proposals.

## What Changes

- **NEW**: Test infrastructure with Vitest framework for TypeScript/Cloudflare Workers
- **NEW**: Unit tests for all utilities, services, and API modules (targeting 80%+ coverage)
- **NEW**: Integration tests for Worker entry points and publishers
- **NEW**: Test helpers for mocking external dependencies (HN API, LLM providers, GitHub API, Telegram API)
- **NEW**: CI/CD integration for automated test execution
- **MODIFIED**: OpenSpec workflow to require test updates for all future proposals
- **MODIFIED**: Documentation to include testing guidelines and examples

### Test Coverage Targets

1. **Utils** (100% coverage): `array.ts`, `date.ts`, `fetch.ts`, `html.ts`, `result.ts`
2. **API modules** (90%+ coverage): Firebase API, Algolia API, mapper
3. **Services** (85%+ coverage): translator, articleFetcher, contentFilter, LLM providers
4. **Publishers** (85%+ coverage): GitHub, Telegram, Terminal publishers
5. **Worker logic** (80%+ coverage): config validation, sources, main entry
6. **Integration tests**: End-to-end flows for daily export scenarios

## Impact

### Affected Specs
- **NEW**: `test-infrastructure` - Testing framework, configuration, and standards
- **ALL EXISTING SPECS** - Each spec will require test coverage verification

### Affected Code
- `package.json` - Add test dependencies and scripts
- `vitest.config.ts` - New test configuration
- `src/**/__tests__/` - New test directories alongside source files
- `openspec/AGENTS.md` - Updated workflow to require test coverage
- `openspec/project.md` - Updated conventions with testing guidelines
- `README.md` - Add testing documentation section

### Breaking Changes
None. This is purely additive, though all future proposals MUST include corresponding test updates.

### Migration Plan
1. Phase 1: Setup infrastructure and test utilities (no code changes)
2. Phase 2: Add tests for critical paths (utils, API, core services)
3. Phase 3: Add integration tests
4. Phase 4: Update OpenSpec workflow documentation
5. Phase 5: Achieve target coverage across all modules

## Success Criteria
- [x] Test framework configured and runnable with `npm test`
- [x] All utility modules have 98.48% coverage (target: 100%, achieved: 98.48%)
- [ ] All API modules have 90%+ coverage (Deferred to future proposal)
- [ ] All services have 85%+ coverage (Deferred to future proposal)
- [ ] Integration tests cover main export flows (Deferred to future proposal)
- [ ] CI passes on all PRs (Deferred to future proposal)
- [x] OpenSpec project.md documents test requirements and organization
- [x] Coverage reports generated and tracked

## Completion Notes

This proposal established the **testing infrastructure foundation** for the project:

**Completed**:
- ✅ Vitest 3.2.4 with Cloudflare Workers support
- ✅ Coverage reporting with v8 provider
- ✅ Test helper infrastructure (fixtures, mocks)
- ✅ **111 tests** for Utils module with **98.48% coverage**
- ✅ Test organization rules documented in `openspec/project.md` (CRITICAL)
- ✅ All tests passing in under 2 seconds

**Deferred to Future Proposals**:
- API, Services, Publishers, Worker module tests
- Integration tests
- CI/CD pipeline
- Comprehensive documentation (README, testing guide)

These deferred items are tracked in the new proposal: `complete-utils-and-api-test-coverage`
