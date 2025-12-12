# Tasks: Add Clean Build Step

## 1. Implementation

- [x] 1.1 Add `clean` npm script to `package.json` that removes the `dist/` directory
- [x] 1.2 Modify `build` script to run `clean` before `tsc`
- [x] 1.3 Test the build process to verify stale artifacts are removed

## 2. Validation

- [x] 2.1 Run `npm run build` and verify `dist/` is recreated cleanly
- [x] 2.2 Run `wrangler deploy` and verify no case-sensitivity warnings appear
