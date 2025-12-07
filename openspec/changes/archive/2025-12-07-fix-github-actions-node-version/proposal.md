# Change: Fix GitHub Actions Node.js Version Compatibility

## Why

GitHub Actions workflow is failing with `ReferenceError: File is not defined` error when executing the daily export. The error occurs in `node_modules/undici/lib/web/webidl/index.js:531:48` during manual workflow execution.

**Root Cause**: The project uses `jsdom@27.2.0` which depends on `undici@^7.12.0`. The `undici` library requires the `File` global object, which was only introduced in Node.js 20+. The current workflow uses Node.js 18, which lacks this global object, causing the runtime error.

## What Changes

- **Update Node.js version** from 18 to 20 in GitHub Actions workflow configuration
- Ensures compatibility with `jsdom@27.2.0` and its `undici` dependency
- Maintains all existing workflow functionality

## Impact

- **Affected specs**: `github-actions-workflow`
- **Affected code**: `.github/workflows/daily-export.yml`
- **Breaking**: No - this is a non-breaking infrastructure update
- **Risk**: Low - Node.js 20 is LTS and backward compatible with code targeting Node.js 18
