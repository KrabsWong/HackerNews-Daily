# Implementation Tasks

## 1. Update Markdown Export Service
- [x] 1.1 Add `generateJekyllFrontMatter` function to create YAML front matter block
- [x] 1.2 Update `generateMarkdownContent` to prepend front matter before existing content
- [x] 1.3 Update `generateFilename` to use new format `YYYY-MM-DD-daily.md` instead of `hackernews-YYYY-MM-DD.md`
- [x] 1.4 Update export folder name from `TLDR-HackNews24` to `hacknews-export`
- [x] 1.5 Add unit tests or manual verification for front matter generation

## 2. Update GitHub Actions Workflow
- [x] 2.1 Update repository URL from `KrabsWong/TLDR-HackNews24` to `KrabsWong/tldr-hacknews-24`
- [x] 2.2 Update destination path from repository root to `_posts/` directory
- [x] 2.3 Update filename variable from `hackernews-${YESTERDAY}.md` to `${YESTERDAY}-daily.md`
- [x] 2.4 Update source folder from `TLDR-HackNews24` to `hacknews-export`
- [x] 2.5 Verify workflow can access target repository with existing token

## 3. Testing and Validation
- [x] 3.1 Test local export with `npm run fetch -- --export-daily` to verify front matter format
- [x] 3.2 Verify exported file has correct Jekyll front matter structure
