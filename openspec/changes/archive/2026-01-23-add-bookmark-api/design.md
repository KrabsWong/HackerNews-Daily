# Design: Add Bookmark API

## Architecture Overview

### Component Diagram

```
┌──────────────────┐  POST /api/bookmarks         ┌───────────────────┐
│  Chrome Plugin   │ ─────────────────────────────▶│  Cloudflare Worker│
│  (Extension)     │  GET /api/bookmarks?url=...  │                   │
└──────────────────┘ ◀─────────────────────────────│  ┌─────────────┐  │
                                               │  │   Router    │  │
                                               │  └──────┬──────┘  │
                                               │         │         │
                                               │  ┌──────▼──────┐  │
                                               │  │  Validator  │  │
                                               │  └──────┬──────┘  │
                                               │         │         │
                                               │  ┌──────▼──────┐  │
                                               │  │  Bookmark   │  │
                                               │  │  Storage    │  │
                                               │  └──────┬──────┘  │
                                               └─────────┼─────────┘
                                                         │
                                               ┌─────────▼─────────┐
                                               │   Cloudflare D1   │
                                               │   ┌───────────┐   │
                                               │   │ bookmarks │   │
                                               │   └───────────┘   │
                                               │   ┌───────────┐   │
                                               │   │bookmark_  │   │
                                               │   │   tags    │   │
                                               │   └───────────┘   │
                                               └───────────────────┘
```

## Database Schema Design

### Option A: Normalized Schema (选定)
使用两个表：`bookmarks` 主表和 `bookmark_tags` 关联表。

**优点**:
- 标准化数据，避免冗余
- 便于按标签查询/聚合
- 易于扩展（如添加 tag 描述、颜色等）

**缺点**:
- 需要多表操作
- 插入时需要事务

### Option B: JSON Tags (未选)
在 `bookmarks` 表中使用 JSON 字段存储 tags。

**优点**:
- 简单，单表操作
- 无需事务

**缺点**:
- SQLite JSON 查询性能较差
- 不便于按标签聚合查询

### Decision: Option A
选择规范化设计，因为：
1. D1 支持 batch 操作，可以原子性地执行多条语句
2. 未来可能需要按标签查询书签
3. 符合现有项目的数据库设计模式

## Table Definitions

### `bookmarks` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 唯一标识 |
| url | TEXT | NOT NULL, UNIQUE | 文章 URL（去重键） |
| title | TEXT | NOT NULL | 文章标题 |
| description | TEXT | | 文章描述/元描述 |
| summary | TEXT | NOT NULL | AI 生成的内容摘要 |
| summary_zh | TEXT | NOT NULL | 摘要的中文翻译 |
| created_at | INTEGER | NOT NULL | 创建时间 (Unix ms) |
| updated_at | INTEGER | NOT NULL | 更新时间 (Unix ms) |

### `bookmark_tags` Table

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 唯一标识 |
| bookmark_id | INTEGER | NOT NULL, FK → bookmarks.id | 关联书签 |
| tag | TEXT | NOT NULL | 标签名称 |

**Indexes**:
- `bookmark_tags(bookmark_id)` - 加速按书签查询标签
- `bookmark_tags(tag)` - 加速按标签查询书签

## API Design

### Endpoints Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bookmarks` | 创建新书签 |
| GET | `/api/bookmarks?url=<url>` | 按 URL 查询书签 |

### POST /api/bookmarks - 创建书签

#### Endpoint

```
POST /api/bookmarks
Content-Type: application/json
```

### Request Body

```typescript
interface CreateBookmarkRequest {
  url: string;           // 必填，文章 URL
  title: string;         // 必填，文章标题
  description?: string;  // 可选，文章描述
  summary: string;       // 必填，AI 摘要
  summary_zh: string;    // 必填，中文翻译摘要
  tags: string[];        // 必填，标签数组（可为空数组）
}
```

### Response

**Success (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "url": "https://example.com/article",
    "title": "Article Title",
    "description": "Article description",
    "summary": "AI generated summary...",
    "summary_zh": "AI 生成的中文摘要...",
    "tags": ["tech", "ai"],
    "created_at": 1705968000000
  }
}
```

**Error (400 Bad Request)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": ["url is required", "summary is required"]
  }
}
```

**Error (409 Conflict)** - URL 已存在:
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_URL",
    "message": "Bookmark with this URL already exists",
    "existing_id": 42
  }
}
```

### GET /api/bookmarks?url=<url> - 查询书签

#### Endpoint

```
GET /api/bookmarks?url=<encoded_url>
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | URL-encoded 文章地址 |

#### Response

**Success (200 OK)** - 找到书签:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "url": "https://example.com/article",
    "title": "Article Title",
    "description": "Article description",
    "summary": "AI generated summary...",
    "summary_zh": "AI 生成的中文摘要...",
    "tags": ["tech", "ai"],
    "created_at": 1705968000000,
    "updated_at": 1705968000000
  }
}
```

**Not Found (404)** - 未找到书签:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No bookmark found for this URL"
  }
}
```

**Bad Request (400)** - 缺少 url 参数:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "url query parameter is required"
  }
}
```
```

## CORS Configuration

为支持 Chrome 插件跨域调用：

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // 或指定插件域名
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

需要处理 OPTIONS preflight 请求。

## Code Organization

```
src/
├── services/
│   └── bookmark/
│       ├── index.ts        # 导出入口
│       ├── storage.ts      # BookmarkStorage 类
│       └── validation.ts   # 请求验证逻辑
├── types/
│   └── bookmark.ts         # Bookmark 相关类型
└── worker/
    └── routes/
        └── index.ts        # 添加 /api/bookmarks 路由
```

## Error Handling Strategy

1. **Validation Errors**: 返回 400，列出所有验证失败字段
2. **Duplicate URL**: 返回 409，包含已存在记录的 ID
3. **Database Errors**: 返回 500，记录详细错误日志
4. **Rate Limiting**: 暂不实现，后续可添加

## Testing Strategy

1. **Unit Tests**: BookmarkStorage 方法、请求验证逻辑
2. **Integration Tests**: API 端点的完整流程测试
3. **Mock D1**: 使用 vitest 的 D1 mock 进行测试

## Migration Strategy

创建新的 migration 文件：`migrations/0002_create_bookmarks.sql`

```sql
-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  summary TEXT NOT NULL,
  summary_zh TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create bookmark_tags table
CREATE TABLE IF NOT EXISTS bookmark_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bookmark_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bookmark_tags_bookmark_id ON bookmark_tags(bookmark_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tag ON bookmark_tags(tag);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at);
```

## Security Considerations

1. **Input Sanitization**: 对所有输入字段进行长度限制和类型验证
2. **URL Validation**: 验证 URL 格式有效性
3. **SQL Injection**: 使用 D1 prepared statements（已是项目标准做法）
4. **Future Auth**: 预留认证中间件扩展点

## Performance Considerations

1. **Batch Insert**: 使用 D1 batch 操作原子插入书签和标签
2. **Index Design**: 为常用查询路径创建索引
3. **Connection Reuse**: 复用 D1 连接（Cloudflare 自动管理）
