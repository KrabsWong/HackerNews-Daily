# Implementation Tasks

## Phase 1: Input Validation (story-limit-validation)

### Task 1.1: Add limit validation constants
- [x] Define `MAX_STORY_LIMIT = 30` constant in `src/index.ts`
- [x] Define `WARN_THRESHOLD = 50` constant for warning users
- [x] Add comments explaining performance rationale

**Validation:** Constants are defined and exported for testing

### Task 1.2: Implement limit validation function
- [x] Create `validateStoryLimit(requested: number): number` function in `src/index.ts`
- [x] Check if requested limit exceeds `WARN_THRESHOLD`
- [x] Display warning message when limit is capped
- [x] Return the validated/capped limit value

**Validation:** Unit tests pass for various input values (0, 25, 50, 60, 100, NaN)

### Task 1.3: Integrate limit validation in main()
- [x] Call `validateStoryLimit()` after parsing `HN_STORY_LIMIT` environment variable
- [x] Use validated limit instead of raw parsed value
- [x] Update console output to show adjusted limit

**Validation:** Run CLI with `HN_STORY_LIMIT=60` and verify warning appears and 30 stories are processed

## Phase 2: Adaptive Fetching (story-fetch-reliability)

### Task 2.1: Add buffer calculation logic
- [x] Create `calculateFetchBuffer(requestedLimit: number, timeWindowHours: number): number` function in `src/api/hackerNews.ts`
- [x] Apply 2.5x multiplier for time windows ≤ 24 hours
- [x] Apply 1.5x multiplier for time windows > 24 hours
- [x] Cap total fetches at 100 stories maximum
- [x] Add logging for buffer calculations

**Validation:** Unit tests verify buffer calculations for various inputs

### Task 2.2: Update fetchTopStories to use adaptive buffering
- [x] Modify `fetchTopStories(limit: number, timeWindowHours: number)` to call `calculateFetchBuffer()`
- [x] Use buffered limit when slicing story IDs
- [x] Log both requested and buffered limits for transparency

**Validation:** Integration test fetches stories and verifies buffer is applied correctly

### Task 2.3: Add result count advisory messages
- [x] After filtering, check if result count is significantly lower than requested (< 50% of requested)
- [x] Display advisory message suggesting configuration adjustments
- [x] Ensure message is helpful and not alarming

**Validation:** Run CLI with restrictive time window and verify advisory appears

## Phase 3: Improve Console Feedback

### Task 3.1: Enhance startup messages
- [x] Update initial log to show "Fetching up to {limit} stories from the past {hours} hours"
- [x] Ensure limit shown reflects validated/capped value

**Validation:** Run CLI and verify startup message is clear and accurate

### Task 3.2: Update completion messages
- [x] Modify final success message to show actual count retrieved
- [x] Add advisory for low counts relative to request

**Validation:** Run CLI with various configurations and verify appropriate messages appear

## Phase 4: Documentation & Testing

### Task 4.1: Update .env.example comments
- [x] Add comment explaining the 30-story safe maximum
- [x] Document that values above 50 will be capped with warning

**Validation:** Review .env.example for clarity

### Task 4.2: Update README if applicable
- [x] Add troubleshooting section about story count discrepancies
- [x] Explain time window filtering impact

**Validation:** README is clear and helpful

### Task 4.3: Manual end-to-end testing
- [x] Test with `HN_STORY_LIMIT=30` and `HN_TIME_WINDOW_HOURS=24` → expect ~25-30 stories
- [x] Test with `HN_STORY_LIMIT=60` → expect warning and 30 stories
- [x] Test with `HN_STORY_LIMIT=10` → expect ~10 stories, no warning
- [x] Test with very restrictive time window (e.g., 2 hours) → expect advisory message

**Validation:** All test scenarios produce expected behavior

## Dependencies & Parallelization
- Phase 1 and Phase 2 can be developed in parallel (independent changes)
- Phase 3 depends on both Phase 1 and Phase 2 being complete
- Phase 4 can start once Phase 1-3 are complete

## Rollback Plan
If issues arise:
1. Revert to fetching exact requested limit (remove buffer logic)
2. Keep validation logic as it provides safety without changing behavior significantly
3. Fall back to simpler warning messages if advisories cause confusion
