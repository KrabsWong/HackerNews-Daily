# Implementation Tasks: Local Test Mode

## 1. Create TerminalPublisher Implementation

- [x] 1.1 Create directory `src/worker/publishers/terminal/`
- [x] 1.2 Create `src/worker/publishers/terminal/formatter.ts` with `formatTerminalOutput()` function
  - Accepts `PublishContent` parameter
  - Returns formatted string with delimiters, markdown, and metadata
  - Format: header separators, date title, markdown content, story count footer
- [x] 1.3 Create `src/worker/publishers/terminal/index.ts` with `TerminalPublisher` class
  - Implements `Publisher` interface
  - Sets `readonly name = 'terminal'`
  - Implements `publish()` method that calls formatter and logs to stdout
  - Exports TerminalPublisher for use in worker
- [x] 1.4 Verify formatter produces correct output structure with:
  - Clear "======" delimiters (30+ equals signs)
  - Title "HackerNews Daily - YYYY-MM-DD"
  - Full markdown content
  - Summary "Export completed: N stories"

## 2. Update Type Definitions

- [x] 2.1 Update `src/types/worker.ts`
  - Add `LOCAL_TEST_MODE?: string;` to `Env` interface
  - Documentation comment: "Enable local test mode (output to terminal instead of publishing)"
- [x] 2.2 Verify `src/types/publisher.ts` supports the Publisher interface
  - No changes needed if TerminalPublisher uses standard PublisherConfig
- [x] 2.3 Export TerminalPublisher from `src/worker/publishers/index.ts` (if exists)
  - Or ensure it can be imported from `src/worker/publishers/terminal`

## 3. Add Configuration Support

- [x] 3.1 Update `src/config/constants.ts` (optional, only if needed)
  - Add getter for LOCAL_TEST_MODE if centralizing config reading
  - Otherwise, config will be read directly from Env in validation
- [x] 3.2 Update `wrangler.toml` [vars] section (optional)
  - Add `LOCAL_TEST_MODE = "false"` as default for documentation
  - Comment explaining usage in local development

## 4. Update Configuration Validation

- [x] 4.1 Update `src/worker/config/validation.ts`
  - Add `isLocalTestModeEnabled(env: Env): boolean` function
  - Checks if `env.LOCAL_TEST_MODE?.toLowerCase() === 'true'`
  - Add `validateLocalTestModeConfig(env: Env): string[]` function
  - Returns warnings if LOCAL_TEST_MODE is enabled but no valid publisher path exists
- [x] 4.2 Modify `validateWorkerConfig(env: Env)` function
  - Add logic to handle LOCAL_TEST_MODE in validation
  - When LOCAL_TEST_MODE is true, warn if no explicit GitHub/Telegram configuration
  - Ensure at least one publisher will be enabled
  - Update error messages to mention LOCAL_TEST_MODE as an option
- [x] 4.3 Test validation with different configuration combinations:
  - LOCAL_TEST_MODE=true, GITHUB_ENABLED=false, TELEGRAM_ENABLED=false (should pass)
  - LOCAL_TEST_MODE=true, GITHUB_ENABLED=true (should warn/pass depending on decision)
  - LOCAL_TEST_MODE=true, no explicit settings (should fail or warn clearly)

## 5. Integrate TerminalPublisher into Worker Pipeline

- [x] 5.1 Update `src/worker/index.ts` handleDailyExport() function
  - Import TerminalPublisher from `./publishers/terminal`
  - Import isLocalTestModeEnabled from `./config/validation`
  - After validation, determine active publishers:
    ```typescript
    const publishers: Publisher[] = [];
    const localTestMode = isLocalTestModeEnabled(env);
    
    if (localTestMode) {
      publishers.push(new TerminalPublisher());
    } else {
      if (isGitHubConfigValid(env)) {
        publishers.push(new GitHubPublisher());
      }
      if (isTelegramConfigValid(env)) {
        publishers.push(new TelegramPublisher());
      }
    }
    ```
  - Verify at least one publisher is active
  - Execute publishers in the existing loop
- [x] 5.2 Ensure configuration is passed correctly to publishers
  - TerminalPublisher uses standard PublisherConfig
  - No special configuration builder needed for terminal publisher
- [x] 5.3 Manual test: Start wrangler dev and trigger export with LOCAL_TEST_MODE=true

## 6. Test Terminal Output Manually

- [x] 6.1 Setup local environment:
  - Create `.dev.vars` or update with:
    ```
    LOCAL_TEST_MODE=true
    GITHUB_ENABLED=false
    TELEGRAM_ENABLED=false
    LLM_PROVIDER=openrouter
    LLM_OPENROUTER_API_KEY=<valid-key>
    ```
- [x] 6.2 Start development server:
  - Run `npm run dev:worker` (or equivalent wrangler dev)
  - Observe startup messages
- [x] 6.3 Trigger export:
  - Run `curl -X POST http://localhost:8787/trigger-export-sync` in another terminal
  - Observe output in wrangler dev terminal
- [x] 6.4 Verify output:
  - Markdown content is properly formatted
  - Story count is correct
  - Delimiters are visible and clear
  - No errors in logs
- [x] 6.5 Test configuration variations:
  - Verify error when LOCAL_TEST_MODE=true without disabling publishers
  - Verify normal operation when LOCAL_TEST_MODE=false
  - Verify backward compatibility (no LOCAL_TEST_MODE set defaults to false)

## 7. Verify Backward Compatibility

- [x] 7.1 Test without LOCAL_TEST_MODE configuration
  - Behavior should be identical to before
  - GitHub and Telegram publishers work unchanged
- [x] 7.2 Test mixed configurations
  - LOCAL_TEST_MODE=false, GITHUB_ENABLED=true (should use GitHub)
  - LOCAL_TEST_MODE=false, GITHUB_ENABLED=false, TELEGRAM_ENABLED=true (should use Telegram)
  - Verify no regression in existing publisher paths

## 8. Documentation Update (REQUIRED)

- [x] 8.1 Update `README.md`
  - Add section explaining LOCAL_TEST_MODE feature
  - Include example `.dev.vars` configuration
  - Add instructions for running local tests with `wrangler dev` and `curl`
  - Example output snippet
- [x] 8.2 Update `openspec/project.md`
  - Update Configuration section to document LOCAL_TEST_MODE
  - Add to list of environment variables
  - Document default value (false) and usage pattern
  - Add to "Important Constraints" if relevant
- [x] 8.3 Check for other documentation references
  - Search for developer setup instructions
  - Add mention of LOCAL_TEST_MODE in relevant guides
  - Update any architecture diagrams if they document publisher routing
- [x] 8.4 Verify no broken links or outdated information
  - Test all code examples work with new configuration
  - Ensure documentation is accurate and complete

## Definition of Done

- All tasks completed and checked off
- TerminalPublisher class created and exports properly
- Configuration validation recognizes LOCAL_TEST_MODE
- Worker integrates TerminalPublisher when enabled
- Manual tests pass with local `wrangler dev` setup
- Output format matches specification
- Backward compatibility maintained (existing configs work unchanged)
- Documentation updated and accurate
- No TypeScript errors or warnings
- Code follows project conventions (camelCase functions, PascalCase classes, etc.)
