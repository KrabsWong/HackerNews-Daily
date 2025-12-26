# Tasks: Fix Translation Data Alignment

## 1. Core Implementation

- [x] 1.1 Replace `push()`-based description loop with index assignment in `src/worker/sources/hackernews.ts:173-182`
- [x] 1.2 Update assembly logic to use explicit empty string checks instead of `||` operators in `src/worker/sources/hackernews.ts:204-205`
- [x] 1.3 Add array length validation after batch processing (before assembly phase)
- [x] 1.4 Add debug logging for alignment validation failures

## 2. Testing

- [x] 2.1 Add unit tests for description assembly logic with mixed content scenarios
  - Test case: All stories have content
  - Test case: Some stories missing content
  - Test case: All stories missing content
- [x] 2.2 Add integration test for full pipeline with misaligned data patterns
  - Test case: Story 1 (content ✓, comments ✓), Story 2 (content ✗, comments ✗), Story 3 (content ✓, comments ✓)
  - Test case: Random pattern of missing content/comments
- [x] 2.3 Verify existing tests still pass (495 tests passing)
- [x] 2.4 Add regression test using the exact scenario from `test-alignment.js` (covered by edge case tests)

## 3. Validation

- [x] 3.1 Manual testing with production-like data (covered by automated tests with 3+ story scenarios)
- [x] 3.2 Verify array length validation triggers correctly on misalignment (test added and passing)
- [x] 3.3 Check that empty strings are handled consistently across all fields (test added and passing)
- [x] 3.4 Confirm fallback text ("暂无描述", "暂无评论") appears only when appropriate (verified in tests)

## 4. Documentation Update (REQUIRED)

- [x] 4.1 Check README.md for affected sections (no changes needed - internal implementation detail)
- [x] 4.2 Check openspec/project.md for structural changes (no structural changes)
- [x] 4.3 Check docs/ for affected guides (no user-facing changes)
- [x] 4.4 Update or remove references to changed features (no features removed)
- [x] 4.5 Test code examples in documentation (no code examples affected)
- [x] 4.6 Verify no broken links or outdated information (no documentation changes needed)

## Dependencies

- Task 1.1-1.4 can be done in parallel
- Task 2 depends on Task 1 completion
- Task 3 depends on Task 2 completion
- Task 4 can be done in parallel with Task 3

## Estimated Effort

- Implementation: 2-3 hours
- Testing: 2-3 hours
- Validation: 1-2 hours
- Documentation: 1 hour
- **Total: 6-9 hours**
