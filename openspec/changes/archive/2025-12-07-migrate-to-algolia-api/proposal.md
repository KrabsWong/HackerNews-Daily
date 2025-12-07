# Proposal: Migrate to Algolia HackerNews API

## Summary

Migrate from the current HackerNews Firebase API to Algolia's HN Search API to simplify story fetching by date and enable quality-based filtering. The goal is to fetch only the top-rated stories from HN's "best" list for a specific date range.

## Why

The current implementation has several pain points:

1. **Inefficient date-based filtering**: We fetch best stories from Firebase API, then filter by time window client-side, requiring buffered fetches (2.5x-1.5x multiplier) to get enough stories
2. **Multiple API calls**: Each story requires an individual API call to Firebase (`/item/{id}.json`)
3. **Complex fetching logic**: We need to fetch story IDs first, then fetch each story's details, then apply time filtering
4. **No quality filtering**: We cannot efficiently get the highest-rated stories from a specific date range

## What Changes

- Add Algolia HN API integration for efficient batch story fetching
- Implement hybrid approach: Firebase (best story IDs) + Algolia (story details)
- Add date range filtering on fetched stories
- Add score-based sorting to return top N highest-rated stories
- Display story scores in CLI output
- Remove deprecated buffering logic (`calculateFetchBuffer`, `filterByTime`)
- Update error messages for Algolia API

## Proposed Solution

Use a hybrid approach combining Firebase and Algolia APIs:

1. **Firebase API**: Get curated "best" story IDs from `beststories.json`
2. **Algolia API**: Fetch story details efficiently with `search` endpoint
3. **Date filtering**: Filter stories by timestamp to match specified date range
4. **Score-based sorting**: Sort filtered stories by points (score) to get top N

## Implementation Details

### Phase 1: Initial Algolia Integration (Completed)

**Changes to `src/config/constants.ts`:**
- Added `ALGOLIA_HN_API` configuration constants:
  - `BASE_URL`: `https://hn.algolia.com/api/v1`
  - `REQUEST_TIMEOUT`: 10000ms
  - `DEFAULT_HITS_PER_PAGE`: 30
  - `MAX_HITS_PER_PAGE`: 100

**Changes to `src/api/hackerNews.ts`:**
- Added TypeScript interfaces:
  - `AlgoliaStory`: Matches Algolia API response structure
  - `AlgoliaSearchResponse`: Search result wrapper
- Added `mapAlgoliaStoryToHNStory()`: Maps Algolia response to existing `HNStory` interface
- Added `fetchStoriesFromAlgolia()`: Fetches stories with date range filtering

### Phase 2: Score-based Filtering (Completed)

**Changes to `src/api/hackerNews.ts`:**
- Added `fetchTopStoriesByScore()`: Fetches all stories in date range, sorts by score, returns top N
- Updated `fetchTopStories()`: Now uses score-based filtering instead of simple date filtering

**Changes to `src/index.ts`:**
- Updated `displayCards()`: Now displays score alongside timestamp

### Phase 3: Best Stories Integration (Completed)

**Changes to `src/api/hackerNews.ts`:**
- Added `fetchBestStoryIds()`: Fetches curated "best" story IDs from Firebase API
- Added `fetchBestStoriesByDateAndScore()`: 
  1. Gets best story IDs from Firebase (HN's curated list from `/best`)
  2. Fetches story details from Algolia in batches
  3. Filters by date range
  4. Sorts by score (points)
  5. Returns top N stories
- Updated `fetchTopStories()`: Now uses `fetchBestStoriesByDateAndScore()`

### Removed Code
- Removed `fetchBestStories()` (replaced with `fetchBestStoryIds()`)
- Removed `calculateFetchBuffer()` (no longer needed)
- Removed `filterByTime()` (filtering now done server-side/in-memory efficiently)

## Research Findings

### API Comparison

| Feature | Firebase API | Algolia API |
|---------|-------------|-------------|
| Endpoint | `beststories.json` → `/item/{id}.json` | `/search` or `/search_by_date` |
| Requests per 30 stories | 31 (1 list + 30 items) | 2-3 (batched) |
| Date filtering | Client-side | Server-side (`numericFilters`) |
| Story text | Yes (for Ask HN/Show HN) | Yes |
| Author field | `by` | `author` |
| Timestamp | `time` (Unix) | `created_at_i` (Unix) + `created_at` (ISO) |
| Comments count | `descendants` | `num_comments` |
| Best ranking | Yes (curated list) | No (only date/relevance) |

### Field Mapping

```
Firebase API          →  Algolia API
─────────────────────────────────────
id                    →  story_id / objectID
by                    →  author
title                 →  title
url                   →  url
score                 →  points
time                  →  created_at_i
descendants           →  num_comments
text                  →  story_text
type                  →  (implicit via tags filter)
kids                  →  (not provided)
```

### Key Findings

1. **Story text is available**: Algolia provides `story_text` for Ask HN/Show HN posts
2. **No full article content**: Neither API provides article content - we still need Mozilla Readability
3. **Date filtering works**: `numericFilters=created_at_i>TIMESTAMP` effectively filters by date
4. **Best list from Firebase**: Only Firebase provides HN's curated "best" list
5. **Hybrid approach optimal**: Combine Firebase (best IDs) + Algolia (efficient batch details)

### Example Workflow

```
1. Firebase: GET /beststories.json → [id1, id2, id3, ...]  (200 IDs)
2. Algolia:  GET /search?tags=story,(story_id1,story_id2,...) → [story details]
3. Filter:  Keep stories where created_at_i is within date range
4. Sort:    Order by points descending
5. Limit:   Take top 30
```

## Benefits

1. **Quality content**: Only includes stories from HN's curated "best" list
2. **Accurate filtering**: Get exactly top N highest-rated stories from date range
3. **Efficient batching**: Algolia batch queries reduce API calls
4. **Score-based ranking**: Stories sorted by actual score, not just recency
5. **Better user experience**: Score displayed in output for transparency

## Trade-offs

1. **Two API dependencies**: Now uses both Firebase (for best IDs) and Algolia (for details)
2. **Comment fetching unchanged**: Still uses Firebase for comment details
3. **Network requests**: ~3 requests (1 Firebase + 2 Algolia batches) vs previous 31+

## Output Example

```
Fetching HackerNews best stories...
Fetching best story IDs from HackerNews...
Found 200 stories in HN best list
Fetched details for 200 best stories
86 stories match the date range
Found 5 best stories (by score) from the past 24 hours

#1 【GrapheneOS是唯一提供完整安全补丁的Android操作系统】
发布时间：2025-12-06 21:58  |  评分：562
...

#2 【Tiny Core Linux：一款仅23MB带图形桌面的Linux发行版】
发布时间：2025-12-06 22:18  |  评分：415
...
```

## Files Changed

| File | Changes |
|------|---------|
| `src/config/constants.ts` | Added `ALGOLIA_HN_API` configuration |
| `src/api/hackerNews.ts` | Added Algolia types, fetch functions, hybrid best+date+score filtering |
| `src/index.ts` | Updated display to show score; updated error messages |
| `README.md` | Updated API documentation and troubleshooting |

## Success Criteria

- [x] Stories fetched from HN's "best" list only
- [x] Date filtering works accurately
- [x] Stories sorted by score (highest first)
- [x] Top N stories returned (configurable via `HN_STORY_LIMIT`)
- [x] Comments still work via Firebase API
- [x] Score displayed in output
- [x] Documentation updated
