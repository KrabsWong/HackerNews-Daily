# Tasks: Add Telegram Channel Publisher

## 1. Type Definitions

- [x] 1.1 Add `TelegramPublisherConfig` interface to `src/types/publisher.ts`
- [x] 1.2 Add Telegram environment variables to `Env` type in `src/types/worker.ts`

## 2. Telegram Publisher Implementation

- [x] 2.1 Create `src/worker/publishers/telegram/` directory structure
- [x] 2.2 Implement `src/worker/publishers/telegram/client.ts` - Telegram API client
  - sendMessage with Markdown parse mode
  - Error handling and response parsing
- [x] 2.3 Implement `src/worker/publishers/telegram/formatter.ts` - Message formatting
  - Convert markdown content to Telegram-compatible format
  - Handle 4096 character limit with message splitting
  - Preserve story links and formatting
- [x] 2.4 Implement `src/worker/publishers/telegram/index.ts` - TelegramPublisher class
  - Implement Publisher interface
  - Configuration validation
  - Sequential message sending for split content

## 3. Worker Integration

- [x] 3.1 Update `src/worker/config/validation.ts` for Telegram config validation
  - TELEGRAM_BOT_TOKEN validation (when TELEGRAM_ENABLED)
  - TELEGRAM_CHANNEL_ID validation (when TELEGRAM_ENABLED)
- [x] 3.2 Update `src/worker/index.ts` to use TelegramPublisher
  - Conditionally enable based on TELEGRAM_ENABLED
  - Execute after GitHub publish (parallel or sequential)
- [x] 3.3 Update `wrangler.toml` with Telegram configuration comments

## 4. Testing

- [x] 4.1 Manual test with local Worker (`npm run dev:worker`)
- [ ] 4.2 Verify message formatting in Telegram channel
- [ ] 4.3 Test error handling for invalid token/channel

## 5. Documentation Update (REQUIRED)

- [x] 5.1 Check README.md for affected sections
  - Add Telegram configuration to features list
  - Add environment variables documentation
- [x] 5.2 Check openspec/project.md for structural changes
  - Add telegram publisher to directory structure
  - Update Configuration section with Telegram vars
- [x] 5.3 Update .env.example with Telegram variables
- [x] 5.4 Verify no broken links or outdated information

## 6. Post-Implementation Changes

### 6.1 Remove CLI Testing Mode
- [x] 6.1.1 Delete `src/index.ts` (CLI entry point)
- [x] 6.1.2 Delete `src/services/cache.ts` (CLI-only caching)
- [x] 6.1.3 Delete `src/types/cache.ts` (cache types)
- [x] 6.1.4 Delete `src/utils/logger.ts` (CLI file logging)
- [x] 6.1.5 Delete `tsconfig.node.json` (CLI TypeScript config)
- [x] 6.1.6 Delete `scripts/` directory
- [x] 6.1.7 Update `package.json` - Remove fetch, clean, build, start scripts
- [x] 6.1.8 Update `README.md` - Rewrite for Worker-only mode
- [x] 6.1.9 Update `CLAUDE.md` - Rewrite for Worker-only mode
- [x] 6.1.10 Update `docs/local-development.md` - Rewrite for `.dev.vars` usage
- [x] 6.1.11 Update `docs/quick-reference.md` - Remove CLI commands
- [x] 6.1.12 Update `.env.example` - Remove CLI-only config

### 6.2 Fix Error Logging
- [x] 6.2.1 Add `formatError()` function to `src/worker/logger.ts`
- [x] 6.2.2 Add `getErrorMessage()` function to `src/worker/logger.ts`
- [x] 6.2.3 Update `src/services/translator/title.ts` - Use `getErrorMessage()`
- [x] 6.2.4 Update `src/services/translator/summary.ts` - Use `getErrorMessage()`
- [x] 6.2.5 Update `src/api/hackernews/algolia.ts` - Use `getErrorMessage()`
- [x] 6.2.6 Update `src/services/contentFilter.ts` - Use `getErrorMessage()`

### 6.3 Fix Telegram Empty Messages
- [x] 6.3.1 Add `stories: ProcessedStory[]` field to `PublishContent` type
- [x] 6.3.2 Add `stories: ProcessedStory[]` field to `SourceContent` type
- [x] 6.3.3 Update `runDailyExport` to return stories array
- [x] 6.3.4 Rewrite `formatter.ts` to use ProcessedStory directly (not parse markdown)
- [x] 6.3.5 Update `TelegramPublisher` to send each story as separate message
- [x] 6.3.6 Implement graceful degradation (continue on single message failure)
