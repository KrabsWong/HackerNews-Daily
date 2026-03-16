# Change: Add jina.ai as Alternative Crawler Provider

## Why

The current system uses a self-hosted Crawler API for article content extraction. While effective, it requires users to deploy and maintain their own crawler service. Adding support for jina.ai's `r.jina.ai` service provides:

1. **Zero-setup option**: Users can use jina.ai without deploying any infrastructure
2. **Improved reliability**: Fallback to a managed service with high availability
3. **Simpler onboarding**: New users can get started immediately without crawler setup
4. **Cost flexibility**: Users can choose between self-hosted (compute cost) vs managed service (rate limits)

## What Changes

- Add `CRAWLER_PROVIDER` environment variable to select between `crawler` (existing) and `jina` (new)
- Create `jina.ts` module for jina.ai API integration
- Refactor `metadata.ts` to support pluggable crawler providers
- Update configuration schema, constants, and types
- Maintain backward compatibility (default to existing crawler behavior)

## Impact

- **Affected specs**: article-fetcher
- **Affected code**: 
  - `src/services/articleFetcher/` - Add jina.ts, refactor metadata.ts
  - `src/config/` - Add provider selection logic
  - `src/types/` - Add provider type definition
- **Breaking changes**: None (fully backward compatible)

## References

- jina.ai Reader API: https://r.jina.ai/https://URL
- Documentation: https://github.com/jina-ai/reader
