# Implementation Tasks

## 1. Translation Term Preservation

- [x] 1.1 Update `translator.ts::translateTitle()` prompt to include term preservation instructions
- [x] 1.2 Add examples of terms to preserve in the prompt (programming languages, cloud services, technical acronyms, product names)
- [x] 1.3 Specify standard Chinese abbreviations where appropriate (e.g., "MCP协议" for "Model Context Protocol")
- [x] 1.4 Test translation with various technical titles to verify term preservation
- [x] 1.5 Verify existing translation fallback behavior still works correctly

## 2. Beijing Timezone Support

- [x] 2.1 Create timezone utility functions in a new file or existing module:
  - Function to get Beijing time Date object
  - Function to convert Unix timestamp to Beijing time string
  - Function to get previous day boundaries in Beijing timezone
- [x] 2.2 Update `index.ts::getPreviousDayBoundaries()` to use Beijing timezone (UTC+8) instead of UTC
- [x] 2.3 Update `index.ts::formatTimestamp()` to convert Unix timestamp to Beijing timezone
- [x] 2.4 Update `markdownExporter.ts::generateFilename()` to use Beijing date calculation
- [x] 2.5 Update `markdownExporter.ts::formatDateForDisplay()` to use Beijing timezone
- [x] 2.6 Update `markdownExporter.ts::generateJekyllFrontMatter()` to use Beijing date
- [x] 2.7 Verify time zone conversion handles edge cases (leap seconds, DST - though China doesn't use DST)

## 3. Documentation Updates

- [x] 3.1 Update `.github/workflows/daily-export.yml` comments to clarify that cron time is UTC but system uses Beijing time internally
- [x] 3.2 Add comment explaining the timezone conversion (16:20 UTC = 00:20 Beijing time next day)
- [x] 3.3 Update README or relevant documentation to mention Beijing timezone usage

## 4. Testing and Validation

- [x] 4.1 Test translation with titles containing:
  - Programming language names (TypeScript, Python, Rust, Go)
  - Cloud service names (AWS, Azure, GCP)
  - Technical acronyms (API, HTTP, GPU, LLM, AI, ML)
  - Product names (GitHub, OpenAI, Model Context Protocol)
- [x] 4.2 Verify timezone conversion correctness:
  - Test filename generation matches Beijing date
  - Test article timestamp display shows Beijing time
  - Test previous day boundary calculation for Beijing timezone
  - Verify articles fall within correct Beijing date range
- [x] 4.3 Run full export pipeline to ensure no regressions
- [x] 4.4 Verify Jekyll front matter dates use Beijing timezone
- [x] 4.5 Check that existing CLI and web modes still function correctly
