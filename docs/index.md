# Documentation Index

## Available Guides

### Getting Started
- **[Quick Start Guide](./quick-start.md)** ⭐ - Get up and running in 5 minutes
  - Prerequisites setup
  - D1 database creation and initialization
  - wrangler configuration
  - Local testing and verification
  - Production deployment

### Configuration
- **[Configuration Guide](./configuration.md)** - Complete configuration reference
  - D1 database settings
  - Task processing options
  - LLM provider setup
  - Story fetching and content processing
  - GitHub/Telegram publishing configuration
  - Cron scheduling and performance tuning

### API Reference
- **[API Endpoints](./api-endpoints.md)** - HTTP API documentation
  - Health check endpoint (`GET /`)
  - Trigger export (async/sync)
  - Task status endpoint (`GET /task-status`)
  - Retry failed tasks endpoint (`POST /retry-failed-tasks`)
  - Force publish endpoint (`POST /force-publish`)
  - Error handling and rate limiting

### Deployment
- **[Cloudflare Worker Deployment](./cloudflare-worker-deployment.md)** - Production deployment
  - Wrangler CLI setup
  - Environment variable configuration
  - Secret management

### Database Management
- **[D1 Database Management](./d1-database-management.md)** - Database operations
  - Two-database strategy (production/dev)
  - Schema reference
  - Common queries
  - Performance monitoring
  - Backup and maintenance

### Development
- **[Local Development Guide](./local-development.md)** - Local testing
  - Development environment setup
  - Database isolation for safe testing
  - Testing HTTP endpoints
  - Debugging techniques and tools

### Monitoring & Logging
- **[Logging Guide](./logging.md)** - Observability
  - Real-time log streaming
  - Cloudflare dashboard monitoring
  - Error tracking and debugging
  - Performance metrics

### Testing
- **[Testing Guide](./TESTING.md)** - Testing standards
  - Test coverage requirements
  - Mock infrastructure
  - Test organization
  - Writing new tests

## Quick Navigation

| What you want to do | Read this |
|---------------------|-----------|
| Set up and deploy for first time | [Quick Start Guide](./quick-start.md) ⭐ |
| Change configuration | [Configuration Guide](./configuration.md) |
| Learn about API endpoints | [API Endpoints](./api-endpoints.md) |
| Deploy to production | [Cloudflare Worker Deployment](./cloudflare-worker-deployment.md) |
| Manage D1 database | [D1 Database Management](./d1-database-management.md) |
| Test locally | [Local Development Guide](./local-development.md) |
| View logs and metrics | [Logging Guide](./logging.md) |
| Write tests | [Testing Guide](./TESTING.md) |

## Documentation Standards

### Language
- **Primary**: Simplified Chinese - For user guides
- **Secondary**: English - For technical terms, code, and API references

### Style Guide
- Use clear, concise language
- Include code examples for all procedures
- Add expected output/error messages
- Use tables for configuration options and comparisons
- Include troubleshooting sections

### Links
- Use relative paths for internal docs: `[Other Guide](./other-guide.md)`
- Use absolute URLs for external resources: `https://example.com`
- Test all links before committing

## Maintenance

### Keeping Docs Updated
- **When code changes**: Update related documentation sections
- **After feature adds**: Create new guides or update existing ones
- **Before releases**: Review all docs for accuracy
- **Regularly**: Check for outdated content or broken links

### Outdated Content
Remove documentation that is:
- Referencing deprecated features
- About removed functionality
- Replaced by newer guides
- No longer relevant to codebase

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/hackernews-daily/issues)
- **Documentation PRs**: Welcome contributions to improve clarity
- **Questions**: Open an issue for documentation-related questions

---

**Last Updated**: 2026-01-04
