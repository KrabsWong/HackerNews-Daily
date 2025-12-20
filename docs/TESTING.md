# Testing Guide

This document provides comprehensive guidance on the test suite for the HackerNews Daily project.

## Overview

The project maintains comprehensive test coverage across all layers:

| Layer | Target Coverage | Status |
|-------|-----------------|--------|
| Utils | 100% | ✅ Achieved |
| API | 90%+ | ✅ Achieved |
| Worker | 85%+ | ✅ Achieved |
| Services | 90%+ | ✅ Achieved |
| Publishers | 85%+ | ✅ Achieved |
| Integration | 80%+ | ✅ Achieved |

## Test Organization

Tests follow a clear directory structure mirroring the source code:

```
src/__tests__/
├── helpers/                    # Shared test infrastructure
│   ├── fixtures.ts             # Mock data factories
│   ├── workerEnvironment.ts    # Worker mocks (Env, Request, Context)
│   ├── mockLLMProvider.ts      # LLM provider mocks with rate limiting
│   ├── mockHNApi.ts            # HackerNews API mocks
│   └── (more mocks as needed)
│
├── utils/                      # Utility layer tests
│   ├── array.test.ts
│   ├── date.test.ts
│   ├── fetch.test.ts
│   ├── html.test.ts
│   └── result.test.ts
│
├── api/                        # API layer tests
│   └── hackernews/
│       ├── firebase.test.ts
│       ├── algolia.test.ts
│       └── mapper.test.ts
│
├── services/                   # Services layer tests
│   ├── articleFetcher.test.ts
│   ├── contentFilter.test.ts
│   ├── markdownExporter.test.ts
│   ├── translator/
│   │   ├── title.test.ts
│   │   └── summary.test.ts
│   └── llm/
│       ├── providers.test.ts
│       └── factory.test.ts
│
├── worker/                     # Worker layer tests
│   ├── handlers.test.ts
│   ├── config.test.ts
│   └── scheduled.test.ts
│
└── integration/                # Integration tests
    ├── dailyExport.test.ts
    └── publishers.test.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
npm test -- handlers.test.ts

# Run tests matching a pattern
npm test -- --grep "translation"

# Generate coverage report
npm run test:coverage
```

### Coverage Report

```bash
# Generate and open coverage report
npm run test:coverage
# Report is generated in coverage/ directory
# Open coverage/index.html in a browser to view coverage details
```

## Test Infrastructure

### Mock Factories

The `src/__tests__/helpers/` directory provides mock data factories for consistent, realistic test data:

#### fixtures.ts

Provides factories for HackerNews data structures:

```typescript
import {
  createMockHNStory,
  createMockAlgoliaStory,
  createMockAlgoliaComment,
  createMockProcessedStory,
  createMockStories,
  createMockComments,
} from '../helpers/fixtures';

// Create a single mock story
const story = createMockHNStory({ 
  title: 'Custom title',
  score: 500 
});

// Create batch of stories
const stories = createMockStories(10);
```

Also includes mocks for external APIs:

```typescript
import {
  createMockCrawlerResponse,
  createMockGitHubCreateResponse,
  createMockTelegramResponse,
} from '../helpers/fixtures';

// Create mock API responses
const crawlerResponse = createMockCrawlerResponse();
const githubResponse = createMockGitHubCreateResponse();
const telegramResponse = createMockTelegramResponse();
```

#### workerEnvironment.ts

Provides Cloudflare Worker environment mocks:

```typescript
import {
  createMockEnv,
  createMockRequest,
  createMockExecutionContext,
  createMockResponse,
} from '../helpers/workerEnvironment';

// Create complete Worker environment
const env = createMockEnv({
  llmProvider: 'deepseek',
  githubEnabled: true,
  contentFilterSensitivity: 'medium',
});

// Create HTTP request
const request = createMockRequest({
  method: 'POST',
  url: '/trigger-export',
  body: { force: true },
});

// Create execution context for background tasks
const ctx = createMockExecutionContext();
```

#### mockLLMProvider.ts

Provides LLM provider mocks with simulation capabilities:

```typescript
import {
  MockLLMProviderWithRateLimit,
  mockTranslationResponse,
  mockSummaryResponse,
} from '../helpers/mockLLMProvider';

// Create advanced mock with rate limiting
const provider = new MockLLMProviderWithRateLimit();

// Configure rate limiting (fail after 5 calls)
provider.configureRateLimit(5);

// Configure error injection
provider.configureError(3, 'network');

// Use in tests
const response = await provider.chatCompletion({
  messages: [{ role: 'user', content: 'Translate this' }],
});

// Reset state for next test
provider.reset();
```

### Mocking External APIs

Tests mock HTTP calls to external services:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('API integration', () => {
  beforeEach(() => {
    // Mock fetch globally
    vi.stubGlobal('fetch', async (url: string, options?: RequestInit) => {
      // Firebase API
      if (url.includes('firebase')) {
        return new Response(JSON.stringify({ topstories: [1, 2, 3] }));
      }
      
      // Algolia API
      if (url.includes('hn.algolia.com')) {
        return new Response(JSON.stringify({ hits: [{ objectID: '1' }] }));
      }
      
      // Crawler API
      if (url.includes('crawler')) {
        return new Response(JSON.stringify({ 
          success: true, 
          data: { content: 'Article content' } 
        }));
      }
      
      throw new Error(`Unmocked URL: ${url}`);
    });
  });

  it('should fetch stories from Firebase', async () => {
    // Test code here
  });
});
```

## Writing Tests

### Test Structure

Follow this pattern for all tests:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Feature', () => {
  // Setup shared state/mocks
  beforeEach(() => {
    // Reset mocks, create fixtures, etc.
  });

  // Cleanup after each test
  afterEach(() => {
    // Clear mocks, restore state, etc.
  });

  it('should [behavior] when [condition]', () => {
    // Arrange: Set up test data
    const input = createMockData();

    // Act: Perform the action
    const result = functionUnderTest(input);

    // Assert: Verify the result
    expect(result).toBeDefined();
  });

  describe('nested context', () => {
    it('should handle edge case', () => {
      // More specific tests...
    });
  });
});
```

### Naming Conventions

Test names should follow this pattern:

```
it('should [expected behavior] when [condition/input]', () => {
  // Bad: it('tests translation')
  // Good: it('should translate English to Chinese when provided English title')
});
```

### Best Practices

1. **Keep tests independent**: Don't rely on test execution order
2. **Use clear descriptions**: Names should explain what's being tested
3. **Mock external dependencies**: No real API calls in tests
4. **Test behavior, not implementation**: Focus on inputs and outputs
5. **One assertion focus per test**: Each test should test one thing
6. **Use realistic test data**: Use fixtures that match real data

### Example: Testing a Service

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ArticleFetcher } from '../src/services/articleFetcher';
import { createMockCrawlerResponse } from './helpers/fixtures';

describe('ArticleFetcher', () => {
  let fetcher: ArticleFetcher;

  beforeEach(() => {
    fetcher = new ArticleFetcher();
    
    // Mock the Crawler API
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('crawler')) {
        return new Response(
          JSON.stringify(createMockCrawlerResponse()),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Unmocked URL: ${url}`);
    });
  });

  describe('fetchArticleContent', () => {
    it('should extract article content when URL valid', async () => {
      const result = await fetcher.fetchArticleContent('https://example.com/article');
      
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it('should truncate content when exceeding max length', async () => {
      const MAX_LENGTH = 10000;
      const result = await fetcher.fetchArticleContent('https://example.com/long');
      
      expect(result.content.length).toBeLessThanOrEqual(MAX_LENGTH);
    });

    it('should handle network errors gracefully', async () => {
      vi.stubGlobal('fetch', async () => {
        throw new Error('Network error');
      });

      const result = await fetcher.fetchArticleContent('https://example.com/article');
      
      expect(result.error).toBeDefined();
      expect(result.fallbackContent).toBeDefined();
    });
  });
});
```

## Common Testing Patterns

### Testing Error Handling

```typescript
it('should handle API errors gracefully', async () => {
  vi.stubGlobal('fetch', async () => {
    return new Response(
      JSON.stringify({ error: 'API Error' }),
      { status: 500 }
    );
  });

  const result = await service.performAction();
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('API Error');
});
```

### Testing Rate Limiting

```typescript
it('should retry on rate limit error', async () => {
  const provider = new MockLLMProviderWithRateLimit();
  provider.configureRateLimit(2); // Fail after 2 calls
  
  const results = [];
  for (let i = 0; i < 3; i++) {
    try {
      results.push(await provider.chatCompletion(request));
    } catch (error) {
      results.push(error);
    }
  }
  
  expect(results[0]).toBeDefined(); // Success
  expect(results[1]).toBeDefined(); // Success
  expect(results[2]).toThrow(); // Rate limited
});
```

### Testing Batch Operations

```typescript
it('should process batch of items efficiently', async () => {
  const items = createMockStories(50);
  const processor = new BatchProcessor();
  
  const start = Date.now();
  const results = await processor.processBatch(items);
  const duration = Date.now() - start;
  
  expect(results).toHaveLength(50);
  expect(duration).toBeLessThan(1000); // Should complete in < 1s
});
```

### Testing Mocked LLM Providers

```typescript
it('should handle LLM translation with rate limiting', async () => {
  const provider = new MockLLMProviderWithRateLimit();
  provider.configureRateLimit(3);
  
  const titles = ['Title 1', 'Title 2', 'Title 3', 'Title 4'];
  
  const translated = [];
  for (const title of titles) {
    try {
      const response = await provider.chatCompletion({
        messages: [{ role: 'user', content: `Translate: ${title}` }],
      });
      translated.push(response.content);
    } catch {
      translated.push(null); // Handle rate limit
    }
  }
  
  expect(translated.slice(0, 3).every(t => t !== null)).toBe(true);
  expect(translated[3]).toBeNull(); // Rate limited
});
```

## Integration Tests

Integration tests verify complete workflows end-to-end:

```typescript
describe('Daily Export Workflow', () => {
  beforeEach(() => {
    // Mock all external APIs needed for complete flow
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('firebase')) return mockFirebaseResponse();
      if (url.includes('algolia')) return mockAlgoliaResponse();
      if (url.includes('crawler')) return mockCrawlerResponse();
      if (url.includes('github')) return mockGitHubResponse();
      throw new Error(`Unmocked: ${url}`);
    });
  });

  it('should complete full export workflow', async () => {
    const exporter = new DailyExporter();
    const result = await exporter.runDailyExport();
    
    // Verify all steps completed
    expect(result.storiesFetched).toBeGreaterThan(0);
    expect(result.articlesExtracted).toBeGreaterThan(0);
    expect(result.titlesTranslated).toBeGreaterThan(0);
    expect(result.exported).toBe(true);
  });

  it('should gracefully degrade on partial failures', async () => {
    // Make one API fail
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('crawler')) {
        throw new Error('Crawler API down');
      }
      return mockSuccessResponse(url);
    });

    const result = await exporter.runDailyExport();
    
    // Should still complete with fallback
    expect(result.completed).toBe(true);
    expect(result.withFallbacks).toBeGreaterThan(0);
  });
});
```

## Debugging Tests

### Running with Debugging

```bash
# Run tests with detailed output
npm test -- --reporter=verbose

# Run single test with debugging
node --inspect-brk node_modules/vitest/vitest.mjs run path/to/test.ts

# Debug in VS Code
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Vitest Debug",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:debug"],
  "console": "integratedTerminal"
}
```

### Adding Debug Output

```typescript
it('should debug issue', () => {
  console.log('Debug:', { data, expected, actual });
  expect(actual).toEqual(expected);
});
```

## Continuous Integration

Tests run automatically on:
- Pre-commit (via hooks)
- Pull requests
- Before deployment

To skip tests locally (not recommended):
```bash
npm test -- --run # Run tests once
npm test -- --watch # Watch mode
```

## Performance

- Complete test suite: < 30 seconds
- Individual test: < 5 seconds
- Coverage report generation: < 10 seconds

If tests are slow:
1. Check for real network calls (should be mocked)
2. Look for long sleeps or timeouts
3. Profile with `--reporter=verbose`

## Troubleshooting

### "Cannot find module" errors
- Ensure imports use correct relative paths
- Check that helper files are in `src/__tests__/helpers/`

### Timeout errors
- Mock async functions properly
- Ensure mocks resolve/reject correctly
- Check for infinite loops

### Flaky tests
- Avoid depending on exact timing
- Don't use real random values in tests
- Mock time-dependent functions

### Memory leaks
- Clean up mocks in `afterEach`
- Restore stubs and spies
- Clear intervals/timeouts

## Contributing Tests

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure > 80% coverage for the feature
3. Add documentation for complex test scenarios
4. Run full test suite before submitting PR
5. Update this guide if adding new patterns

For questions or issues, see the [README](../README.md) or project documentation.
