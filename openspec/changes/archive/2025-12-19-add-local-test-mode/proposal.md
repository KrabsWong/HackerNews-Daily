# Proposal: Add Local Test Mode for Development

## Why

Developers currently cannot easily test the full export pipeline locally without risking data pollution. Either they must:
- Publish directly to GitHub/Telegram channels (dangerous, pollutes repositories/channels)
- Manually disable publishers or mock them (tedious, doesn't validate real output)

This creates friction in the development workflow and increases deployment risk.

## What Changes

Add a `LOCAL_TEST_MODE` configuration flag that outputs the final markdown to the terminal instead of publishing to external services, enabling safe local testing of the complete pipeline.

## Overview

Add a configuration-driven local test mode that enables developers to test the full export pipeline (`trigger-export-sync`) without publishing to external services (GitHub, Telegram). The markdown output format is preserved for preview, and content is output to the terminal for immediate verification.

**Key User Requirement**:
- When `LOCAL_TEST_MODE=true` is configured, trigger `curl -X POST http://localhost:8787/trigger-export-sync` to execute the full pipeline and output formatted markdown directly to the terminal instead of publishing to GitHub/Telegram.

## Problem Statement

Currently:
- Testing the full export pipeline locally requires either:
  - Publishing to actual GitHub/Telegram channels (risky, pollutes repositories/channels)
  - Manually mocking publishers or disabling them (tedious, doesn't test real output)
- Developers cannot easily verify the final markdown output without deploying or polluting external channels
- There's no quick feedback loop for testing content processing changes

This creates friction in the development workflow and increases the risk of deploying untested changes.

## Proposed Solution

### Overview
Introduce a `LOCAL_TEST_MODE` environment variable that:
1. When enabled (`LOCAL_TEST_MODE=true`), activates a special "terminal" publisher
2. The terminal publisher outputs the final markdown to stdout instead of publishing externally
3. All other pipeline logic (content fetching, translation, summarization, filtering) runs normally
4. Output format exactly matches the GitHub markdown format for consistency

### Implementation Strategy

#### Capability 1: Terminal Publisher
Create a new `TerminalPublisher` implementation that:
- Implements the `Publisher` interface
- Outputs markdown content to stdout with clear delimiters/formatting
- Includes minimal metadata (date, story count)
- Works in conjunction with or replaces other publishers based on `LOCAL_TEST_MODE` setting

#### Capability 2: Configuration & Routing
Extend configuration validation to:
- Recognize `LOCAL_TEST_MODE` environment variable
- When enabled, inject `TerminalPublisher` into the publisher pipeline
- Allow combining LOCAL_TEST_MODE with selective publisher disabling (e.g., `GITHUB_ENABLED=false TELEGRAM_ENABLED=false LOCAL_TEST_MODE=true`)
- Default behavior: `LOCAL_TEST_MODE=false` (no behavior change)

#### Capability 3: Terminal Output Format
Define output format with:
- Clear header separators
- Formatted markdown content
- Summary statistics (story count, date)
- Appropriate line breaks and visual organization for terminal viewing

### Configuration Example

```bash
# In .dev.vars or wrangler.toml [vars]
LOCAL_TEST_MODE = "true"
GITHUB_ENABLED = "false"
TELEGRAM_ENABLED = "false"
```

Or in environment:
```bash
LOCAL_TEST_MODE=true GITHUB_ENABLED=false TELEGRAM_ENABLED=false wrangler dev
```

### Usage Flow

```bash
# 1. Start local development server
wrangler dev

# 2. In another terminal, trigger export
curl -X POST http://localhost:8787/trigger-export-sync

# 3. Observe output in wrangler dev terminal:
# ======================================
# HackerNews Daily - 2025-01-19
# ======================================
#
# [Full markdown content displayed]
#
# ======================================
# Export completed: 30 stories
# ======================================
```

## Scope

### In Scope
- Create `TerminalPublisher` implementation in `src/worker/publishers/terminal/`
- Add `LOCAL_TEST_MODE` configuration variable
- Update configuration validation to recognize LOCAL_TEST_MODE
- Update worker entry point to inject terminal publisher when enabled
- Define terminal output formatting for stdout
- Update types to support terminal publisher configuration
- Update documentation (README.md, project.md)
- **Important**: No changes to existing GitHub/Telegram publishers

### Out of Scope
- Changes to content extraction, translation, or summarization logic
- Logging improvements (use existing logger)
- File-based output (only stdout)
- Persistent local storage or caching
- Publisher chaining or advanced publisher combinations

## Dependencies & Sequencing

1. **Phase 1**: Create TerminalPublisher implementation
2. **Phase 2**: Update configuration and validation
3. **Phase 3**: Integrate into worker pipeline
4. **Phase 4**: Test and documentation

All phases are dependent on each other—cannot be done in parallel.

## Success Criteria

- [x] LOCAL_TEST_MODE configuration recognized and validated
- [x] TerminalPublisher outputs markdown to stdout when enabled
- [x] Output includes clear formatting and metadata
- [x] Integration with existing publisher pipeline works correctly
- [x] When LOCAL_TEST_MODE=false, behavior is unchanged (backward compatible)
- [x] Documentation updated with usage examples
- [x] Manual testing confirms end-to-end flow works

---

## Next Steps

Ready to proceed with implementation once approved. Will create:
1. Detailed spec delta for local test mode capability
2. Implementation tasks with clear checkpoints
3. Design document explaining architectural decisions
