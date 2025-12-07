# Change: Add Daily Export to Markdown Feature

## Why

Users need a way to query and export articles from the previous calendar day (yesterday) as a static markdown file for archival, sharing, or documentation purposes. Currently, the tool only displays results in CLI or web modes without persistent export capability.

## What Changes

- Add new command-line option `--export-daily` to export yesterday's articles
- Query articles by previous calendar day (00:00-23:59) instead of rolling time window
- Generate markdown file with date-based filename (`hackernews-YYYY-MM-DD.md`)
- Store exported files in `TLDR-HackNews24/` directory
- Sort articles by creation time in descending order (newest first)
- **NEW**: Use enhanced markdown format with clear hierarchy:
  - Date as top-level H1 heading (e.g., `# HackerNews Daily - 2025-12-06`)
  - Each article as H2 section with rank number (e.g., `## 1. 【Chinese Title】`)
  - Metadata displayed with clear labels and proper line breaks
  - Article information organized into subsections: title, metadata, description, and comments
  - Horizontal rules between articles for visual separation
- Support combination with existing `--no-cache` flag for fresh data

## Impact

- **New capability**: Daily export functionality (no existing specs affected)
- **Affected code**:
  - `src/index.ts`: Add export mode handling and date filtering logic
  - `src/api/hackerNews.ts`: May need date range filtering helper (or reuse existing)
  - New module for markdown generation (e.g., `src/services/markdownExporter.ts`)
- **Files created**: Markdown files in `TLDR-HackNews24/` directory
- **Backward compatibility**: Existing CLI and web modes remain unchanged
