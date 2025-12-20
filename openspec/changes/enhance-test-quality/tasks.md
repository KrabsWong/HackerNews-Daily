# Tasks: Enhance Test Quality and Coverage Standards

## 1. Update Project Constitution

### 1.1 Add Test Quality Standards Section
- [ ] Open `openspec/project.md`
- [ ] Add new "Test Quality Standards (CRITICAL)" section after "Mock Data Integrity"
- [ ] Document principles:
  - Tests MUST reflect real production scenarios
  - Mock data MUST match actual API response structures
  - Tests MUST NOT affect production data under any circumstances
  - Assertions MUST be explicit and non-permissive
  - Coverage targets MUST balance quality and practicality

### 1.2 Add Test Safety Guardrails
- [ ] Document environment variable guard requirement
- [ ] Specify `ALLOW_INTEGRATION_TESTS` opt-in mechanism
- [ ] Add examples of prohibited test patterns (optional checks, generic mocks)
- [ ] Document integration test naming convention (`*.integration.test.ts`)

### 1.3 Update Coverage Threshold Documentation
- [ ] Document phased coverage improvement plan:
  - Current: 55% lines/statements
  - Phase 1: 70% lines/statements
  - Phase 2: 80% lines/statements
- [ ] Explain rationale for different module targets (Utils 100%, API 90%+, etc.)
- [ ] Add reference to coverage configuration files

**Validation**: 
- Run `rg "Test Quality Standards" openspec/project.md` to verify section added
- Verify phased plan includes dates and percentages

---

## 2. Add Environment Variable Safety Guards

### 2.1 Update Worker Environment Mock Helper
- [ ] Open `src/__tests__/helpers/workerEnvironment.ts`
- [ ] Add `detectRealCredentials()` function at the top of the file
- [ ] Implement detection logic:
  ```typescript
  function detectRealCredentials(): boolean {
    return (
      process.env.LLM_DEEPSEEK_API_KEY?.startsWith('sk-') ||
      process.env.GITHUB_TOKEN?.startsWith('ghp_') ||
      process.env.GITHUB_TOKEN?.startsWith('github_pat_') ||
      process.env.TELEGRAM_BOT_TOKEN?.match(/^\d+:/) ||
      false
    );
  }
  ```
- [ ] Add guard check in `createMockEnv()` before returning mock environment:
  ```typescript
  export function createMockEnv(options: MockEnvOptions = {}): Env {
    if (detectRealCredentials() && !process.env.ALLOW_INTEGRATION_TESTS) {
      throw new Error(
        'Real API credentials detected in environment.\n' +
        'If you intend to run integration tests with real APIs, set ALLOW_INTEGRATION_TESTS=true.\n' +
        'Otherwise, remove production credentials from your environment.\n' +
        'Detected credentials: ' + 
        (process.env.LLM_DEEPSEEK_API_KEY?.startsWith('sk-') ? 'LLM_DEEPSEEK_API_KEY ' : '') +
        (process.env.GITHUB_TOKEN?.startsWith('ghp_') ? 'GITHUB_TOKEN ' : '') +
        (process.env.TELEGRAM_BOT_TOKEN?.match(/^\d+:/) ? 'TELEGRAM_BOT_TOKEN' : '')
      );
    }
    // ... existing mock env creation
  }
  ```

### 2.2 Add Test for Safety Guards
- [ ] Open or create `src/__tests__/helpers/workerEnvironment.test.ts`
- [ ] Add test case:
  ```typescript
  it('should throw error if real credentials detected without opt-in flag', () => {
    const originalEnv = { ...process.env };
    process.env.LLM_DEEPSEEK_API_KEY = 'sk-real-key-12345';
    delete process.env.ALLOW_INTEGRATION_TESTS;
    
    expect(() => createMockEnv()).toThrow(/Real API credentials detected/);
    
    process.env = originalEnv; // Restore
  });
  ```
- [ ] Add test case for opt-in bypass:
  ```typescript
  it('should allow real credentials if ALLOW_INTEGRATION_TESTS is set', () => {
    const originalEnv = { ...process.env };
    process.env.LLM_DEEPSEEK_API_KEY = 'sk-real-key-12345';
    process.env.ALLOW_INTEGRATION_TESTS = 'true';
    
    expect(() => createMockEnv()).not.toThrow();
    
    process.env = originalEnv; // Restore
  });
  ```

**Validation**:
- Run `npm test -- workerEnvironment.test.ts` to verify guards work
- Manually test with `LLM_DEEPSEEK_API_KEY=sk-test npm test` (should fail)
- Manually test with `LLM_DEEPSEEK_API_KEY=sk-test ALLOW_INTEGRATION_TESTS=true npm test` (should pass)

---

## 3. Improve Mock LLM Provider Realism

### 3.1 Add Realistic Translation Dictionary
- [ ] Open `src/__tests__/helpers/mockLLMProvider.ts`
- [ ] Add realistic translation fixtures near the top of the file:
  ```typescript
  /**
   * Realistic translation fixtures based on actual LLM output patterns
   * IMPORTANT: These are NOT real-time LLM calls, but curated realistic examples
   * to verify translation OUTPUT format, not LLM prompt quality.
   */
  const REALISTIC_TRANSLATIONS: Record<string, string> = {
    // Programming & Tech
    'New JavaScript Features in ES2024': 'ES2024 中的新 JavaScript 特性',
    'Python Performance Optimization Tips': 'Python 性能优化技巧',
    'Understanding Rust Ownership': '理解 Rust 所有权机制',
    'TypeScript 5.0 Released': 'TypeScript 5.0 发布',
    'React 19 Beta Features': 'React 19 测试版新特性',
    'WebAssembly Tutorial': 'WebAssembly 教程',
    
    // AI & Machine Learning
    'Machine Learning Tutorial for Beginners': '面向初学者的机器学习教程',
    'GPT-4 API Usage Guide': 'GPT-4 API 使用指南',
    'Deep Learning Best Practices': '深度学习最佳实践',
    
    // Security & Privacy
    'Security Vulnerabilities in npm Packages': 'npm 包中的安全漏洞',
    'Privacy-Preserving Machine Learning': '隐私保护机器学习',
    'Zero Trust Security Architecture': '零信任安全架构',
    
    // Sensitive Content (for filter tests)
    'Chinese Government Censorship Debate': '中国政府审查制度辩论',
    'Tibet Independence Movement Analysis': '西藏独立运动分析',
    'Falun Gong Persecution Report': '法轮功迫害报告',
    'Tiananmen Square Massacre Anniversary': '天安门广场大屠杀纪念日',
    
    // Business & Startup
    'Startup Funding Strategies': '创业公司融资策略',
    'Remote Work Best Practices': '远程工作最佳实践',
    'Product Management Framework': '产品管理框架',
  };
  ```

### 3.2 Add Keyword Extraction Helper
- [ ] Add keyword extraction function:
  ```typescript
  function extractKeywords(text: string): string[] {
    // Remove common words
    const commonWords = new Set(['the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or']);
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(w => !commonWords.has(w) && w.length > 2).slice(0, 3);
  }
  ```

### 3.3 Update mockTranslationResponse Function
- [ ] Find existing `mockTranslationResponse` implementation
- [ ] Replace with realistic version:
  ```typescript
  export function mockTranslationResponse(text: string): string {
    // Check dictionary first
    if (REALISTIC_TRANSLATIONS[text]) {
      return REALISTIC_TRANSLATIONS[text];
    }
    
    // Fallback: Generate realistic translation using keywords
    const keywords = extractKeywords(text);
    if (keywords.length > 0) {
      return `关于${keywords.join('和')}的文章`;
    }
    
    // Ultimate fallback
    return `关于技术的文章`;
  }
  ```

### 3.4 Update Response Detection Logic
- [ ] Find message content detection in `MockLLMProviderWithRateLimit.chatCompletion()`
- [ ] Improve classification logic to use more sophisticated pattern matching:
  ```typescript
  const lastMessage = request.messages[request.messages.length - 1];
  const content = lastMessage.content;
  
  // Detect translation requests
  if (content.includes('翻译') || content.includes('translate') || content.includes('中文')) {
    // Extract title to translate (look for quotes or common patterns)
    const titleMatch = content.match(/"([^"]+)"/) || content.match(/标题[：:]\s*(.+)/);
    const titleToTranslate = titleMatch ? titleMatch[1] : 'Generic Article';
    response = mockTranslationResponse(titleToTranslate);
  }
  // Detect content filtering requests
  else if (content.includes('classify') || content.includes('分类') || content.includes('SAFE')) {
    // Extract title to classify
    const titleMatch = content.match(/"([^"]+)"/) || content.match(/标题[：:]\s*(.+)/);
    const titleToClassify = titleMatch ? titleMatch[1] : '';
    response = mockContentFilterResponse(titleToClassify);
  }
  ```

### 3.5 Add Realistic Content Filter Response
- [ ] Add content filter classification function:
  ```typescript
  function mockContentFilterResponse(title: string): string {
    const lowerTitle = title.toLowerCase();
    
    // Check for sensitive keywords
    const sensitiveKeywords = [
      'tibet independence', 'falun gong', 'tiananmen', 'censorship', 'persecution',
      'chinese government', 'human rights violation', 'political prisoner'
    ];
    
    for (const keyword of sensitiveKeywords) {
      if (lowerTitle.includes(keyword)) {
        return JSON.stringify({
          classification: 'SENSITIVE',
          reason: `Political content about ${keyword}`
        });
      }
    }
    
    return JSON.stringify({
      classification: 'SAFE',
      reason: 'Technical or general interest article'
    });
  }
  ```

**Validation**:
- Run `npm test -- mockLLMProvider.test.ts` to verify realistic responses
- Manually verify translations look realistic (not generic "翻译：...")
- Check that sensitive content classification works correctly

---

## 4. Strengthen Content Filter Tests

### 4.1 Open Content Filter Test File
- [ ] Open `src/__tests__/services/contentFilter.test.ts`

### 4.2 Replace Weak Assertions with Property-Based Checks
- [ ] Find test case that checks `result.length > 0`
- [ ] Replace with property-based assertions:
  ```typescript
  it('should filter sensitive content at medium sensitivity', async () => {
    const stories = [
      createMockHNStory({ id: 1, title: 'Python 3.14 Performance Improvements' }), // SAFE
      createMockHNStory({ id: 2, title: 'Tibet Independence Movement Analysis' }), // SENSITIVE
      createMockHNStory({ id: 3, title: 'New JavaScript Framework Released' }),    // SAFE
      createMockHNStory({ id: 4, title: 'Chinese Government Censorship Debate' }), // SENSITIVE
    ];
    
    const filtered = await filter.filterStories(stories);
    
    // Property: No sensitive keywords in output
    const titles = filtered.map(s => s.title.toLowerCase());
    const sensitiveKeywords = ['tibet independence', 'censorship', 'government'];
    
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
    
    // Specific: Verify sensitive stories excluded
    expect(filtered).not.toContainEqual(
      expect.objectContaining({ title: expect.stringContaining('Tibet') })
    );
    expect(filtered).not.toContainEqual(
      expect.objectContaining({ title: expect.stringContaining('Censorship') })
    );
    
    // Count check (should have 2 out of 4)
    expect(filtered).toHaveLength(2);
  });
  ```

### 4.3 Add Sensitivity Level Verification Tests
- [ ] Add test for low sensitivity (should filter very little):
  ```typescript
  it('should filter minimal content at low sensitivity', async () => {
    const stories = [
      createMockHNStory({ title: 'Python Tutorial' }), // SAFE
      createMockHNStory({ title: 'Tiananmen Square Massacre Anniversary' }), // VERY SENSITIVE
    ];
    
    const filtered = await filter.filterStories(stories, 'low');
    
    // Low sensitivity should only filter extremely sensitive content
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toContain('Python Tutorial');
  });
  ```
- [ ] Add test for high sensitivity (should filter more):
  ```typescript
  it('should filter more content at high sensitivity', async () => {
    const stories = [
      createMockHNStory({ title: 'Python Tutorial' }), // SAFE
      createMockHNStory({ title: 'Chinese tech companies regulation' }), // BORDERLINE
    ];
    
    const filtered = await filter.filterStories(stories, 'high');
    
    // High sensitivity might filter borderline content
    expect(filtered.length).toBeLessThanOrEqual(1);
  });
  ```

**Validation**:
- Run `npm test -- contentFilter.test.ts` to verify all tests pass
- Verify tests fail if filtering logic is broken (try commenting out filter logic)
- Check that tests verify WHICH stories are filtered, not just that some are returned

---

## 5. Document Coverage Thresholds

### 5.1 Update vitest.coverage.config.ts
- [ ] Open `vitest.coverage.config.ts`
- [ ] Add comprehensive inline comments above thresholds:
  ```typescript
  export default defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        // ... existing config ...
        
        /**
         * Coverage Thresholds - Phased Improvement Plan
         * 
         * Context: These thresholds are lower than the standard 80% in vitest.config.ts
         * because this configuration is used for integration tests with extensive mocking
         * and external dependencies, making 80% coverage more challenging to achieve without
         * sacrificing test quality.
         * 
         * Phased Improvement Timeline:
         * - Current: 55% lines/statements, 62% functions, 84% branches
         * - Phase 1: 70% lines/statements, 75% functions (add realistic LLM mocks)
         * - Phase 2: 80% lines/statements, 80% functions (add opt-in integration tests)
         * 
         * Branch coverage is already at 84%, exceeding the standard 80% target, reflecting
         * strong edge case and error path testing.
         * 
         * Rationale by Module:
         * - Utils: 100% target (critical infrastructure, minimal I/O, highly testable)
         * - API: 90%+ target (external dependencies, high business value)
         * - Services: 85%+ target (complex logic, multiple execution paths)
         * - Worker: 85%+ target (HTTP handlers, error scenarios)
         * - Integration: 80%+ target (end-to-end flows, partial external mocking)
         */
        thresholds: {
          lines: 55,        // Phase 1: 70, Phase 2: 80
          statements: 55,   // Phase 1: 70, Phase 2: 80
          functions: 62,    // Phase 1: 75, Phase 2: 80
          branches: 84,     // ✅ Already exceeds 80% standard target
        },
      },
    },
  });
  ```

### 5.2 Update vitest.config.ts (Standard Config)
- [ ] Open `vitest.config.ts`
- [ ] Add brief comment above thresholds explaining standard targets:
  ```typescript
  export default defineConfig({
    test: {
      coverage: {
        // ... existing config ...
        
        /**
         * Standard Coverage Thresholds (80% across all metrics)
         * 
         * These are the default targets for unit tests with full mocking control.
         * See vitest.coverage.config.ts for integration test thresholds and phased plan.
         */
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  });
  ```

**Validation**:
- Run `npm run test:coverage` to ensure comments don't break configuration
- Verify inline documentation is clear and matches proposal timeline
- Check that thresholds are unchanged (only comments added)

---

## 6. Remove Overly Permissive Assertions

### 6.1 Search for Optional Check Patterns
- [ ] Run: `rg "if \(result\." src/__tests__ -A 2` to find optional checks
- [ ] For each match, evaluate if the check should be unconditional

### 6.2 Fix Article Fetcher Tests (Example)
- [ ] Open `src/__tests__/services/articleFetcher.test.ts`
- [ ] Find patterns like:
  ```typescript
  if (result.fullContent) {
    expect(result.fullContent).toContain('Content');
  }
  ```
- [ ] Replace with explicit conditional:
  ```typescript
  // When crawler is enabled
  if (env.CRAWLER_API_URL) {
    expect(result.fullContent).toBeDefined();
    expect(result.fullContent).toContain('Content');
  } else {
    // When crawler is disabled, fullContent should be null
    expect(result.fullContent).toBeNull();
  }
  ```

### 6.3 Fix Error Message Assertions
- [ ] Search for weak error assertions: `rg "toThrow\(\)" src/__tests__`
- [ ] Replace with regex-based assertions:
  ```typescript
  // Before:
  await expect(provider.chatCompletion(request)).rejects.toThrow();
  
  // After:
  await expect(provider.chatCompletion(request)).rejects.toThrow(/rate limit exceeded/i);
  ```

**Validation**:
- Run `npm test` to ensure strengthened assertions still pass
- Intentionally break a feature to verify tests now fail loudly (then revert)
- Verify no more `if (result) { expect(...) }` patterns for features that should always work

---

## 7. Add Malformed Data Test Helpers

### 7.1 Add Malformed Mock Factories
- [ ] Open `src/__tests__/helpers/fixtures.ts`
- [ ] Add malformed data factories at the end:
  ```typescript
  /**
   * Create malformed HNStory (missing required fields, wrong types)
   * IMPORTANT: This is intentionally invalid data to test error handling.
   * Returns `any` type to bypass TypeScript validation.
   */
  export function createMalformedHNStory(): any {
    return {
      id: 'not-a-number', // Wrong type
      title: null,        // Wrong type (should be string)
      // Missing required fields: score, time, type, by
    };
  }
  
  /**
   * Create malformed AlgoliaStory (invalid JSON structure)
   */
  export function createMalformedAlgoliaStory(): any {
    return {
      objectID: 12345,
      title: 'Valid Title',
      points: 'one hundred', // Wrong type (should be number)
      created_at_i: null,    // Wrong type (should be number)
      url: 12345,            // Wrong type (should be string)
    };
  }
  ```

### 7.2 Add Tests for Malformed Data Handling
- [ ] Open `src/__tests__/api/hackernews/mapper.test.ts`
- [ ] Add test case:
  ```typescript
  it('should handle malformed Algolia response gracefully', () => {
    const malformed = createMalformedAlgoliaStory();
    
    // Mapper should either throw clear error or return null, not crash
    expect(() => {
      mapAlgoliaStoryToHNStory(malformed);
    }).not.toThrow(/undefined/); // Should not throw generic undefined errors
  });
  ```

**Validation**:
- Run `npm test -- mapper.test.ts` to verify malformed data handling
- Verify TypeScript allows `any` type for malformed factories (intentional bypass)
- Check that actual service code handles malformed data gracefully

---

## 8. Documentation Update (REQUIRED)

### 8.1 Update README.md
- [ ] Open `README.md`
- [ ] Find "Testing" section
- [ ] Add note about test quality standards:
  ```markdown
  ## Testing
  
  ### Test Quality Standards
  
  All tests must adhere to strict quality standards:
  - **Realistic Mock Data**: Mock data must match actual API response structures
  - **Explicit Assertions**: No optional checks that hide failures
  - **Safety First**: Tests cannot affect production data (enforced via environment guards)
  - **Coverage Targets**: Phased improvement (Phase 1: 55% → 70%, Phase 2: 70% → 80%)
  
  See `openspec/project.md` for complete test quality guidelines.
  ```

### 8.2 Update docs/TESTING.md
- [ ] Open `docs/TESTING.md`
- [ ] Add section on test quality standards:
  ```markdown
  ## Test Quality Standards
  
  ### Realistic Mock Data
  
  Mock data must accurately reflect production API responses. Never use generic mocks like:
  ```typescript
  // ❌ Bad: Generic unrealistic mock
  mockTranslation('Some Title') // Returns "翻译：Translated text"
  
  // ✅ Good: Realistic mock from dictionary
  mockTranslation('Python Performance Tips') // Returns "Python 性能优化技巧"
  ```
  
  ### Safety Guardrails
  
  Tests are prevented from affecting production data via environment guards:
  ```typescript
  // Guard throws error if real credentials detected without explicit opt-in
  ALLOW_INTEGRATION_TESTS=true npm test
  ```
  
  ### Strong Assertions
  
  Always use explicit assertions:
  ```typescript
  // ❌ Bad: Optional check hides failures
  if (result.fullContent) {
    expect(result.fullContent).toContain('...');
  }
  
  // ✅ Good: Explicit check for expected presence
  if (env.CRAWLER_API_URL) {
    expect(result.fullContent).toBeDefined();
  } else {
    expect(result.fullContent).toBeNull();
  }
  ```
  ```

### 8.3 Verify openspec/project.md Updates
- [ ] Verify all changes from Task 1 are complete
- [ ] Search for references to old coverage numbers: `rg "100%" openspec/project.md`
- [ ] Verify phased improvement timeline is documented

### 8.4 Test Documentation Examples
- [ ] Copy code examples from documentation
- [ ] Paste into test files temporarily
- [ ] Verify they actually work (no syntax errors)
- [ ] Remove temporary test code

**Validation**:
- Run `rg "Test Quality" README.md docs/TESTING.md` to verify sections added
- Verify all code examples in docs compile without errors
- Check no broken links with `rg "](http" docs/ README.md`

---

## 9. Final Validation

### 9.1 Run OpenSpec Validation
- [ ] Run: `openspec validate enhance-test-quality --strict`
- [ ] Fix any validation errors reported
- [ ] Verify all 3 spec deltas are recognized

### 9.2 Run Full Test Suite
- [ ] Run: `npm test`
- [ ] Verify all tests pass (should be 111+ tests)
- [ ] Check for any new warnings

### 9.3 Run Coverage Report
- [ ] Run: `npm run test:coverage`
- [ ] Verify coverage meets current thresholds (55%/62%/84%/55%)
- [ ] Check no regression in coverage percentages

### 9.4 TypeScript Compilation Check
- [ ] Run: `npx tsc --noEmit`
- [ ] Verify zero TypeScript errors
- [ ] Verify mock factories have explicit return types

### 9.5 Manual Environment Guard Test
- [ ] Set fake production credential: `export LLM_DEEPSEEK_API_KEY=sk-fake-real-key`
- [ ] Run: `npm test`
- [ ] Verify error is thrown about real credentials detected
- [ ] Set opt-in: `export ALLOW_INTEGRATION_TESTS=true`
- [ ] Run: `npm test` again
- [ ] Verify tests now run (guard bypassed)
- [ ] Clean up: `unset LLM_DEEPSEEK_API_KEY ALLOW_INTEGRATION_TESTS`

### 9.6 Review All Changed Files
- [ ] List changed files: `git status`
- [ ] Review each file for:
  - Code quality (no debug console.logs)
  - Comment quality (clear explanations)
  - No commented-out code
  - Proper formatting

**Validation**:
- All validation commands pass
- No regressions in existing tests
- Documentation is accurate and complete
- Environment guards work as expected
