# Design: Local Test Mode Implementation

## Architectural Overview

The local test mode feature integrates with the existing publisher abstraction pattern already established for GitHub and Telegram publishers. No breaking changes are required.

### Key Design Decisions

#### 1. Publisher-Based Approach (vs. Special Case in Worker)

**Decision**: Implement as a new `TerminalPublisher` following the existing `Publisher` interface pattern.

**Rationale**:
- ✅ Consistent with existing architecture (GitHub, Telegram publishers)
- ✅ Leverages existing publisher abstraction—no special-case code in worker
- ✅ Can be cleanly enabled/disabled like other publishers
- ✅ Easy to test independently
- ✅ Follows single responsibility principle
- ✅ Future publishers (RSS, Email, etc.) can reuse same pattern

**Alternative Considered**: Special conditional logic in worker entry point. **Rejected** because it would violate the publisher abstraction and make worker code harder to maintain.

#### 2. Configuration Pattern: LOCAL_TEST_MODE Flag

**Decision**: Use a separate `LOCAL_TEST_MODE` boolean flag, not a publisher-specific flag.

**Rationale**:
- ✅ Clear intent: "run in local test mode" vs "use terminal publisher"
- ✅ Easier to enable/disable wholesale during development
- ✅ Naturally pairs with `GITHUB_ENABLED=false` and `TELEGRAM_ENABLED=false`
- ✅ Backward compatible—new flag, defaults to false
- ✅ Consistent with existing naming pattern (e.g., `ENABLE_CONTENT_FILTER`)

**How It Works**:
```typescript
// In validation logic
if (LOCAL_TEST_MODE) {
  // Inject TerminalPublisher, may override other publisher settings
  // but still respect explicit GITHUB_ENABLED/TELEGRAM_ENABLED
}
```

#### 3. Output Format: Terminal-Optimized Markdown

**Decision**: Output the same markdown as GitHub, but with clear terminal delimiters and minimal metadata.

**Rationale**:
- ✅ Consistent output format—users see exactly what will be published
- ✅ Terminal delimiters make it easy to spot start/end in log stream
- ✅ Minimal metadata avoids overwhelming the output
- ✅ Human-readable but machine-parseable if needed

**Format**:
```
======================================
HackerNews Daily - YYYY-MM-DD
======================================

[Full markdown content here]

======================================
Export completed: 30 stories | 2 stories from comments
======================================
```

#### 4. Validation & Safety

**Decision**: LOCAL_TEST_MODE requires explicit intent—setting it alone doesn't override publisher validation.

**Rationale**:
- ✅ Prevents accidental misconfiguration
- ✅ Clear error messages guide users to correct setup
- ✅ User must explicitly disable GitHub/Telegram if they don't want to publish

**Required Setup**:
```env
LOCAL_TEST_MODE=true
GITHUB_ENABLED=false
TELEGRAM_ENABLED=false
```

**Error Message Example**:
```
Configuration validation warning:
- LOCAL_TEST_MODE is enabled, but no valid publisher configuration found
- To run in local test mode, set GITHUB_ENABLED=false and TELEGRAM_ENABLED=false
```

## Implementation Structure

### File Organization

```
src/worker/publishers/terminal/
├── index.ts                    # TerminalPublisher class
└── formatter.ts                # Terminal output formatting logic

src/config/
└── constants.ts                # Add LOCAL_TEST_MODE config (if needed)

src/types/
├── publisher.ts                # Add TerminalPublisherConfig if needed
└── worker.ts                   # Add LOCAL_TEST_MODE to Env type
```

### Type Definitions

```typescript
// In src/types/worker.ts - add to Env interface
interface Env {
  // ... existing fields ...
  LOCAL_TEST_MODE?: string;     // "true" or "false"
}

// In src/types/publisher.ts - add if needed
interface TerminalPublisherConfig extends PublisherConfig {
  // No special config needed—uses standard PublishContent
}
```

### TerminalPublisher Implementation

```typescript
// src/worker/publishers/terminal/index.ts
export class TerminalPublisher implements Publisher {
  readonly name = 'terminal';
  
  async publish(content: PublishContent, config: PublisherConfig): Promise<void> {
    const output = formatTerminalOutput(content);
    console.log(output);
  }
}
```

### Configuration Flow

```typescript
// In worker/index.ts handleDailyExport()

// 1. Validate configuration
validateWorkerConfig(env);

// 2. Determine which publishers to use
const publishers: Publisher[] = [];

if (isLocalTestMode(env)) {
  publishers.push(new TerminalPublisher());
  // May skip GitHub/Telegram regardless of their settings
} else {
  if (isGitHubConfigValid(env)) {
    publishers.push(new GitHubPublisher());
  }
  if (isTelegramConfigValid(env)) {
    publishers.push(new TelegramPublisher());
  }
}

// 3. Validate at least one publisher is enabled
if (publishers.length === 0) {
  throw new Error('At least one publisher must be enabled');
}

// 4. Run publishers
for (const publisher of publishers) {
  await publisher.publish(content, getPublisherConfig(env, publisher.name));
}
```

## Backward Compatibility

- ✅ New env variable (`LOCAL_TEST_MODE`) is optional, defaults to `false`
- ✅ No changes to existing publishers (GitHub, Telegram)
- ✅ Existing configurations work unchanged
- ✅ Only when explicitly enabled does behavior change
- ✅ No breaking changes to types or interfaces (only additions)

## Testing Strategy (Manual)

Local test mode is designed for manual developer testing, so testing focuses on:

1. **Configuration Validation**
   - Test LOCAL_TEST_MODE=true without disabling other publishers (should warn or fail)
   - Test LOCAL_TEST_MODE=true with GITHUB_ENABLED=false (should work)

2. **Output Verification**
   - Test `curl -X POST http://localhost:8787/trigger-export-sync` with LOCAL_TEST_MODE
   - Verify output appears in wrangler dev terminal
   - Verify markdown format is correct
   - Verify metadata (story count, date) is accurate

3. **Pipeline Integration**
   - Test that all processing (fetch, translate, summarize) still works
   - Test with different LLM providers
   - Test with content filtering enabled/disabled

## Future Extensibility

This design enables future enhancements:
- File-based output publisher (write to `.output.md`)
- JSON output publisher (for programmatic testing)
- HTML output publisher (for preview in browser)
- Multiple publishers simultaneously (terminal + GitHub, for verification)

All would follow the same `Publisher` interface pattern.
