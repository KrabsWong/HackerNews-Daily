# Design Document: Fix Story Count and Add Request Limits

## Overview
This change addresses the discrepancy between requested and returned story counts by implementing input validation and adaptive fetching strategies. The solution balances user expectations with system performance constraints.

## Root Cause Analysis

### Problem 1: Time Window Filter Reduces Results
The current implementation fetches exactly N stories, then filters them by time window:
```
Request 30 stories → Fetch 30 → Filter by 24h → Return ~8 stories
```

**Why this happens:**
- HackerNews "best stories" list includes stories from multiple days
- A 24-hour time window typically only matches ~25-30% of the top stories
- The filter is applied AFTER fetching, not during

### Problem 2: No Upper Bound Protection
Users can set `HN_STORY_LIMIT=1000` which would:
- Fetch and process 1000 API requests (rate limiting risk)
- Process 1000 translations (costly, time-consuming)
- Potentially overwhelm the console output

## Design Decisions

### Decision 1: Adaptive Fetch Buffer Strategy

**Approach:** Fetch more stories than requested to compensate for filtering

**Alternatives considered:**
1. ❌ **Remove time filtering** - Defeats the purpose of "recent" stories
2. ❌ **Fetch until quota met** - Complex, requires multiple API rounds, slower
3. ✅ **Fixed multiplier buffer** - Simple, predictable, single API round

**Rationale:**
- Time window multipliers (2.5x for 24h, 1.5x for 48h+) are empirically derived
- Single API round maintains performance
- Statistical approximation is acceptable (25-30 stories vs exactly 30)

**Trade-offs:**
- Pro: Simple to implement and understand
- Pro: Works in single pass (fast)
- Con: Not guaranteed exact count (but close enough)
- Con: May over-fetch slightly (acceptable overhead)

### Decision 2: Hard Cap at 30 Stories

**Approach:** Enforce maximum of 30 stories regardless of user input

**Alternatives considered:**
1. ❌ **No limit** - Risk of performance issues and API abuse
2. ❌ **Progressive limits** (50/100/200 tiers) - Too complex for current needs
3. ✅ **Single hard cap at 30** - Simple, safe, sufficient for daily digest use case

**Rationale:**
- 30 stories is sufficient for a "daily digest" format
- Protects against accidental misconfigurations (e.g., typo: 300 instead of 30)
- Prevents API rate limiting issues
- Keeps translation costs reasonable

**Performance considerations:**
- 30 stories × 3 API calls each (story detail, article fetch, translation) = ~90 requests
- 30 stories × 2 translations (title + description) = 60 translation API calls
- Total runtime: ~30-60 seconds (acceptable for CLI tool)

### Decision 3: Warn at 50, Cap at 30

**Approach:** Two-tier threshold system

**Rationale:**
- Warning threshold (50) is higher than cap (30) to catch "slightly over" requests
- Users who set 35-50 likely expect more than 30, so warning is appropriate
- Clear messaging helps users understand the limitation without feeling restrictive

### Decision 4: Absolute Maximum Fetch Limit at 100

**Approach:** Never fetch more than 100 stories from API regardless of calculations

**Rationale:**
- Buffer calculations could theoretically request 30 × 2.5 = 75 stories
- With safety margin, cap at 100 to prevent runaway scenarios
- 100 fetches is still manageable performance-wise but acts as safety net

## Architecture Impact

### Component Interactions

```
┌─────────────────┐
│   src/index.ts  │
│  (CLI Entry)    │
│                 │
│  1. Parse env   │
│  2. Validate    │ ← New: validateStoryLimit()
│     limit       │
└────────┬────────┘
         │
         ↓ (validated limit)
┌─────────────────┐
│ hackerNews.ts   │
│  (API Layer)    │
│                 │
│  1. Calculate   │ ← New: calculateFetchBuffer()
│     buffer      │
│  2. Fetch N×M   │
│     stories     │
│  3. Filter by   │
│     time        │
└─────────────────┘
```

### Data Flow

**Before:**
```
ENV[30] → Parse[30] → Fetch[30] → Filter → Return[8]
```

**After:**
```
ENV[60] → Parse[60] → Validate[30] → Buffer[75] → Fetch[75] → Filter → Return[~28]
              ↓
           Warn User
```

## Error Handling Strategy

### Graceful Degradation
- If buffer calculation fails → fall back to exact limit
- If validation fails → fall back to default (30)
- If very few stories returned → provide helpful advisory, don't error

### User Communication
- Validation warnings are informative, not blocking
- Advisory messages suggest configuration adjustments
- Success messages show actual count achieved

## Testing Strategy

### Unit Tests
- `validateStoryLimit()` with various inputs: 0, 10, 30, 50, 60, 100, NaN
- `calculateFetchBuffer()` with various time windows: 12h, 24h, 48h, 72h

### Integration Tests
- End-to-end with HN_STORY_LIMIT=30 → verify ~25-30 stories returned
- End-to-end with HN_STORY_LIMIT=60 → verify warning and cap at 30
- End-to-end with restrictive time window → verify advisory message

### Manual Testing
- Test real API behavior with various configurations
- Verify console output clarity and helpfulness

## Future Considerations

### Potential Enhancements (Out of Scope)
1. **Dynamic buffer calculation** - Adjust multiplier based on historical hit rates
2. **Configurable maximum** - Allow advanced users to override cap via env var
3. **Pagination/Streaming** - Fetch incrementally until quota met
4. **Caching** - Cache story IDs to reduce API calls

### Why Not Now
- Current solution is simple and meets requirements
- Advanced features add complexity without clear user demand
- Performance is acceptable for intended use case (daily CLI run)

## Success Metrics

### Quantitative
- User requesting 30 stories receives 25-30 stories (not 8)
- Users requesting >50 see warning message
- Zero crashes from excessive limits

### Qualitative
- Clear, helpful console messages
- Users understand filtering behavior
- No confusion about limit caps

## Rollback Plan

If issues arise post-deployment:
1. **Phase 1 only:** Keep validation, remove buffer logic
2. **Phase 2 only:** Remove validation, keep buffer logic
3. **Full rollback:** Revert to exact-fetch strategy

Each component is independently reversible without breaking changes.
