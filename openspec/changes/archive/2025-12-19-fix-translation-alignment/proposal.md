# Change: Fix Batch Translation Data Alignment

## Why
When articles have missing content (e.g., crawl failures), the batch translation system fails to maintain proper data alignment between input articles and translated results. This causes content mismatches where translated summaries/translations are assigned to the wrong articles. The previous approach used `null` values to mark missing content, which required complex index tracking in calling code.

## What Changes
- **MODIFIED** `summarizeContentBatch` to preserve array indices and return empty strings for missing content
- **MODIFIED** `summarizeCommentsBatch` to use empty strings instead of null for missing data
- **MODIFIED** return types from `(string | null)[]` to `string[]` for better clarity
- **MODIFIED** UI layer to handle fallback text ("暂无描述", "暂无评论") for empty strings
- **ADDED** robust index tracking using original indices for filtered content arrays
- **IMPROVED** chunking logic to handle sparse data arrays properly

## Impact
- Affected specs: `batch-translation-service`, `translation-service`
- Affected code: `src/services/translator/summary.ts`, `src/services/translator/index.ts`, `src/worker/sources/hackernews.ts`
- API Changes: Return types changed from `(string | null)[]` to `string[]` (internal API only)
- Behavior: Empty strings now represent missing content instead of null; UI layer handles display fallbacks
- Performance: Minimal impact (index-based mapping); improved correctness guarantees