# Documentation

This directory contains user-facing documentation for the HackerNews Daily project.

## Available Guides

### Deployment

- **[cloudflare-worker-deployment.md](./cloudflare-worker-deployment.md)** - Complete guide for deploying the daily export automation to Cloudflare Workers as an alternative to GitHub Actions. Includes setup instructions, configuration details, troubleshooting, and migration from GitHub Actions.

## Documentation Organization

- **User guides and deployment instructions** → `docs/`
- **Technical specifications** → `openspec/specs/`
- **Change proposals and archives** → `openspec/changes/`
- **API documentation** → Auto-generated from code comments

## Contributing

When adding new documentation:

1. **User-facing guides** (deployment, usage, tutorials) should go in `docs/`
2. **Technical specs** (requirements, architecture) should go in `openspec/specs/`
3. **Change documentation** should be part of the OpenSpec change process in `openspec/changes/`

Use lowercase with hyphens for filenames (e.g., `my-new-guide.md`) for consistency.
