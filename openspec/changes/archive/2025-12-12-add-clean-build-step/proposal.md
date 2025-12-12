# Change: Add Clean Build Step to Prevent Case-Sensitive File System Issues

## Why

The TypeScript build process (`tsc`) does not automatically clean the `dist/` directory before compiling. This leads to stale build artifacts (e.g., `hackerNews.js`) remaining alongside renamed files/directories (e.g., `hackernews/`), causing case-sensitivity warnings during `wrangler deploy`:

```
▲ [WARNING] Use "dist/api/hackerNews.js" instead of "dist/api/hackernews.js" 
  to avoid issues with case-sensitive file systems [different-path-case]
```

This is particularly problematic because:
1. macOS (default HFS+) is case-insensitive, masking the issue during local development
2. Linux (Cloudflare Workers runtime) is case-sensitive, causing potential import failures
3. Stale artifacts pollute the build output and increase bundle size

## What Changes

- **MODIFIED**: The `build` script in `package.json` SHALL clean the `dist/` directory before running TypeScript compilation
- **ADDED**: A `clean` npm script for manually removing build artifacts

## Impact

- **Affected specs**: `worker-deployment-tooling` (Build Script Integration requirement)
- **Affected code**: `package.json` (scripts section)
- **Risk**: Low - only affects build process, no runtime changes
- **Migration**: None required - existing workflows continue to work
