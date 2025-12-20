# Proposal: Enhance Test Quality and Coverage Standards

## Overview

This change addresses identified weaknesses in test quality, coverage configuration, and mock data realism to ensure tests accurately reflect production behavior and prevent regressions after refactoring.

## Motivation

Recent analysis revealed several critical issues:

1. **Unrealistic Mock Data**: LLM provider mocks return generic responses like "翻译：Translated text" instead of realistic translations, making tests unable to catch quality regressions
2. **Superficial Test Coverage**: Content filter tests only verify *that* results are returned, not *which* stories are filtered or *why*
3. **Inconsistent Coverage Thresholds**: Two configurations with unexplained differences (55% vs 80% for lines/statements)
4. **Missing Real API Integration**: No tests verify actual API contract compliance with HackerNews/GitHub/Telegram
5. **Overly Permissive Assertions**: Optional checks like `if (result.fullContent) { expect(...) }` hide failures
6. **Risk of Affecting Real Data**: No explicit guards prevent tests from accidentally using production credentials

## Goals

1. **Establish Test Quality Standards**: Define what constitutes a "realistic" test scenario vs artificial mock
2. **Rationalize Coverage Thresholds**: Document and unify coverage expectations across configurations
3. **Improve Mock Data Realism**: Replace generic LLM responses with fixtures that match actual API behavior
4. **Add Safety Guardrails**: Prevent tests from affecting production data through explicit environment checks
5. **Strengthen Test Assertions**: Eliminate overly permissive optional checks that hide bugs
6. **Enable Optional Integration Testing**: Allow opt-in real API tests to verify contract compliance

## Non-Goals

- Achieving 100% code coverage (diminishing returns)
- Replacing all existing tests (incremental improvement)
- Adding performance/load testing (separate concern)
- Visual regression testing for markdown output (future work)

## User Impact

**Developers:**
- Increased confidence that tests catch real bugs, not just syntax errors
- Clearer guidelines for writing new tests
- Faster identification of mock data vs real data issues

**End Users:**
- Reduced risk of regressions in production (better test quality = fewer bugs)
- No direct impact (internal quality improvement)

## Success Metrics

1. **Coverage Consistency**: Single set of thresholds documented and enforced
2. **Mock Data Quality**: 100% of LLM mock responses use realistic fixtures
3. **Test Scenario Clarity**: All tests explicitly document whether they test real or mocked behavior
4. **Safety Compliance**: Zero tests can accidentally affect production without explicit opt-in flag
5. **Content Filter Test Coverage**: Tests verify specific filtering logic, not just "something returned"

## Dependencies

- Existing test infrastructure (Vitest, mock helpers)
- OpenSpec `test-infrastructure` spec (modified)
- Project constitution (`openspec/project.md`)

## Alternatives Considered

### Alternative 1: Keep Status Quo
**Pros**: No work required  
**Cons**: Tests continue to miss real bugs, giving false confidence

### Alternative 2: Rewrite All Tests
**Pros**: Complete quality control  
**Cons**: Massive effort, risk of breaking existing coverage

### Alternative 3: Add Linting Rules Only
**Pros**: Automated enforcement  
**Cons**: Can't catch semantic issues like unrealistic mock data

**Selected Approach**: Incremental improvement with clear standards in project constitution + targeted fixes to worst offenders (content filter, LLM mocks, coverage config).

## Open Questions

1. Should integration tests with real APIs be part of CI or local-only?
   - **Recommendation**: Start local-only with `ALLOW_INTEGRATION_TESTS` flag, add to CI in future phase
2. Should we enforce realistic mock data via linting or manual review?
   - **Recommendation**: Manual review + documentation first, automated checks in future

## Related Proposals

None (initial change)

## Approval Checklist

- [ ] Proposal reviewed by maintainer
- [ ] Specification deltas drafted
- [ ] Tasks broken down into < 4 hour chunks
- [ ] Design document created (if needed)
- [ ] No breaking changes to existing test APIs
