# Proposal: Add Story Summaries and Enhanced Display Format

## Overview
This change enhances the HackerNews daily tool by adding article summaries (100-200 characters) and replacing the table display format with a more readable card-based layout that better utilizes screen space.

## Problem Statement
The current implementation has two key limitations:

1. **Limited Context**: Only titles are displayed, requiring users to visit links to understand article content
2. **Poor Space Utilization**: Table format with fixed column widths wastes space and truncates content unnecessarily

## Proposed Solution

### 1. Article Summary Fetching
- Fetch original article content from story URLs
- Extract summary from meta description tags (`<meta name="description">`, `<meta property="og:description">`)
- Handle anti-crawling failures gracefully (display "暂无描述" when fetch fails)
- Add timeout and retry logic to prevent hanging

### 2. Enhanced Display Format
Replace table layout with card-based format showing:
- **Line 1**: Chinese title (translated)
- **Line 2**: English title (original)
- **Line 3**: Publication time in absolute format (YYYY-MM-DD HH:mm)
- **Line 4**: URL
- **Line 5**: Summary/description in Chinese (translated from meta description)

Each story separated by visual dividers for clarity.

## Capabilities Affected

### New Capability
- **article-fetcher**: Fetches and extracts article metadata from original URLs

### Modified Capabilities
- **cli-interface**: Changes display format from table to card-based layout
- **translation-service**: Extends to translate article summaries in addition to titles

### Related Existing Capabilities
- **hn-api-fetcher**: Provides story data including URLs (no changes needed)

## Benefits
1. Users get context about articles without visiting links
2. Better screen space utilization with multi-line card format
3. Timestamp visibility helps users understand recency
4. More professional and readable output format

## Risks and Mitigations
- **Risk**: Article fetching may slow down overall execution
  - **Mitigation**: Implement parallel fetching with reasonable timeout (5s per article)
- **Risk**: Anti-crawling mechanisms may block requests
  - **Mitigation**: Graceful fallback to "暂无描述" without breaking execution
- **Risk**: Summary translation increases API costs
  - **Mitigation**: Only translate when description is successfully fetched

## Scope
- Add article content fetching service
- Modify display rendering logic
- Extend translation service for summaries
- Update error handling for fetch failures
- Does NOT include: caching, user-agent rotation, or proxy support (can be added later if needed)

## Dependencies
- Requires HTML parsing library (e.g., cheerio or jsdom)
- No breaking changes to existing APIs or data structures
