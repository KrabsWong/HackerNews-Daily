# Plan: Add Bookmark API

## Status: Awaiting Approval

## Proposal Location
`openspec/changes/add-bookmark-api/`

## Summary
实现一个 HTTP API 端点 (`POST /api/bookmarks`)，接收来自 Chrome 插件的书签数据并存储到 Cloudflare D1 数据库。

## Key Design Decisions

1. **Database Schema**: 规范化两表设计
   - `bookmarks` 表：主要数据
   - `bookmark_tags` 表：标签关联

2. **API Design**: RESTful POST 端点
   - 支持 CORS 跨域
   - 返回标准 HTTP 状态码

3. **Required Fields**:
   - url (unique)
   - title
   - summary
   - summary_zh
   - tags[]

## Implementation Tasks (7 sections)
1. Database Migration
2. Type Definitions
3. Bookmark Storage Service
4. API Route Implementation
5. Testing
6. Integration Testing
7. Documentation Update

## Estimated Effort
~3 hours

## Files to Create/Modify
- `migrations/0002_create_bookmarks.sql` (new)
- `src/types/bookmark.ts` (new)
- `src/services/bookmark/storage.ts` (new)
- `src/services/bookmark/validation.ts` (new)
- `src/worker/routes/index.ts` (modify)
- Tests in `src/__tests__/`

## Next Steps
1. Review and approve proposal
2. Run `/openspec:apply add-bookmark-api` to start implementation
