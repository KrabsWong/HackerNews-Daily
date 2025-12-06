# Tasks: add-hn-daily-cli

## Implementation Order

### 1. Project Setup
- [x] Initialize Node.js/TypeScript project with package.json
- [x] Configure TypeScript (tsconfig.json) with strict mode
- [x] Add dependencies: axios, dotenv, cli-table3, @types packages
- [x] Create .env.example with DEEPSEEK_API_KEY placeholder
- [x] Add npm script `fetch` in package.json to run the CLI
- [x] Create basic project structure: src/index.ts, src/api/, src/services/, src/utils/

**Validation:** Run `npm install` and `tsc --noEmit` successfully

### 2. Implement HackerNews API Fetcher
- [x] Create src/api/hackerNews.ts with TypeScript interfaces for HN API responses
- [x] Implement fetchBestStories() to get story IDs from beststories endpoint
- [x] Implement fetchStoryDetails(id) to get individual story data
- [x] Add time filtering logic (past 24 hours)
- [x] Limit results to top 30 stories
- [x] Add error handling for network failures and invalid responses

**Validation:** Test fetching with mock data or real API, verify 24h filtering works

### 3. Implement DeepSeek Translation Service
- [x] Create src/services/translator.ts with DeepSeek API client
- [x] Load DEEPSEEK_API_KEY from environment using dotenv
- [x] Implement translateTitle(title) function with proper API request format
- [x] Add fallback to original title on translation failure
- [x] Implement basic rate limiting or request batching if needed
- [x] Add logging for translation errors

**Validation:** Test translation with sample titles, verify API key validation

### 4. Build CLI Interface
- [x] Create src/index.ts as main entry point
- [x] Validate environment variables on startup (DEEPSEEK_API_KEY)
- [x] Implement main workflow: fetch stories → translate titles → display table
- [x] Use cli-table3 to format output with columns: Rank, Chinese Title, Original Title, Score, URL
- [x] Add progress indicators (console.log) for each stage
- [x] Implement comprehensive error handling with user-friendly messages

**Validation:** Run `npm run fetch` end-to-end, verify table output is readable

### 5. Error Handling & Edge Cases
- [x] Test with missing DEEPSEEK_API_KEY (should exit with error message)
- [x] Test with network disconnected (should show connection error)
- [x] Test with DeepSeek API failure (should fallback to original titles)
- [x] Handle HN API returning stories without titles (skip them)
- [x] Test with very long titles (verify table wrapping/truncation)

**Validation:** Manually trigger error scenarios, verify graceful handling

### 6. Documentation & Polish
- [x] Create README.md with setup instructions and usage examples
- [x] Document .env configuration requirements
- [x] Add TypeScript build script (`tsc`) to package.json
- [x] Add example output screenshot or sample output to README
- [x] Consider adding .gitignore for .env, node_modules, dist/

**Validation:** Follow README from scratch, ensure new user can set up and run

## Dependencies & Parallelization
- Tasks 2 and 3 can be developed in parallel after task 1 completes
- Task 4 depends on tasks 2 and 3 being complete
- Tasks 5 and 6 can run in parallel after task 4

## Notes
- Use TypeScript strict mode for type safety
- DeepSeek API documentation: https://platform.deepseek.com/api-docs/
- HackerNews API: https://github.com/HackerNews/API
- Consider using axios-retry or similar for resilient API calls
