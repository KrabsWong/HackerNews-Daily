# Tasks: Migrate to Algolia HackerNews API

## Implementation Order

Tasks are ordered to deliver incremental value while maintaining backward compatibility.

---

## Phase 1: Setup and Configuration (Completed)

### 1. Add Algolia API configuration constants

**Status**: ✅ Completed

**Details**:
- [x] Added `ALGOLIA_HN_API` constants to `src/config/constants.ts`
- [x] Defined base URL, timeout, pagination defaults
- [x] Kept existing `HN_API` constants for comment fetching

---

### 2. Create Algolia API client types

**Status**: ✅ Completed

**Details**:
- [x] Defined `AlgoliaStory` interface matching API response
- [x] Defined `AlgoliaSearchResponse` interface

---

## Phase 2: Core Implementation (Completed)

### 3. Implement Algolia story fetching function

**Status**: ✅ Completed

**Details**:
- [x] Created `fetchStoriesFromAlgolia()` in `src/api/hackerNews.ts`
- [x] Uses `search_by_date` endpoint with `numericFilters`
- [x] Handles pagination for large result sets
- [x] Maps Algolia response to `HNStory[]` array
- [x] Comprehensive error handling

---

### 4. Add response mapping function

**Status**: ✅ Completed

**Details**:
- [x] Created `mapAlgoliaStoryToHNStory(algoliaStory: AlgoliaStory): HNStory`
- [x] Maps: `story_id`→`id`, `author`→`by`, `points`→`score`, `created_at_i`→`time`
- [x] Handles optional fields (`url`)

---

## Phase 3: Score-based Filtering (Completed)

### 5. Implement score-based sorting

**Status**: ✅ Completed

**Details**:
- [x] Created `fetchTopStoriesByScore()` function
- [x] Fetches all stories in date range (up to 10 pages / 1000 stories)
- [x] Sorts by `points` (score) descending
- [x] Returns top N highest-rated stories

---

### 6. Update display to show scores

**Status**: ✅ Completed

**Details**:
- [x] Updated `displayCards()` in `src/index.ts`
- [x] Shows: `发布时间：{time}  |  评分：{score}`

---

## Phase 4: Best Stories Integration (Completed)

### 7. Implement best stories fetching from Firebase

**Status**: ✅ Completed

**Details**:
- [x] Created `fetchBestStoryIds()` to get curated best list from Firebase
- [x] Uses `GET /beststories.json` endpoint
- [x] Returns array of ~200 story IDs

---

### 8. Implement hybrid best + date + score filtering

**Status**: ✅ Completed

**Details**:
- [x] Created `fetchBestStoriesByDateAndScore()` function
- [x] Step 1: Get best story IDs from Firebase
- [x] Step 2: Fetch details from Algolia in batches of 100
- [x] Step 3: Filter by date range (`created_at_i`)
- [x] Step 4: Sort by score descending
- [x] Step 5: Return top N stories

---

### 9. Update fetchTopStories to use hybrid approach

**Status**: ✅ Completed

**Details**:
- [x] Updated `fetchTopStories()` to call `fetchBestStoriesByDateAndScore()`
- [x] Removed calls to deprecated functions

---

## Phase 5: Cleanup (Completed)

### 10. Remove unused functions

**Status**: ✅ Completed

**Details**:
- [x] Removed `calculateFetchBuffer()` - no longer needed
- [x] Removed `filterByTime()` - replaced by in-memory filtering
- [x] Kept `fetchStoryDetails()` for comment fetching

---

### 11. Update error messages

**Status**: ✅ Completed

**Details**:
- [x] Updated error messages to reference Algolia API
- [x] Added rate limit error handling
- [x] Updated troubleshooting messages in `src/index.ts`

---

### 12. Update documentation

**Status**: ✅ Completed

**Details**:
- [x] Updated `README.md` with Algolia API info
- [x] Updated troubleshooting section
- [x] Updated API documentation section
- [x] Updated proposal.md with all changes

---

## Success Criteria

- [x] Stories fetched from HN's "best" list only
- [x] Date filtering works accurately
- [x] Stories sorted by score (highest first)
- [x] Top N stories returned (configurable via `HN_STORY_LIMIT`)
- [x] Comments still work via Firebase API
- [x] Score displayed in output
- [x] All existing functionality preserved
- [x] Documentation updated

## Example Output

```
Fetching HackerNews best stories...
Fetching best story IDs from HackerNews...
Found 200 stories in HN best list
Fetched details for 200 best stories
86 stories match the date range
Found 5 best stories (by score) from the past 24 hours

#1 【GrapheneOS...】
发布时间：2025-12-06 21:58  |  评分：562
...
```

## Files Changed

| File | Changes |
|------|---------|
| `src/config/constants.ts` | Added `ALGOLIA_HN_API` configuration |
| `src/api/hackerNews.ts` | Added types, hybrid fetch functions, removed deprecated functions |
| `src/index.ts` | Updated display to show score; updated error messages |
| `README.md` | Updated API docs and troubleshooting |
