# Proposal: add-hn-daily-cli

## Summary
Create a CLI tool that fetches top HackerNews stories from the past 24 hours using the HackerNews API, translates titles to Chinese using DeepSeek LLM, and displays results in a formatted console table.

## Motivation
Users want a quick way to browse trending HackerNews content in Chinese without manually visiting the website and translating titles. This CLI tool automates the workflow: fetch → translate → display.

## Scope
- **In scope:**
  - Fetch stories from HackerNews "best" endpoint (24h filter)
  - Translate titles to Chinese via DeepSeek API
  - Display formatted output in terminal table
  - Environment-based configuration for API credentials
  - TypeScript/Node.js implementation with npm script invocation

- **Out of scope:**
  - Automated scheduling/cron jobs (manual invocation only)
  - Storing historical data or caching
  - Full article translation (titles only)
  - Web UI or interactive mode

## Dependencies
- External APIs: HackerNews API (https://hacker-news.firebaseio.com/v0), DeepSeek API
- Runtime: Node.js (≥18.x recommended)
- Key libraries: axios/fetch for HTTP, dotenv for env vars, cli-table3 or similar for formatting

## Related Changes
None (initial implementation)

## Risks & Mitigations
- **Risk:** DeepSeek API rate limits or failures
  - **Mitigation:** Implement retry logic, graceful error handling, display original title on translation failure
  
- **Risk:** HackerNews API changes or downtime
  - **Mitigation:** Use official API endpoints, handle HTTP errors gracefully

- **Risk:** Large number of stories causing slow execution
  - **Mitigation:** Limit to top N stories (e.g., 30) with configurable option

## Success Criteria
- [x] User can run `npm run fetch` and see top HN stories with Chinese titles
- [x] API errors are handled gracefully with clear error messages
- [x] Output is readable and well-formatted in terminal
- [x] Configuration via environment variables works correctly
- [x] Code is type-safe (TypeScript) with proper error handling
