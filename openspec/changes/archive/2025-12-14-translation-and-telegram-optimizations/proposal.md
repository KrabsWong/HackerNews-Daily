# Change: Translation and Telegram Publishing Optimizations

## Why

The current translation system has quality, reliability, and observability issues:
- Translation outputs contain unwanted LLM artifacts (character counts, formatting notes)
- Batch processing lacks real-time progress visibility, making it hard to tell if the system is working or stuck
- Error context is insufficient for debugging batch failures
- JSON parsing is unreliable with various LLM response formats
- Comment translation has inconsistent reliability
- Telegram publishing sends too many individual messages
- LLM batch size configuration is ignored due to a logic bug

## What Changes

- **Refined Translation Prompts**: Update prompts to explicitly exclude meta-information and artifacts
- **Real-time Batch Progress Logging**: Add `[Content/Comment Summary] Processing batch X/Y...` logs
- **Enhanced Error Logging**: Include provider, model, batch size, and fallback strategy in all error logs
- **Robust JSON Parsing**: Handle markdown code blocks, trailing commas, text-surrounded JSON
- **Fallback Progress Logging**: Show item-by-item progress when batch processing falls back to individual processing
- **Comment Translation Retry**: Implement exponential backoff retry logic
- **Telegram Message Merging**: Combine multiple stories into single messages based on `TELEGRAM_BATCH_SIZE`
- **LLM Batch Size Fix**: Correct `parseLLMBatchSize` logic so `MAX_BATCH_SIZE=0` means "no limit" not "disable batching"

## Impact

- Affected specs: translation-logging, telegram-batch-sending, batch-observability, llm-batch-size-fix
- Affected code:
  - `src/services/translator/summary.ts` - Batch logging, error handling, fallback progress
  - `src/services/translator/title.ts` - Translation prompts
  - `src/services/translator/progress.ts` - Progress tracking utility
  - `src/utils/array.ts` - Robust `parseJsonArray`
  - `src/config/constants.ts` - Batch configuration
  - `src/worker/sources/hackernews.ts` - LLM batch size parsing fix
  - `src/worker/publishers/telegram/formatter.ts` - Message merging
  - `src/worker/publishers/telegram/index.ts` - Batch publishing
