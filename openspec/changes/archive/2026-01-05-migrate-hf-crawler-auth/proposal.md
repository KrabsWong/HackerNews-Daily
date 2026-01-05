# Proposal: Migrate to Hugging Face Spaces Crawler with Bearer Token Authentication

## Problem Statement

The current crawler service needs to be migrated to a new implementation deployed on Hugging Face Spaces. The new service is private and requires Bearer token authentication for API access. Key changes:

1. **New Service URL**: `https://your-crawl-url`
2. **Authentication Required**: Must include `Authorization: Bearer <TOKEN>` header
3. **Security Requirement**: Token must be stored as Cloudflare secret, not hardcoded
4. **Old Service Removal**: Previous crawler service is deprecated and should be removed

## Proposed Solution

Update the crawler API integration to support Bearer token authentication and migrate to the new Hugging Face Spaces service. This includes:

1. Add `CRAWLER_API_TOKEN` environment variable for the authentication token
2. Update crawler API request logic to include Authorization header when token is provided
3. Update environment variable documentation to reflect the new required token
4. Maintain backward compatibility - if token is not provided, requests proceed without auth (for potential future use with public services)

## Capabilities Affected

- `article-fetcher` - Update crawler API client to support Bearer token authentication
- `constants-config` - Add CRAWLER_API_TOKEN environment variable configuration

## Implementation Approach

### Changes to `src/services/articleFetcher/crawler.ts`

```typescript
// Add token parameter to function signature
export async function fetchWithCrawlerAPI(
  url: string,
  crawlerApiUrl?: string,
  crawlerApiToken?: string  // NEW: Optional token parameter
): Promise<{ content: string | null; description: string | null }> {
  if (!crawlerApiUrl) {
    return { content: null, description: null };
  }

  let response;
  try {
    // NEW: Build headers with Authorization if token provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (crawlerApiToken) {
      headers['Authorization'] = `Bearer ${crawlerApiToken}`;
    }

    response = await post<{
      success: boolean;
      markdown?: string;
      error?: string;
    }>(
      `${crawlerApiUrl}/crawl`,
      { url },
      {
        timeout: 10000,
        headers,  // NEW: Include headers with auth
      }
    );
  } catch (error) {
    // ... existing error handling
  }
  // ... rest of function unchanged
}
```

### Changes to `src/types/worker.ts`

```typescript
export interface Env {
  // ... existing fields
  CRAWLER_API_URL?: string;
  CRAWLER_API_TOKEN?: string;  // NEW: Authentication token for crawler API
  // ... rest of fields
}
```

### Changes to `.dev.vars.example`

```bash
# Crawler API Configuration (optional)
# Fallback content extraction service
# CRAWLER_API_URL=https://yiiiiiha-tiny-crawl.hf.space
# CRAWLER_API_TOKEN=your_hf_token_here  # NEW: Token for private HF Space
```

## Benefits

- **Security**: Tokens stored as secrets, never in code
- **Compatibility**: Works with private Hugging Face Spaces
- **Flexibility**: Supports both authenticated and unauthenticated crawler services
- **Maintainability**: Simple, minimal change to existing codebase

## Risks and Mitigations

**Risk**: Token not configured leads to 401/403 errors
- **Mitigation**: Clear error logging when authentication fails; documentation clearly states token is required for HF Spaces service

**Risk**: Token exposure in logs or errors
- **Mitigation**: Never log the token value; only log "Authorization header present/absent"

## Migration Steps for Users

1. Set new `CRAWLER_API_URL`: `https://yiiiiiha-tiny-crawl.hf.space`
2. Set new `CRAWLER_API_TOKEN` secret using wrangler:
   ```bash
   npx wrangler secret put CRAWLER_API_TOKEN
   # Enter your Hugging Face token when prompted
   ```
3. Old crawler service can be decommissioned after migration

## Testing Plan

1. **Unit Tests**: Update crawler.ts tests to verify Authorization header is included when token provided
2. **Integration Tests**: Test with real HF Spaces endpoint (optional, in integration test mode)
3. **Manual Testing**: Verify crawler works with token in local dev and production

## Alternatives Considered

1. **API Key in URL query parameter**: Rejected due to security concerns (URL logging)
2. **Custom header (e.g., X-API-Key)**: Rejected in favor of standard Authorization header
3. **Hardcode token**: Rejected due to security and flexibility concerns

## Documentation Updates

- Update `.dev.vars.example` with token configuration
- Update `docs/cloudflare-worker-deployment.md` with wrangler secret setup for token
- Update `README.md` if it mentions crawler configuration

## Success Criteria

- [ ] Crawler requests include Authorization header when token is configured
- [ ] Requests succeed with new HF Spaces service URL
- [ ] Token is never logged or exposed in code
- [ ] Backward compatible with services that don't require auth
- [ ] All tests pass
- [ ] Documentation is updated
