# Design: Enhance Test Quality and Coverage Standards

## Architecture Overview

This change operates at three levels:

```
┌─────────────────────────────────────────────────────────────┐
│ Level 1: Project Constitution (openspec/project.md)        │
│ - Test quality principles                                   │
│ - Coverage threshold rationale                              │
│ - Safety guardrails enforcement                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Level 2: Test Infrastructure Configuration                  │
│ - vitest.coverage.config.ts (unified thresholds)            │
│ - Environment variable guards                                │
│ - Integration test opt-in mechanism                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Level 3: Test Implementation                                │
│ - Realistic LLM mock fixtures (helpers/mockLLMProvider.ts)  │
│ - Strengthened content filter tests                         │
│ - Explicit assertions (no optional checks)                  │
└─────────────────────────────────────────────────────────────┘
```

## Design Decisions

### Decision 1: Two-Tier Coverage Strategy

**Context**: Currently have two configurations with different thresholds (55% vs 80%)

**Options**:
1. **Immediate Unification**: Force all code to 80% now
   - Pros: Simple, consistent
   - Cons: Might break existing workflows, forced rush to add low-quality tests
2. **Phased Approach**: Set intermediate targets (Phase 1: 70%, Phase 2: 80%)
   - Pros: Gradual improvement, time to add quality tests
   - Cons: Temporary inconsistency, requires tracking
3. **Keep Separate Permanently**: Different standards for different test types
   - Pros: Reflects reality of integration test challenges
   - Cons: Confusing, encourages low standards

**Decision**: **Option 2 - Phased Approach**

**Rationale**: 
- Immediate jump to 80% would force rushed, low-quality tests
- Phased approach allows time to write realistic scenarios
- Clear timeline prevents indefinite delay

**Implementation**:
```typescript
// vitest.coverage.config.ts
export default defineConfig({
  test: {
    coverage: {
      // Phased improvement plan:
      // Current: 55% lines/statements
      // Phase 1: 70% lines/statements (add realistic LLM mocks)
      // Phase 2: 80% lines/statements (add integration tests)
      thresholds: {
        lines: 55,        // Phase 1: 70, Phase 2: 80
        statements: 55,   // Phase 1: 70, Phase 2: 80
        functions: 62,    // Phase 1: 75, Phase 2: 80
        branches: 84,     // ✅ Already exceeds 80% target
      },
    },
  },
});
```

### Decision 2: Realistic Mock Fixtures via Dictionary

**Context**: Current mock LLM provider returns generic "翻译：Translated text" responses

**Options**:
1. **Dictionary-Based**: Map English titles → realistic Chinese translations
   - Pros: Deterministic, fast, easy to verify
   - Cons: Limited to predefined inputs, doesn't test LLM prompt quality
2. **Embedded LLM**: Use small local LLM (e.g., Ollama) in tests
   - Pros: Tests real LLM behavior
   - Cons: Slow, non-deterministic, requires additional setup
3. **Recorded Responses**: Record real API responses, replay in tests
   - Pros: Realistic, deterministic
   - Cons: Requires initial recording, maintenance burden

**Decision**: **Option 1 - Dictionary-Based** with explicit documentation

**Rationale**:
- Tests need to be fast and deterministic (Option 2 fails here)
- Dictionary approach catches output format regressions
- Can add Option 3 (recorded responses) later for integration tests

**Implementation**:
```typescript
// src/__tests__/helpers/mockLLMProvider.ts

/**
 * Realistic translation fixtures based on actual LLM outputs
 * IMPORTANT: These are NOT real-time LLM calls, but curated realistic examples
 * to verify translation OUTPUT format, not LLM prompt quality.
 */
const REALISTIC_TRANSLATIONS: Record<string, string> = {
  // Tech articles
  'New JavaScript Features in ES2024': 'ES2024 中的新 JavaScript 特性',
  'Python Performance Optimization Tips': 'Python 性能优化技巧',
  'Understanding Rust Ownership': '理解 Rust 所有权机制',
  
  // Sensitive content (for filter tests)
  'Chinese Government Censorship Debate': '中国政府审查制度辩论',
  'Tibet Independence Movement': '西藏独立运动',
  
  // Generic fallback
  'default': (text: string) => `关于${extractKeywords(text).join('和')}的文章`,
};

export function mockTranslationResponse(text: string): MockLLMResponse {
  const translation = REALISTIC_TRANSLATIONS[text] || 
    REALISTIC_TRANSLATIONS.default(text);
  
  return {
    role: 'assistant',
    content: translation,
  };
}
```

### Decision 3: Environment Variable Guards

**Context**: Tests could accidentally use production credentials if env vars are set

**Options**:
1. **No Guards**: Trust developers not to set real credentials
   - Pros: No code changes
   - Cons: Risky, no fail-safe
2. **Explicit Opt-In Flag**: Require `ALLOW_INTEGRATION_TESTS=true` for real API calls
   - Pros: Explicit intent, prevents accidents
   - Cons: Extra configuration step
3. **Automatic Detection**: Check if credentials look like "test-*" prefix
   - Pros: Automatic
   - Cons: False positives, brittle

**Decision**: **Option 2 - Explicit Opt-In Flag**

**Rationale**:
- Explicit is better than implicit (Python Zen)
- Low friction (single env var)
- Clear error messages guide developers

**Implementation**:
```typescript
// src/__tests__/helpers/workerEnvironment.ts

export function createMockEnv(options: MockEnvOptions = {}): Env {
  // Guard against accidental production credential usage
  const hasRealCredentials = (
    process.env.LLM_DEEPSEEK_API_KEY?.startsWith('sk-') ||
    process.env.GITHUB_TOKEN?.startsWith('ghp_') ||
    process.env.TELEGRAM_BOT_TOKEN?.match(/^\d+:/)
  );
  
  if (hasRealCredentials && !process.env.ALLOW_INTEGRATION_TESTS) {
    throw new Error(
      'Real API credentials detected in environment. ' +
      'If you intend to run integration tests with real APIs, set ALLOW_INTEGRATION_TESTS=true. ' +
      'Otherwise, remove production credentials from your environment.'
    );
  }
  
  return {
    LLM_DEEPSEEK_API_KEY: options.LLM_DEEPSEEK_API_KEY || 'test-deepseek-key-12345',
    // ... rest of mock env
  };
}
```

### Decision 4: Content Filter Test Strengthening

**Context**: Current tests only verify `result.length > 0`, not actual filtering logic

**Options**:
1. **Add Specific Assertions**: Check exact stories filtered
   - Pros: Catches regression in filter logic
   - Cons: Brittle if filter algorithm changes
2. **Property-Based Testing**: Verify properties (e.g., "no sensitive titles in output")
   - Pros: Flexible, tests behavior not implementation
   - Cons: Requires additional library (fast-check)
3. **Snapshot Testing**: Compare filtered results to saved snapshots
   - Pros: Easy to maintain
   - Cons: Doesn't explain WHY filtering happened

**Decision**: **Option 2 - Property-Based Testing** (hybrid with specific assertions)

**Rationale**:
- Property-based tests are resilient to implementation changes
- Can combine with specific examples for clarity
- No additional dependencies (use manual property checks)

**Implementation**:
```typescript
// src/__tests__/services/contentFilter.test.ts

it('should filter sensitive content at medium sensitivity', async () => {
  const stories = [
    createMockHNStory({ title: 'Python 3.14 Performance Improvements' }), // SAFE
    createMockHNStory({ title: 'Tibet Independence Movement Analysis' }), // SENSITIVE
    createMockHNStory({ title: 'New JavaScript Framework Released' }),    // SAFE
  ];
  
  const filtered = await filter.filterStories(stories);
  
  // Property: No sensitive keywords in output
  const titles = filtered.map(s => s.title.toLowerCase());
  const sensitiveKeywords = ['tibet independence', 'censorship', 'falun gong'];
  
  for (const title of titles) {
    for (const keyword of sensitiveKeywords) {
      expect(title).not.toContain(keyword);
    }
  }
  
  // Specific: Verify expected stories included
  expect(filtered).toContainEqual(
    expect.objectContaining({ title: expect.stringContaining('Python 3.14') })
  );
  expect(filtered).toContainEqual(
    expect.objectContaining({ title: expect.stringContaining('JavaScript Framework') })
  );
  
  // Specific: Verify sensitive story excluded
  expect(filtered).not.toContainEqual(
    expect.objectContaining({ title: expect.stringContaining('Tibet') })
  );
});
```

## Data Flow

### Before: Generic Mock Responses
```
Test → Mock LLM Provider → "翻译：Translated text"
                             ↓
                        Passes (but unrealistic)
```

### After: Realistic Mock Fixtures
```
Test → Mock LLM Provider → Dictionary Lookup → "ES2024 中的新 JavaScript 特性"
                             ↓
                        Passes (realistic output)
```

## Trade-offs

### Trade-off 1: Realism vs Speed
**Choice**: Prioritize speed (dictionary-based mocks) over realism (real LLM calls)  
**Justification**: Tests must be fast for TDD. Can add slow integration tests separately.

### Trade-off 2: Strict vs Flexible Assertions
**Choice**: Use property-based assertions over exact snapshots  
**Justification**: Allows filter algorithm improvements without breaking tests.

### Trade-off 3: Immediate vs Gradual Coverage Increase
**Choice**: Gradual phased approach (Phase 1: 70%, Phase 2: 80%)  
**Justification**: Prevents rushed low-quality tests to meet arbitrary deadlines.

## Migration Strategy

1. **Phase 1**: Add documentation and safety guards
   - Update `openspec/project.md` with test quality standards
   - Add environment variable guards to `workerEnvironment.ts`
   - Document coverage thresholds in `vitest.coverage.config.ts`

2. **Phase 2**: Improve mock data quality
   - Add realistic translation dictionary to `mockLLMProvider.ts`
   - Update content filter tests with property-based assertions
   - Fix overly permissive optional checks
   - Increase coverage thresholds to 70%

3. **Phase 3**: Add integration tests
   - Create `*.integration.test.ts` files with opt-in flag
   - Increase coverage thresholds to 80%

## Validation Plan

1. **Compilation Check**: `npx tsc --noEmit` must pass
2. **Test Execution**: `npm test` must maintain 100% pass rate
3. **Coverage Verification**: `npm run test:coverage` must meet current thresholds
4. **OpenSpec Validation**: `openspec validate enhance-test-quality --strict` must pass
5. **Manual Review**: Verify realistic mock translations match actual LLM output style

## Rollback Strategy

If issues arise:
1. **Documentation Changes**: Can be reverted instantly (no code impact)
2. **Mock Data Changes**: Isolated to `helpers/` directory, easy to revert
3. **Coverage Threshold Changes**: Can temporarily disable with `--no-coverage`
4. **Environment Guards**: Can disable with `SKIP_ENV_GUARDS=true` (emergency only)

## Security Considerations

**Risk**: Environment guards could be bypassed with `ALLOW_INTEGRATION_TESTS=true`  
**Mitigation**: Document that this flag should NEVER be set in CI without explicit approval

**Risk**: Realistic mock fixtures might contain sensitive test data  
**Mitigation**: Use generic examples only, no real user data or secrets

## Performance Impact

- **Mock Data Changes**: Negligible (dictionary lookup vs string concatenation)
- **Environment Guards**: ~1ms overhead per test suite (one-time check in `beforeEach`)
- **Property-Based Assertions**: Slightly slower than simple length checks, but <5ms per test

## Compatibility

**Breaking Changes**: None  
**Deprecations**: None  
**New Requirements**: Optional `ALLOW_INTEGRATION_TESTS` env var for integration tests

## Documentation Updates

1. `openspec/project.md`: Add "Test Quality Standards" section
2. `vitest.coverage.config.ts`: Add inline comments explaining thresholds
3. `src/__tests__/helpers/mockLLMProvider.ts`: Add docstring explaining dictionary approach
4. `docs/TESTING.md`: Update with new test quality guidelines
