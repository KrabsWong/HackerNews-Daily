# Tasks: Translation System Optimizations

## 1. Translation Prompt Refinement

- [x] 1.1 Update title translation prompts to exclude meta-information
  - Modify `src/services/translator/title.ts` 
  - Add explicit instructions to return only clean translated content
  - Add negative constraints against character counts and formatting notes

- [x] 1.2 Update summary translation prompts to exclude meta-information
  - Modify `src/services/translator/summary.ts`
  - Add strict output boundaries for content and comment summaries
  - Include examples of what NOT to output

- [x] 1.3 Add post-processing validation to strip unwanted artifacts
  - Create utility function to detect and remove common meta-information patterns
  - Apply validation to all translation outputs before returning
  - Log when artifacts are detected and removed

## 2. Progress Logging Implementation

- [x] 2.1 Create ProgressTracker utility class
  - Add `src/services/translator/progress.ts`
  - Implement setCurrent(total), updateProgress(current), getProgressPercentage()
  - Include configurable logging intervals

- [x] 2.2 Enhance TranslationService with progress logging
  - Modify `src/services/translator/index.ts`
  - Add progress tracking for batch operations
  - Log start, progress, and completion events

- [x] 2.3 Integrate progress logging into translation workflows
  - Update `src/worker/sources/hackernews.ts` to use progress logging
  - Add progress indicators for titles, summaries, and comments translation
  - Ensure progress logs include operation type and totals

## 3. Provider/Model Logging Enhancement

- [x] 3.1 Add provider/model context to TranslationService
  - Enhance `src/services/translator/index.ts` to track provider and model
  - Add logApiRequest() and logApiResponse() helper methods
  - Include provider/model in all relevant log messages

- [x] 3.2 Update API call logging
  - Modify all translation methods to log before/after API calls
  - Include provider, model, operation type, content length
  - Log response times and success/failure status

- [x] 3.3 Enhance error logging with provider context
  - Update error handling to include provider and model information
  - Add timeout-specific logging with provider details
  - Include retry attempt information in error logs

## 4. Comment Translation Reliability

- [x] 4.1 Implement retry logic for comment translation
  - Add translateCommentsWithRetry() method in `src/services/translator/summary.ts`
  - Implement exponential backoff with configurable max retries
  - Add detailed logging for each retry attempt

- [x] 4.2 Add Chinese output validation
  - Create isChineseText() utility function
  - Validate comment translations before accepting results
  - Log validation failures with content previews

- [x] 4.3 Implement fallback mechanisms for comment failures
  - Add fallback to format original comments when translation fails
  - Ensure graceful degradation without breaking the workflow
  - Log when fallback is used

- [x] 4.4 Add timeout handling for comment translation
  - Implement specific timeout configuration for comment operations
  - Add timeout error logging with provider context
  - Configure longer timeouts for batch comment operations

## 5. Telegram Batch Sending Implementation

- [x] 5.1 Create TelegramBatchSender class
  - Add `src/worker/publishers/telegram/batch-sender.ts`
  - Implement configurable batch size and inter-batch delays
  - Add progress tracking for batch operations

- [x] 5.2 Modify TelegramPublisher to use batch sending
  - Update `src/worker/publishers/telegram/index.ts`
  - Replace sequential sending with batch-based approach
  - Maintain backward compatibility with existing interface

- [x] 5.3 Add batch error handling
  - Implement per-batch error handling with logging
  - Continue processing subsequent batches when one fails
  - Add final summary with success/failure statistics

- [x] 5.4 Add configuration options for batch parameters
  - Update `src/config/constants.ts` with new batch configuration
  - Add TELEGRAM_BATCH_SIZE and TELEGRAM_BATCH_DELAY options
  - Include validation for configuration values

## 6. Configuration and Constants

- [x] 6.1 Add progress logging configuration
  - Update `src/config/constants.ts` with progress logging options
  - Add PROGRESS_LOG_INTERVAL and ENABLE_DETAILED_LOGGING
  - Set sensible defaults for production vs debugging

- [x] 6.2 Add comment translation reliability configuration
  - Add COMMENT_TRANSLATION_TIMEOUT, COMMENT_MAX_RETRIES constants
  - Add COMMENT_RETRY_BASE_DELAY configuration
  - Document configuration options in README.md

- [x] 6.3 Add batch sending configuration
  - Add default batch size and delay constants
  - Include environment variable overrides
  - Add configuration validation at startup

## 7. Testing

- [x] 7.1 Unit tests for prompt enhancements
  - Test translation outputs for absence of meta-information
  - Verify post-processing artifact removal
  - Test prompt effectiveness with sample content

- [x] 7.2 Unit tests for progress logging
  - Test ProgressTracker functionality
  - Verify logging format and content
  - Test progress calculation accuracy

- [x] 7.3 Unit tests for comment translation reliability
  - Test retry logic with mock failures
  - Verify Chinese text validation
  - Test fallback mechanisms

- [x] 7.4 Unit tests for batch sending
  - Test batch creation and timing
  - Verify error handling for batches
  - Test configuration validation

## 8. Integration Testing

- [x] 8.1 End-to-end translation workflow test
  - Run complete translation pipeline with enhanced logging
  - Verify all log entries include provider/model information
  - Check progress indicators throughout the process

- [x] 8.2 Comment translation failure scenarios
  - Test with mock timeouts and API failures
  - Verify retry behavior and fallback mechanisms
  - Check logging during failure scenarios

- [x] 8.3 Telegram sending test
  - Test batch sending with various article counts
  - Verify timing between batches
  - Test error handling during batch operations

## 9. Batch Processing Observability (NEW)

- [x] 9.1 Enhance JSON array parsing robustness
  - Update `src/utils/array.ts` `parseJsonArray()` function
  - Add support for multiple markdown code block formats (```json, ```javascript, ```)
  - Extract JSON arrays from surrounding text using regex
  - Remove trailing commas and empty lines
  - Add detailed error logging with content preview (first 200 chars)
  - Add content length logging
  - Add helpful context when JSON structures detected but parsing fails

- [x] 9.2 Add real-time batch start logging
  - Modify `src/services/translator/summary.ts` `summarizeContentBatch()`
  - Add batch start log before processing each batch
  - Format: `[Content Summary] Processing batch X/Y: N articles | Provider: xxx/model`
  - Modify `summarizeCommentsBatch()` with same pattern
  - Format: `[Comment Summary] Processing batch X/Y: N stories | Provider: xxx/model`

- [x] 9.3 Enhance API error logging with full context
  - Update error handling in `summarizeContentBatch()` API call failures
  - Log structured error object with: error, batchSize, provider, model, fallbackStrategy
  - Update error handling in `summarizeCommentsBatch()` API call failures
  - Use `console.error()` instead of `console.warn()` for better visibility

- [x] 9.4 Enhance JSON parse error logging
  - Update JSON parse error handling in `summarizeContentBatch()`
  - Log structured error object with: error, expectedItems, provider, model, note, fallbackStrategy
  - Update JSON parse error handling in `summarizeCommentsBatch()`
  - Reference parseJsonArray logs for detailed content inspection

- [x] 9.5 Enhance empty content error logging
  - Update empty content handling in `summarizeCommentsBatch()`
  - Log structured error object with: batchSize, provider, model, fallbackStrategy
  - Use consistent error logging format

- [x] 9.6 Update configuration documentation
  - Enhance comments in `src/config/constants.ts` `LLM_BATCH_CONFIG`
  - Document that content/comment summarization use batch size 10 by default
  - Add note about large batches potentially causing JSON parsing errors
  - Recommend batch size 10 or smaller for reliability

## 10. Documentation Update (REQUIRED)

- [x] 10.1 Check README.md for affected sections
  - ~~Update translation configuration documentation~~ (reverted - no user-facing troubleshooting)
  - ~~Add troubleshooting section for translation issues~~ (reverted - moved to OpenSpec)
  - Keep configuration clean and minimal

- [x] 10.2 Check openspec/project.md for structural changes
  - Update project conventions if logging patterns changed
  - Document new configuration options
  - Update architecture descriptions

- [x] 10.3 Update OpenSpec proposal and specs
  - Update proposal.md with new observability improvements
  - Create new spec: batch-observability/spec.md
  - Document all logging enhancements and error handling improvements
  - Include troubleshooting and debugging guidance in specs

- [x] 10.4 Check docs/ for affected guides
  - Update debugging guides with enhanced logging (if applicable)
  - Document new configuration options (if user-configurable)
  - Keep user docs focused on usage, not internals

- [x] 10.5 Update or remove references to changed features
  - Search for references to old translation behavior
  - Update examples to show new logging output (in OpenSpec only)
  - Remove outdated configuration documentation

- [x] 10.6 Verify no broken links or outdated information
  - Check all internal links still work
  - Verify external links are still valid
  - Ensure consistency across all documentation

## 11. LLM Batch Size Configuration Fix

- [x] 11.1 Fix parseLLMBatchSize logic bug
  - Modify `src/worker/sources/hackernews.ts` `parseLLMBatchSize()` function
  - Remove incorrect condition `|| LLM_BATCH_CONFIG.MAX_BATCH_SIZE === 0`
  - Only `parsed === 0` should return 0 (disable batching)
  - `MAX_BATCH_SIZE=0` means "no limit", not "disable batching"

- [x] 11.2 Clarify configuration semantics
  - `LLM_BATCH_SIZE=0`: Disable batching (process all at once)
  - `LLM_BATCH_SIZE=N` (N>0): Use N as batch size
  - `MIN_BATCH_SIZE=0`: No minimum constraint
  - `MAX_BATCH_SIZE=0`: No maximum constraint

- [x] 11.3 Document fix in OpenSpec
  - Update proposal.md with problem description
  - Create new spec: llm-batch-size-fix/spec.md
  - Document root cause, fix, and test cases