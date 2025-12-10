# Change: Improve Translation Term Preservation and Beijing Timezone Support

## Why
Currently the system has two issues affecting content accuracy and usability:

1. **Translation Quality**: Technical terms and proper nouns (e.g., "Model Context Protocol", "TypeScript", "AWS") are translated literally to Chinese instead of being preserved or using standard abbreviations (e.g., "MCP" or "MCP协议"). This reduces readability for technical audiences familiar with these terms.

2. **Timezone Inconsistency**: The GitHub Action runs at 16:20 UTC (00:20 Beijing time), but date calculations use UTC timezone. This causes:
   - Generated markdown filenames to use UTC dates instead of Beijing dates
   - Article time ranges to span incorrect Beijing time boundaries
   - Display timestamps to potentially confuse Chinese users expecting Beijing time

## What Changes
- **Translation Service**: Add intelligent term preservation to detect and preserve technical terms, acronyms, and common technical terminology during translation
- **Timezone Handling**: Migrate all date/time calculations from UTC to Beijing timezone (UTC+8), including:
  - Previous day boundary calculations
  - Markdown filename generation
  - Article timestamp display formatting
  - Time range filtering for daily exports

## Impact
- Affected specs: `translation-service`, `daily-export`
- Affected code:
  - `src/services/translator.ts` (translation logic)
  - `src/index.ts` (date boundary calculations, timestamp formatting)
  - `src/services/markdownExporter.ts` (filename generation)
  - `.github/workflows/daily-export.yml` (documentation update for cron time)
