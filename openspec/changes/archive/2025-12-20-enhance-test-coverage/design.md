# Design Document: Enhanced Test Coverage for Worker and Services

## Executive Summary

This document provides architectural and design guidance for implementing comprehensive test coverage for the Worker and Services modules. The implementation will follow a phased approach starting with infrastructure setup, then moving to unit tests for individual services, followed by integration tests for the complete daily export workflow.

## Current State Analysis

### Existing Test Coverage
- **API Layer**: 90%+ coverage (Firebase, Algolia, Mapper)
- **Utils Layer**: 100% coverage (array, date, fetch, html, result)
- **Worker Layer**: 0% coverage ⚠️
- **Services Layer**: 0% coverage ⚠️
- **Publishers Layer**: 0% coverage ⚠️
- **LLM Providers**: 0% coverage ⚠️

### Test Infrastructure
- **Framework**: Vitest 3.2.4
- **Location**: All tests in `src/__tests__/` directory
- **Helpers**: Centralized mock factories in `src/__tests__/helpers/`
- **Existing Mocks**: 
  - `mockHNApi.ts` - HN API responses
  - `mockLLMProvider.ts` - LLM provider mock
  - `fixtures.ts` - Test data factories

## Design Principles

### 1. Follow Existing Patterns
- Use Vitest like existing tests
- Organize by module in `src/__tests__/`
- Keep mocks centralized in `helpers/`
- Use existing test fixtures and factories

### 2. Type Safety First
- All mock data strictly typed (TypeScript strict mode)
- Mock factories return typed objects
- Validate mocks compile without errors

### 3. Realistic Mocking
- Mock responses match real API schemas exactly
- Include error scenarios and edge cases
- Simulate network delays and timeouts
- Implement rate limiting in provider mocks

### 4. Test Independence
- Tests don't depend on execution order
- Each test sets up its own state
- Mocks reset between tests
- No shared state between test suites

### 5. Readability and Maintainability
- Clear test names describing behavior
- Use Given-When-Then structure
- Group related tests in describe blocks
- Comments explain complex scenarios

## Test Infrastructure Design

### Phase 1: Mock Factories Extension

#### 1.1 Crawler API Mock Factory
```typescript
// src/__tests__/helpers/fixtures.ts

interface CrawlerResponse {
  success: boolean
  data: {
    title: string
    description: string
    content: string
  }
}

export function createMockCrawlerResponse(): CrawlerResponse
```

**Characteristics**:
- Simulates real Crawler API response format
- Supports success and error scenarios
- Configurable content length
- Truncation simulation

#### 1.2 GitHub API Mock Factory
```typescript
// src/__tests__/helpers/fixtures.ts

interface GitHubCreateResponse {
  content: { sha: string }
  commit: { sha: string }
}

interface GitHubUpdateResponse extends GitHubCreateResponse {}

export function createMockGitHubCreateResponse(): GitHubCreateResponse
export function createMockGitHubUpdateResponse(): GitHubUpdateResponse
```

**Characteristics**:
- Matches GitHub API response schema
- Supports both create and update operations
- Includes commit SHA for versioning

#### 1.3 Telegram Bot API Mock Factory
```typescript
// src/__tests__/helpers/fixtures.ts

interface TelegramResponse {
  ok: boolean
  result: {
    message_id: number
    chat: { id: number }
    text: string
  }
}

export function createMockTelegramResponse(): TelegramResponse
```

### Phase 2: Worker Environment Mocks

#### 2.1 Mock Worker Environment
```typescript
// src/__tests__/helpers/workerEnvironment.ts

export interface MockEnvOptions {
  llmProvider?: 'deepseek' | 'openrouter' | 'zhipu'
  githubEnabled?: boolean
  telegramEnabled?: boolean
  localTestMode?: boolean
}

export function createMockEnv(options?: MockEnvOptions): Env {
  return {
    LLM_PROVIDER: options?.llmProvider || 'deepseek',
    LLM_DEEPSEEK_API_KEY: 'test-key',
    LLM_OPENROUTER_API_KEY: 'test-key',
    LLM_ZHIPU_API_KEY: 'test-key',
    GITHUB_ENABLED: String(options?.githubEnabled !== false),
    GITHUB_TOKEN: 'test-token',
    TARGET_REPO: 'test/repo',
    TELEGRAM_ENABLED: String(options?.telegramEnabled === true),
    TELEGRAM_BOT_TOKEN: 'test-token',
    TELEGRAM_CHANNEL_ID: '@test_channel',
    LOCAL_TEST_MODE: String(options?.localTestMode === true),
    HN_STORY_LIMIT: '30',
    ENABLE_CONTENT_FILTER: 'false',
    // ... other env vars
  }
}
```

**Features**:
- Flexible configuration via options
- All required properties included
- Sensible defaults
- Easy to override per test

#### 2.2 Mock Request/Response
```typescript
// src/__tests__/helpers/workerEnvironment.ts

export function createMockRequest(options?: {
  method?: string
  url?: string
  body?: any
}): Request

export function createMockExecutionContext(): ExecutionContext
```

### Phase 3: Enhanced LLM Provider Mock

#### 3.1 Rate Limiting Support
```typescript
// src/__tests__/helpers/mockLLMProvider.ts - Enhancement

export class MockLLMProvider implements LLMProvider {
  private callCount = 0
  private rateLimitAfter?: number
  private errorAfter?: number
  private shouldTimeout = false

  configureRateLimit(afterCalls: number): void {
    this.rateLimitAfter = afterCalls
  }

  configureError(afterCalls: number, errorType: 'timeout' | 'network'): void {
    this.errorAfter = afterCalls
  }

  reset(): void {
    this.callCount = 0
    this.rateLimitAfter = undefined
    this.errorAfter = undefined
    this.shouldTimeout = false
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.callCount++

    if (this.shouldTimeout) {
      throw new Error('Timeout')
    }

    if (this.rateLimitAfter && this.callCount > this.rateLimitAfter) {
      throw new Error('HTTP 429: Too Many Requests')
    }

    if (this.errorAfter && this.callCount > this.errorAfter) {
      throw new Error('Network error')
    }

    // Return mock response...
  }
}
```

## Test Organization Strategy

### 1. Worker Tests (`src/__tests__/worker/`)

#### handlers.test.ts
```
describe('Worker HTTP Handlers', () => {
  describe('GET /', () => {
    test('returns 200 with health message')
    test('returns within reasonable time')
  })
  
  describe('POST /trigger-export', () => {
    test('with valid config returns 202')
    test('with invalid config returns 400')
    test('triggers async export')
  })
  
  describe('POST /trigger-export-sync', () => {
    test('returns 200 with result')
    test('returns export data in response body')
  })
})
```

#### config.test.ts
```
describe('Worker Configuration Validation', () => {
  describe('LLM Provider validation', () => {
    test('fails if LLM_PROVIDER missing')
    test('fails if invalid LLM_PROVIDER value')
    test('passes with valid provider')
  })
  
  describe('Publisher validation', () => {
    test('fails if no publisher enabled')
    test('passes with GitHub enabled')
    test('passes with Telegram enabled')
    test('passes with LOCAL_TEST_MODE')
    test('fails if GitHub enabled but missing token')
  })
})
```

### 2. Services Tests (`src/__tests__/services/`)

#### articleFetcher.test.ts
```
describe('Article Fetcher', () => {
  let fetcher: ArticleFetcher
  
  beforeEach(() => {
    // Setup mock Crawler API
  })
  
  describe('fetchArticleMetadata', () => {
    test('successfully fetches article')
    test('handles invalid URL')
    test('truncates content if too long')
    test('extracts description from first paragraph')
  })
  
  describe('fetchArticlesBatch', () => {
    test('fetches multiple articles')
    test('processes all URLs even if some fail')
    test('respects timeout per URL')
  })
})
```

#### translator tests
```
describe('Title Translator', () => {
  let translator: TranslationService
  
  beforeEach(() => {
    translator = new TranslationService()
    translator.init({ provider: mockLLMProvider })
  })
  
  describe('translateTitle', () => {
    test('translates English to Chinese')
    test('preserves technical terms')
    test('detects Chinese titles')
    test('retries on rate limit')
    test('falls back to original on error')
  })
  
  describe('translateTitlesBatch', () => {
    test('batches multiple titles')
    test('reduces API calls via batching')
    test('handles partial failures')
  })
})
```

### 3. Integration Tests (`src/__tests__/integration/`)

#### dailyExport.test.ts
```
describe('Daily Export Integration', () => {
  let source: HackerNewsSource
  let env: Env
  
  beforeEach(() => {
    // Setup all mocks: Firebase, Algolia, Crawler, LLM
    // Create source and env
  })
  
  test('complete happy-path export', async () => {
    // 1. Run daily export
    // 2. Verify all steps executed
    // 3. Verify final result contains 30 stories
    // 4. Verify metrics logged
  })
  
  test('export with content filtering', async () => {
    // Verify sensitive content filtered
    // Verify SAFE stories included
  })
  
  test('partial failure graceful degradation', async () => {
    // Make article fetch fail for one story
    // Verify other stories process
    // Verify failed story has fallback description
  })
})
```

## Mock Fetch Strategy

### Intercepting fetch() calls

Since tests run in Node environment (not browser), we need to mock `fetch`:

```typescript
// In test setup file or beforeEach
vi.stubGlobal('fetch', async (url: string) => {
  if (url.includes('hacker-news.firebaseio.com')) {
    return createMockFirebaseResponse()
  }
  if (url.includes('hn.algolia.com')) {
    return createMockAlgoliaResponse()
  }
  if (url.includes('crawler.api')) {
    return createMockCrawlerResponse()
  }
  throw new Error(`Unmocked URL: ${url}`)
})
```

## Error Scenario Coverage

### Network Errors
- Connection timeout (ECONNREFUSED)
- Read timeout (socket timeout)
- DNS resolution failure

### HTTP Errors
- 400 Bad Request
- 401 Unauthorized
- 429 Too Many Requests (rate limit)
- 500 Internal Server Error
- 503 Service Unavailable

### Business Logic Errors
- Empty story list (no stories for date)
- Missing article URL
- Invalid JSON responses
- Partial failures in batch operations

## Performance Considerations

### Mock Performance
- Mocks should execute in < 100ms per call
- Batch operations should complete in < 1 second
- No real HTTP calls during tests

### Test Suite Performance
- Complete test suite should run in < 30 seconds
- Individual test should complete in < 5 seconds
- Avoid long sleeps or timeouts in tests

## Type Safety and Validation

### Mock Data Validation
```typescript
// Compile-time check that mock matches interface
const mock: HNStory = createMockStory()
// If createMockStory() returns incompatible type, TypeScript error

// Runtime validation
expect(mock).toBeDefined()
expect(mock.id).toBeDefined()
expect(typeof mock.score).toBe('number')
```

### Test Compilation
```bash
npx tsc --noEmit  # Verify all tests compile without errors
```

## Documentation and Maintenance

### Test Code Organization
- Group tests by module (handlers, config, services)
- Use clear describe() hierarchy
- Add comments for complex scenarios

### Mock Maintenance
- Document mock API response schema
- Update mocks when real API changes
- Keep helper functions focused and reusable

## Rollout Plan

### Phase 1: Infrastructure (2-3 hours)
- Create mock factories
- Create Worker environment mocks
- Enhance LLM provider mock
- Verify all mocks compile and type-check

### Phase 2: Worker Tests (3-4 hours)
- HTTP handler tests
- Configuration validation tests
- Error handling tests
- Aim for 85%+ coverage

### Phase 3: Services Tests (4-5 hours)
- Article fetcher tests
- Content filter tests
- Translator tests
- Markdown exporter tests
- LLM provider tests
- Aim for 90%+ coverage

### Phase 4: Integration Tests (2-3 hours)
- Daily export end-to-end
- Multi-publisher coordination
- Error scenario validation
- Aim for 80%+ coverage

### Phase 5: Documentation (1-2 hours)
- Update README
- Update openspec/project.md
- Create TESTING.md guide

## Success Metrics

| Metric | Target |
|--------|--------|
| Test Coverage - Worker | 85%+ |
| Test Coverage - Services | 90%+ |
| Test Coverage - Publishers | 85%+ |
| Test Coverage - LLM Providers | 90%+ |
| All tests passing | 100% |
| No flaky tests | 0 flakes |
| Test suite runtime | < 30s |
| Mock data type-correct | 100% |

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Mocks become outdated | Regular review of real APIs, update mocks in sync with API changes |
| Tests become brittle | Test behaviors, not implementations; use focused, independent tests |
| Slow test suite | Optimize mocks for speed; avoid sleeps and external calls |
| Type safety breaks down | Require mock compilation with TypeScript strict mode |
| Mock maintenance burden | Centralize mocks in helpers/; clear documentation |

## Future Enhancements

### Post-MVP
- Visual test reports and coverage dashboards
- Performance benchmarking framework
- Snapshot testing for markdown output
- E2E tests against staging environment
- Load testing for concurrent requests
