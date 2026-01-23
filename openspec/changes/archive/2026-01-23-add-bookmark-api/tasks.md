# Tasks: Add Bookmark API

## 1. Database Migration

- [x] 1.1 Create migration file `migrations/0002_create_bookmarks.sql`
  - Create `bookmarks` table with all fields
  - Create `bookmark_tags` table with foreign key
  - Create necessary indexes
- [ ] 1.2 Test migration locally with `wrangler d1 migrations apply`
- [ ] 1.3 Verify table creation with `wrangler d1 execute`

## 2. Type Definitions

- [x] 2.1 Create `src/types/bookmark.ts` with:
  - `Bookmark` interface (database row type)
  - `BookmarkTag` interface
  - `CreateBookmarkRequest` interface
  - `CreateBookmarkResponse` interface
  - `BookmarkQueryResponse` interface
  - `BookmarkError` types
- [x] 2.2 Export types from `src/types/index.ts`

## 3. Bookmark Storage Service

- [x] 3.1 Create `src/services/bookmark/storage.ts` with `BookmarkStorage` class:
  - Constructor accepting D1Database
  - `createBookmark(request: CreateBookmarkRequest)` method
  - `getBookmarkByUrl(url: string)` method (for duplicate check)
  - `getBookmarkWithTags(url: string)` method (returns bookmark with tags array)
  - Batch insert for bookmark and tags
- [x] 3.2 Create `src/services/bookmark/validation.ts`:
  - `validateCreateBookmarkRequest(body: unknown)` function
  - URL format validation
  - Required field validation
  - Field length limits
- [x] 3.3 Create `src/services/bookmark/index.ts` for exports

## 4. API Route Implementation

- [x] 4.1 Add CORS handling to router:
  - OPTIONS preflight handler
  - CORS headers in responses
- [x] 4.2 Add `POST /api/bookmarks` route in `src/worker/routes/index.ts`:
  - Parse JSON body
  - Validate request
  - Call BookmarkStorage.createBookmark
  - Return appropriate response
- [x] 4.3 Add `GET /api/bookmarks` route in `src/worker/routes/index.ts`:
  - Extract url query parameter
  - Validate url parameter exists
  - Call BookmarkStorage.getBookmarkWithTags
  - Return 200 with bookmark or 404 if not found
- [x] 4.4 Handle error cases:
  - 400 for validation errors
  - 404 for bookmark not found (GET)
  - 409 for duplicate URL (POST)
  - 500 for database errors

## 5. Testing

- [x] 5.1 Create `src/__tests__/services/bookmark/storage.test.ts`:
  - Test createBookmark success
  - Test createBookmark with tags
  - Test duplicate URL handling
  - Test getBookmarkByUrl returns bookmark
  - Test getBookmarkByUrl returns null for non-existent
  - Test getBookmarkWithTags returns bookmark with tags array
- [x] 5.2 Create `src/__tests__/services/bookmark/validation.test.ts`:
  - Test valid request passes
  - Test missing required fields
  - Test invalid URL format
  - Test field length limits
- [x] 5.3 Create `src/__tests__/worker/routes/bookmarks.test.ts`:
  - Test POST success
  - Test GET success with existing bookmark
  - Test GET returns 404 for non-existent URL
  - Test GET returns 400 when url param missing
  - Test CORS headers
  - Test OPTIONS preflight
  - Test validation error response
  - Test duplicate error response

## 6. Integration Testing

- [ ] 6.1 Manual test with curl:
  - Test successful bookmark creation (POST)
  - Test bookmark query (GET)
  - Test query non-existent URL (GET 404)
  - Test duplicate URL rejection (POST 409)
  - Test CORS preflight
- [ ] 6.2 Test from browser console (simulate Chrome extension)

## 7. Documentation Update (REQUIRED)

- [x] 7.1 Check README.md for affected sections
  - Add new API endpoint documentation
  - Add environment variable documentation (if any)
- [x] 7.2 Check openspec/project.md for structural changes
  - Update directory structure if new folders added
  - Update database schema section
- [x] 7.3 Check docs/ for affected guides
- [x] 7.4 Update or remove references to changed features
- [ ] 7.5 Test code examples in documentation
- [x] 7.6 Verify no broken links or outdated information

## Dependencies

```
1.x (Database) → 2.x (Types) → 3.x (Service) → 4.x (Route) → 5.x/6.x (Testing)
                                                           ↘ 7.x (Docs)
```

Tasks 1, 2 can run in parallel.
Task 3 depends on 1 and 2.
Task 4 depends on 3.
Tasks 5, 6, 7 can run in parallel after 4.

## Estimated Effort

| Section | Estimate |
|---------|----------|
| Database Migration | 15 min |
| Type Definitions | 15 min |
| Storage Service | 45 min |
| API Route | 45 min |
| Testing | 75 min |
| Documentation | 15 min |
| **Total** | **~3.5 hours** |

## Implementation Notes

**Implementation completed on 2026-01-23:**

### Files Created:
- `migrations/0002_create_bookmarks.sql` - Database migration with bookmarks and bookmark_tags tables
- `src/types/bookmark.ts` - Type definitions for bookmark API
- `src/services/bookmark/storage.ts` - BookmarkStorage class with CRUD operations
- `src/services/bookmark/validation.ts` - Request validation functions
- `src/services/bookmark/index.ts` - Service exports
- `src/__tests__/services/bookmark/storage.test.ts` - 14 storage tests
- `src/__tests__/services/bookmark/validation.test.ts` - 25 validation tests
- `src/__tests__/worker/routes/bookmarks.test.ts` - 17 API route tests

### Files Modified:
- `src/types/index.ts` - Added bookmark type exports
- `src/worker/routes/index.ts` - Added CORS support, POST/GET/OPTIONS handlers for /api/bookmarks
- `docs/api-endpoints.md` - Added Bookmark API documentation
- `openspec/project.md` - Updated directory structure and database schema

### Test Results:
- All 56 bookmark-related tests passing
- TypeScript compilation successful with `npx tsc --noEmit`

### Remaining Tasks:
- 1.2, 1.3: Manual database migration (requires wrangler CLI)
- 6.1, 6.2: Manual integration testing (requires deployed worker)
- 7.5: Test code examples in documentation
