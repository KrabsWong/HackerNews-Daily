# Proposal: Add Cloudflare Workers Deployment

## Change ID
`add-cloudflare-workers-deployment`

## Summary
Replace GitHub Actions with Cloudflare Workers for daily HackerNews export automation. This change provides a serverless, cost-effective alternative using Cloudflare's free tier resources (100,000 requests/day, 10ms CPU time per request on free plan, with Workers Cron Triggers for scheduling).

## Why
The current GitHub Actions-based daily export has several limitations that impact reliability and flexibility. GitHub Actions provides only 2,000 free minutes per month, requires full environment setup on each run (checkout, Node.js installation, npm ci), and depends entirely on GitHub's infrastructure availability. This creates unnecessary overhead and a single point of failure.

Cloudflare Workers offers a more suitable platform for this use case: generous free tier (100,000 requests/day), fast cold starts (<50ms vs. 10-30 seconds), global edge network for low latency, and built-in cron triggers. The serverless architecture eliminates server maintenance while providing better scalability and cost efficiency. By moving to Workers, we gain independence from GitHub's CI/CD infrastructure while maintaining the ability to push results to the GitHub repository via API.

## Motivation

### Current Limitations
- **GitHub Actions dependency**: Requires GitHub infrastructure and runner availability
- **Limited free tier**: 2,000 minutes/month for free accounts (approximately 66 minutes/day)
- **Cold start overhead**: Each run requires full environment setup (checkout, Node.js installation, npm ci)
- **No geographic flexibility**: Runners execute in GitHub's data centers
- **Single point of failure**: Entire pipeline depends on GitHub Actions availability

### Benefits of Cloudflare Workers
1. **Generous free tier**: 100,000 requests/day, sufficient for daily automation
2. **Global edge network**: Low latency execution from worldwide locations
3. **Serverless architecture**: No server maintenance or infrastructure management
4. **Built-in scheduling**: Cron Triggers integrated with Workers platform
5. **Cost efficiency**: Free tier covers expected usage (1 daily execution + occasional manual triggers)
6. **Fast cold starts**: Workers start in <50ms vs. GitHub Actions' 10-30 second setup time

## Scope

### In Scope
1. **Cloudflare Worker implementation**: Daily export execution with scheduled triggers
2. **GitHub integration**: Direct API calls to push generated Markdown files to tldr-hacknews-24 repository
3. **Configuration management**: Environment variables and secrets via Cloudflare dashboard/Wrangler
4. **Deployment tooling**: Wrangler CLI integration for local development and deployment
5. **Monitoring & logging**: Basic execution logs and error tracking via Cloudflare dashboard

### Out of Scope
- Tencent Cloud Lighthouse or SCF (Cloud Functions) deployment (user selected Cloudflare Workers)
- Multi-platform abstraction layer (single target: Cloudflare Workers)
- Migration of CLI/Web UI modes to serverless (only Daily Export automation)
- Real-time or high-frequency execution (daily schedule sufficient)

## Dependencies
- Existing capabilities:
  - `daily-export`: Core export logic (openspec/specs/daily-export/spec.md)
  - `story-fetching`: HackerNews API integration
  - `translation-service`: DeepSeek LLM translation
  - `content-filtering`: Optional AI filtering
- External services:
  - Cloudflare Workers platform account
  - GitHub Personal Access Token for repository push
  - DeepSeek API key (existing)

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cloudflare Workers CPU time limits (10ms free tier) | High - May fail on large exports | Medium | Bundle optimization, async processing, upgrade to paid plan if needed ($5/month for 10ms → 50ms) |
| GitHub API rate limiting | Medium - Push failures | Low | Implement exponential backoff, use conditional requests |
| Cold start latency on scheduled runs | Low - Delayed execution | Low | Workers warm up quickly (<50ms), acceptable for daily batch |
| Environment variable size limits (5KB per variable) | Low - Configuration truncation | Very Low | Current .env.example is ~3KB, well within limits |
| Wrangler deployment complexity | Medium - Developer friction | Low | Provide clear documentation, npm scripts, CI/CD examples |

## Success Criteria
1. **Functional parity**: Worker successfully executes daily export and pushes to tldr-hacknews-24
2. **Reliability**: ≥99% success rate over 30-day period
3. **Performance**: End-to-end execution completes within 5 minutes (current: 2.5-3.5 min + GitHub Actions overhead)
4. **Cost**: Stays within Cloudflare Workers free tier limits
5. **Maintainability**: Deployment and configuration updates require <10 minutes

## Open Questions
1. **Bundling strategy**: Should we use esbuild/Rollup to bundle dependencies, or use Workers' module system directly?
   - *Recommendation*: Use esbuild for smaller bundle size and faster cold starts
2. **Secrets management**: Use Cloudflare's built-in secrets or external secret manager (e.g., Doppler)?
   - *Recommendation*: Start with Cloudflare secrets, migrate to external if team expands
3. **Error notification**: How should failures be reported? (Email, Slack, Discord, logging only?)
   - *Recommendation*: Start with Cloudflare logging, add optional webhook notification in tasks.md
4. **Backward compatibility**: Should GitHub Actions workflow be preserved as fallback?
   - *Recommendation*: Keep workflow file with manual trigger only, document migration in README

## Related Changes
None (initial implementation)

## References
- Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
- Workers Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/
- GitHub API (create/update file): https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents
