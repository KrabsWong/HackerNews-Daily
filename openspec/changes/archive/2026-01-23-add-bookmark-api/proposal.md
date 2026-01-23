# Proposal: Add Bookmark API

## Change ID
`add-bookmark-api`

## Summary
实现书签 API，包括：
1. 创建接口：接收来自 Chrome 插件的书签数据（文章 URL、摘要、中文翻译、标签、标题、描述），并存储到 Cloudflare D1 数据库
2. 查询接口：根据 URL 查询已存储的书签，用于插件启动时检查当前页面是否已有记录

## Background
用户有一个 Chrome 插件，可以对当前阅读的文章进行总结和翻译。当用户觉得内容值得记录时，希望通过调用 API 将页面信息提交并持久化存储，以便后续查阅和管理。

## Goals
1. 提供一个 POST API 端点 `/api/bookmarks` 接收书签数据
2. 提供一个 GET API 端点 `/api/bookmarks?url=<url>` 按 URL 查询书签
3. 创建新的数据库表 `bookmarks` 存储书签信息
4. 支持多个标签（tags）的存储
5. 实现基本的数据验证和错误处理
6. 支持 CORS 以允许 Chrome 插件跨域调用

## Non-Goals
- 书签列表 API（全量/分页查询，可在后续迭代中添加）
- 用户认证/授权（初期版本不做）
- 书签的更新/删除 API（可在后续迭代中添加）

## Scope
- **New Database Table**: `bookmarks` 表
- **New API Endpoints**: 
  - `POST /api/bookmarks` - 创建书签
  - `GET /api/bookmarks?url=<url>` - 按 URL 查询书签
- **New Types**: `Bookmark`, `CreateBookmarkRequest`, `BookmarkQueryParams`
- **New Service**: `BookmarkStorage` 服务

## Spec Deltas
- `bookmark-storage`: 新增书签存储能力

## Related Specs
- `d1-task-storage`: 复用现有的 D1 操作模式
- `cloudflare-worker-runtime`: 复用现有的 Worker 架构

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| 数据库表迁移 | 需要运行新的 migration | 使用 wrangler d1 migrations |
| CORS 配置 | Chrome 插件可能因 CORS 失败 | 配置正确的 CORS headers |
| 数据验证 | 无效数据可能导致存储失败 | 实现严格的请求验证 |

## Success Criteria
1. Chrome 插件可以成功调用 API 并存储书签
2. Chrome 插件可以通过 URL 查询已存储的书签
3. 所有必填字段都有验证
4. Tags 可以正确存储和关联
5. 错误情况返回清晰的错误消息
6. 查询不存在的 URL 返回 404
