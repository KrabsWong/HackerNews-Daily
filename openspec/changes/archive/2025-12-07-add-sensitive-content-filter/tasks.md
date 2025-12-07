# Tasks: Add AI-Based Sensitive Content Filter

## Overview

Implementation tasks for adding AI-powered sensitive content filtering to HackerNews Daily.

## Task List

### Phase 1: Configuration and Constants

#### Task 1.1: Add content filter configuration constants
**File**: `src/config/constants.ts`

**Actions**:
- Add `CONTENT_FILTER` configuration object with:
  - `ENABLED`: Read from `ENABLE_CONTENT_FILTER` env var (default: false)
  - `SENSITIVITY`: Read from `CONTENT_FILTER_SENSITIVITY` env var (default: 'medium')
  - `TIMEOUT`: Set to 15000ms
  - `FALLBACK_ON_ERROR`: Set to true
- Export type for sensitivity levels: `'low' | 'medium' | 'high'`

**Validation**:
- Configuration loads correctly with default values
- Environment variables override defaults properly
- TypeScript types are correct

**Estimated Time**: 15 minutes

---

#### Task 1.2: Update .env.example with filter configuration
**File**: `.env.example`

**Actions**:
- Add comment section for content filter
- Add `ENABLE_CONTENT_FILTER=false` with description
- Add `CONTENT_FILTER_SENSITIVITY=medium` with options documented
- Add explanation of sensitivity levels

**Validation**:
- Example file has clear documentation
- Users can understand how to enable and configure

**Estimated Time**: 10 minutes

---

### Phase 2: Content Filter Service

#### Task 2.1: Create ContentFilter service skeleton
**File**: `src/services/contentFilter.ts` (new file)

**Actions**:
- Create `FilterClassification` interface
- Create `ContentFilter` interface with method signatures
- Create `AIContentFilter` class implementing interface
- Add constructor that accepts `Translator` instance
- Implement `isEnabled()` method
- Implement `getSensitivityLevel()` method
- Add proper imports and exports

**Validation**:
- File compiles without errors
- All types are properly defined
- Basic methods work correctly

**Estimated Time**: 30 minutes

---

#### Task 2.2: Implement AI prompt building logic
**File**: `src/services/contentFilter.ts`

**Actions**:
- Create `buildClassificationPrompt()` private method
- Define sensitivity guidelines for low/medium/high levels
- Build prompt template with:
  - Role description
  - Sensitivity level guidelines
  - JSON response format specification
  - Numbered title list
- Handle edge cases (empty titles, special characters)

**Validation**:
- Prompt generates correctly for all sensitivity levels
- JSON format specification is clear
- Titles are properly escaped/formatted

**Estimated Time**: 45 minutes

---

#### Task 2.3: Implement AI response parsing logic
**File**: `src/services/contentFilter.ts`

**Actions**:
- Create `parseClassificationResponse()` private method
- Extract JSON from response (handle markdown code blocks)
- Parse JSON array
- Validate response structure:
  - Is array
  - Each item has `index` and `classification`
  - Classification is either 'SAFE' or 'SENSITIVE'
  - All indices are present (0 to n-1)
- Throw descriptive errors for invalid responses

**Validation**:
- Parses valid JSON correctly
- Handles markdown-wrapped JSON (```json ... ```)
- Rejects invalid structures with clear error messages
- Handles missing or malformed data

**Estimated Time**: 45 minutes

---

#### Task 2.4: Implement classifyTitles() method
**File**: `src/services/contentFilter.ts`

**Actions**:
- Create `classifyTitles()` private async method
- Build prompt using `buildClassificationPrompt()`
- Send prompt to DeepSeek via translator service
- Parse response using `parseClassificationResponse()`
- Implement timeout handling (15 seconds)
- Implement error handling with fallback behavior
- Add console logging for debugging

**Validation**:
- Successfully calls DeepSeek API
- Parses responses correctly
- Handles timeouts gracefully
- Fallback behavior works on errors

**Estimated Time**: 1 hour

---

#### Task 2.5: Implement filterStories() method
**File**: `src/services/contentFilter.ts`

**Actions**:
- Implement main `filterStories()` method
- Early return if filter disabled
- Extract titles from stories
- Call `classifyTitles()` with titles
- Filter stories based on classifications (keep only 'SAFE')
- Log filter statistics (count of filtered stories)
- Handle edge cases:
  - Empty story array
  - All stories filtered
  - Classification count mismatch

**Validation**:
- Returns all stories when disabled
- Correctly filters sensitive stories
- Handles empty input
- Logs meaningful statistics

**Estimated Time**: 45 minutes

---

### Phase 3: Integration

#### Task 3.1: Integrate filter into fetchFreshData()
**File**: `src/index.ts`

**Actions**:
- Import `AIContentFilter` class
- Create filter instance (pass translator)
- Add filter call after `fetchTopStories()`, before translation
- Store filtered stories count for logging
- Update story count display logic
- Pass filtered stories to translation and downstream processes

**Validation**:
- Filter executes at correct point in pipeline
- Only filtered stories are translated
- Story count reflects filtered count
- No breaking changes to existing flow

**Estimated Time**: 30 minutes

---

#### Task 3.2: Update console output and logging
**File**: `src/index.ts`

**Actions**:
- Add log line after filtering: `Filtered X stories based on content policy`
- Update final success message to reflect actual processed count
- Ensure cache messages reflect filtered count
- Add warning if many stories filtered (e.g., >50%)

**Validation**:
- Console output is clear and informative
- Users understand filtering occurred
- No confusing or misleading messages

**Estimated Time**: 15 minutes

---

### Phase 4: Testing

#### Task 4.1: Write unit tests for ContentFilter
**File**: `src/services/contentFilter.test.ts` (new file)

**Actions**:
- Test `isEnabled()` with various env configurations
- Test `getSensitivityLevel()` returns correct level
- Test `buildClassificationPrompt()` generates proper prompts
- Test `parseClassificationResponse()`:
  - Valid JSON array
  - Markdown-wrapped JSON
  - Invalid JSON
  - Missing fields
  - Wrong structure
- Test `filterStories()`:
  - Filters sensitive stories correctly
  - Returns all when disabled
  - Handles empty array
  - Falls back on API error
  - Falls back on timeout

**Validation**:
- All tests pass
- Edge cases covered
- Error paths tested
- Mock DeepSeek API properly

**Estimated Time**: 2 hours

---

#### Task 4.2: Manual testing with real data
**Actions**:
- Test with `ENABLE_CONTENT_FILTER=true`
- Test all three sensitivity levels
- Verify filtering with known sensitive topics
- Verify safe stories pass through
- Test with `--no-cache` flag to force fresh fetch
- Test fallback behavior (temporarily break API access)
- Test with different story counts (10, 30, 50)

**Validation**:
- Filter works end-to-end
- Performance is acceptable (<5 seconds overhead)
- No false positives on obvious safe content
- Sensitive content is caught
- Fallback works when API fails

**Estimated Time**: 1 hour

---

### Phase 5: Documentation

#### Task 5.1: Update README.md
**File**: `README.md`

**Actions**:
- Add section on content filtering feature
- Document configuration options:
  - `ENABLE_CONTENT_FILTER`
  - `CONTENT_FILTER_SENSITIVITY`
- Explain sensitivity levels (low, medium, high)
- Add examples of usage
- Document behavior (stories silently filtered)
- Note performance impact (~2-5 seconds)
- Note API cost impact (minimal)

**Validation**:
- Documentation is clear and complete
- Users can understand how to use feature
- All edge cases documented

**Estimated Time**: 30 minutes

---

#### Task 5.2: Add inline code documentation
**Files**: `src/services/contentFilter.ts`, `src/index.ts`

**Actions**:
- Add TSDoc comments for all public methods
- Add comments explaining complex logic
- Document edge cases and fallback behavior
- Add examples in comments where helpful

**Validation**:
- All public APIs documented
- Complex sections have explanatory comments
- Code is maintainable

**Estimated Time**: 30 minutes

---

### Phase 6: Validation

#### Task 6.1: Create spec delta for content-filtering capability
**File**: `openspec/changes/add-sensitive-content-filter/specs/content-filtering/spec.md`

**Actions**:
- Create new capability spec for content filtering
- Document all requirements with SHALL/MUST
- Add scenarios for:
  - AI classification
  - Filter enabled/disabled
  - Error handling
  - Sensitivity levels
- Follow OpenSpec format strictly

**Validation**:
- Spec follows OpenSpec delta format
- All requirements have scenarios
- Given/When/Then format used correctly

**Estimated Time**: 1 hour

---

#### Task 6.2: Create spec delta for story-fetching modification
**File**: `openspec/changes/add-sensitive-content-filter/specs/story-fetching/spec.md`

**Actions**:
- Create MODIFIED requirements for story-fetching
- Document new filtering stage in data flow
- Update scenarios to include filtering
- Reference content-filtering capability

**Validation**:
- Captures changes to existing capability
- MODIFIED sections are complete (not incremental)
- Cross-references are correct

**Estimated Time**: 45 minutes

---

#### Task 6.3: Create spec delta for constants-config modification
**File**: `openspec/changes/add-sensitive-content-filter/specs/constants-config/spec.md`

**Actions**:
- Create ADDED requirements for new constants
- Document `CONTENT_FILTER` configuration object
- Document environment variable mappings
- Add scenarios for configuration loading

**Validation**:
- New constants documented
- Environment variables specified
- Configuration scenarios complete

**Estimated Time**: 30 minutes

---

#### Task 6.4: Run openspec validation
**Actions**:
- Run validation command (if available)
- Fix any validation errors
- Ensure all specs follow format requirements
- Verify cross-references are correct

**Validation**:
- No validation errors
- All specs properly formatted
- Requirements have proper SHALL/MUST
- Scenarios use Given/When/Then

**Estimated Time**: 30 minutes

---

## Task Dependencies

```
Phase 1 (Config)
  └─→ Phase 2 (Service Implementation)
       └─→ Phase 3 (Integration)
            └─→ Phase 4 (Testing)
                 └─→ Phase 5 (Documentation)
                      └─→ Phase 6 (Validation)
```

**Critical Path**: All phases are sequential and must be completed in order.

**Parallelizable Work**: 
- Task 5.1 (README) can be done alongside Phase 6
- Task 5.2 (inline docs) can be done during Phase 2-3

## Estimated Timeline

| Phase | Tasks | Time | Cumulative |
|-------|-------|------|------------|
| Phase 1: Config | 2 tasks | 25 min | 25 min |
| Phase 2: Service | 5 tasks | 4h 15min | 4h 40min |
| Phase 3: Integration | 2 tasks | 45 min | 5h 25min |
| Phase 4: Testing | 2 tasks | 3h | 8h 25min |
| Phase 5: Documentation | 2 tasks | 1h | 9h 25min |
| Phase 6: Validation | 4 tasks | 3h 15min | 12h 40min |

**Total Estimated Time**: 12-13 hours

## Acceptance Criteria

The implementation is complete when:
- ✅ Content filter service is implemented and tested
- ✅ Integration into fetch pipeline is working
- ✅ All unit tests pass
- ✅ Manual testing shows expected behavior
- ✅ Documentation is complete and clear
- ✅ OpenSpec validation passes without errors
- ✅ Feature is disabled by default (backward compatible)
- ✅ Performance impact is acceptable (<5 seconds)
- ✅ Error handling provides graceful fallback

## Rollback Plan

If issues arise:
1. Set `ENABLE_CONTENT_FILTER=false` (immediate mitigation)
2. Revert integration changes in `src/index.ts`
3. System continues working without filtering
4. No data loss or breaking changes
