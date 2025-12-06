# Proposal: Fix Story Count and Add Request Limits

## Problem
Users configure `HN_STORY_LIMIT=30` but receive only 8 stories in the output. This discrepancy has two root causes:

1. **Time Window Filter Too Restrictive**: The 24-hour time window filter (`HN_TIME_WINDOW_HOURS=24`) eliminates most stories after they're fetched, reducing the final count from 30 to ~8 stories
2. **No Input Validation**: Users can set arbitrarily large limits (e.g., 100+) which may cause performance issues, API rate limiting, or excessive processing time without warning

## Proposed Solution
1. **Fetch More Stories Initially**: Adjust the fetching strategy to request more stories from the API to compensate for time-based filtering, ensuring the user receives approximately the requested number after filtering
2. **Add Limit Validation**: Validate `HN_STORY_LIMIT` at startup and warn users when their requested limit exceeds the recommended maximum (50), automatically capping it at the system's safe maximum (30)
3. **Improve User Feedback**: Provide clear console messages about story filtering and limit adjustments

## Goals
- Ensure users receive close to their requested number of stories (within time window constraints)
- Prevent performance issues from excessive story requests
- Maintain clear communication about filtering and limits

## Non-Goals
- Changing the time window filtering logic (users still control this via `HN_TIME_WINDOW_HOURS`)
- Implementing pagination or incremental fetching
- Adding configuration for the maximum limit (hardcoded at 30 for safety)

## Affected Components
- `src/index.ts` - Main CLI entry point (limit validation)
- `src/api/hackerNews.ts` - Story fetching logic (adaptive fetch strategy)
- `openspec/specs/hn-api-fetcher/spec.md` - Updated requirements
- `openspec/specs/cli-interface/spec.md` - New validation requirements

## Success Criteria
- When `HN_STORY_LIMIT=30` with default 24h window, user receives 25-30 stories (not 8)
- When `HN_STORY_LIMIT=60`, system warns user and caps at 30 stories
- Clear console output explains filtering and limit adjustments
- No breaking changes to existing configuration format
