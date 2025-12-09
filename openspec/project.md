# Project Context

## Purpose
HackerNews Daily 是一个自动化工具，用于抓取 HackerNews 的精选内容（best 列表），使用 AI 生成文章摘要和评论要点，翻译成中文，并支持多种输出格式（CLI、Web UI、Markdown 日报）。使用混合 Firebase + Algolia API 策略提高效率，并提供可选的 AI 内容过滤功能。

## Tech Stack
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3+ (strict mode)
- **Build**: tsc (CommonJS output to ES2020)
- **Web Frontend**: Vite + Vue.js (web/ 目录)
- **Content Extraction**: Mozilla Readability
- **LLM Provider**: DeepSeek API (翻译、摘要、内容过滤)
- **HTTP Client**: Axios
- **HTML Parsing**: Cheerio, JSDOM, @mozilla/readability
- **Server**: Express 5.x
- **Environment**: dotenv

## Project Conventions

### Code Style
- **Language**: 所有代码使用 TypeScript，启用 strict 模式
- **Module System**: CommonJS (ES2020 target)
- **Naming**:
  - 文件名: camelCase (e.g., `hackerNews.ts`, `contentFilter.ts`)
  - 类/接口: PascalCase (e.g., `HNStory`, `AlgoliaSearchResponse`)
  - 函数/变量: camelCase (e.g., `fetchTopStories`, `filterStories`)
  - 常量: SCREAMING_SNAKE_CASE (e.g., `HN_API`, `ENABLE_CONTENT_FILTER`)
- **Exports**: 优先使用 named exports
- **Error Handling**: 使用 try-catch 并返回 null 或空数组，避免抛出异常中断流程
- **Graceful Degradation**: 单个请求失败不应阻断整体流程（如内容提取失败回退到 meta description）

### Architecture Patterns
- **Directory Structure**:
  ```
  src/
  ├── api/          # 外部 API 调用 (Firebase, Algolia)
  │   └── hackerNews.ts
  ├── config/       # 配置常量
  │   └── constants.ts
  ├── services/     # 业务逻辑服务
  │   ├── translator.ts      # DeepSeek 翻译和 AI 服务
  │   ├── articleFetcher.ts  # 文章内容抓取
  │   ├── cache.ts           # 本地文件缓存
  │   ├── contentFilter.ts   # AI 内容过滤
  │   └── markdownExporter.ts
  ├── server/       # Express 服务器
  │   └── app.ts
  └── index.ts      # CLI 入口
  ```
- **API Pattern**: 
  - 混合策略: Firebase (best story IDs) + Algolia (批量查询详情)
  - 使用 Axios 进行 HTTP 请求
  - 所有 API 配置集中在 `config/constants.ts`
  - 超时和重试策略在配置中定义
- **Data Flow**: 
  ```
  Firebase (Best IDs) → Algolia (Details) → Date/Score Filter
    → Content Filter (optional) → Article Extraction → AI Summary
    → Comment Fetch → Comment Summary → Translation → Cache → Output
  ```
- **Caching Strategy**:
  - 本地文件缓存 (`.cache/stories.json`)
  - TTL-based invalidation (默认 30 分钟)
  - Configuration change detection

### Testing Strategy
- 目前无自动化测试
- 手动测试命令: 
  - CLI: `npm run fetch`
  - Web UI: `npm run fetch:web`
  - Daily Export: `npm run fetch -- --export-daily`
  - 强制刷新: `npm run fetch -- --no-cache`

### Git Workflow
- **Branch**: 直接在 main 分支开发
- **Commit Convention**: 
  - `feat:` 新功能
  - `fix:` 修复
  - `chore:` 维护性工作
  - `docs:` 文档更新
- **Commit Message**: 使用英文，简洁描述变更内容

## Domain Context

### HackerNews API
- **Firebase API**: `https://hacker-news.firebaseio.com/v0/`
  - `beststories.json`: 获取精选故事 ID 列表（约 200 个）
  - `item/{id}.json`: 获取单个 story/comment 详情
- **Algolia API**: `https://hn.algolia.com/api/v1/`
  - `search`: 按相关性搜索
  - `search_by_date`: 按时间搜索
  - 支持 `tags`, `numericFilters` 参数

### 核心概念
- **Best Stories**: HN 的精选列表 (https://news.ycombinator.com/best)，由 HN 算法根据质量筛选
- **Score/Points**: 帖子的评分（点赞数）
- **Story**: 一篇帖子，包含 title, url, score, time, by 等字段
- **Content Filtering**: 可选的 AI 内容过滤（基于 DeepSeek LLM 分类为 SAFE/SENSITIVE）
- **Article Summary**: 使用 Readability 提取正文后由 AI 生成约 300 字摘要
- **Comment Summary**: 获取 top 10 评论并生成约 100 字 AI 摘要

### 数据处理流程

#### CLI / Web 模式 (默认过去 24 小时)
1. 从 Firebase 获取 best stories ID 列表（约 200 个）
2. 使用 Algolia 批量获取 story 详情（批次 100）
3. 按日期范围过滤
4. 按 score 降序排序，取 top N（默认 30，可配置）
5. **可选**: AI 内容过滤（移除 SENSITIVE 标题）
6. 抓取文章全文（Mozilla Readability）
7. 生成 AI 摘要（文章内容和评论）
8. 翻译标题和摘要到中文
9. 输出到 CLI / Web / 缓存

#### Daily Export 模式 (前一天 00:00-23:59)
1. 从 Algolia 查询前一天的 best stories
2. 按创建时间降序排序
3. 应用内容过滤（如启用）
4. 生成 Markdown 文件（带 Jekyll frontmatter）
5. 保存到 `hacknews-export/YYYY-MM-DD-daily.md`
6. GitHub Actions 自动推送到 tldr-hacknews-24 仓库

## Important Constraints
- **Rate Limiting**: Algolia API 有请求限制，批量大小 100 stories/batch，最多 10 页
- **Timeout**: 
  - 外部请求: 10s (Firebase, Algolia)
  - AI 内容过滤: 15s
  - 文章抓取: 5s per URL
- **Graceful Degradation**: 
  - 内容提取失败 → 回退到 meta description
  - AI 内容过滤失败 → 回退到不过滤 (fail-open)
  - 翻译失败 → 显示原文
- **中文输出**: 最终输出面向中文用户
- **Performance**: 处理 30 篇文章约需 2.5-3.5 分钟（包含 AI 处理）

## External Dependencies
- **HackerNews Firebase API**: 获取 best stories ID 和评论详情
- **Algolia HN Search API**: 批量获取 story 详情和日期过滤
- **DeepSeek LLM**: 
  - 翻译（标题、摘要、评论要点）
  - AI 摘要生成（文章内容、评论）
  - 内容过滤（可选，SAFE/SENSITIVE 分类）
- **Mozilla Readability**: 文章正文智能提取

## Configuration
主要环境变量（详见 `.env.example`）:
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥（必需）
- `HN_STORY_LIMIT`: 最大故事数（默认 30）
- `HN_TIME_WINDOW_HOURS`: 时间窗口（默认 24 小时）
- `ENABLE_CONTENT_FILTER`: 启用 AI 内容过滤（默认 false）
- `CONTENT_FILTER_SENSITIVITY`: 过滤敏感度（low/medium/high，默认 medium）
- `CACHE_ENABLED`: 启用缓存（默认 true）

## OpenSpec Conventions

### Spec File Format (重要)
每个 `openspec/specs/<capability>/spec.md` 文件必须包含以下结构：

```markdown
# <capability-name> Specification

## Purpose
<简要描述该能力的目的，1-2 句话>

## Requirements

### Requirement: <Requirement Name>
The system SHALL <requirement description>.

#### Scenario: <Scenario Name>
**Given** <precondition>  
**When** <action>  
**Then** <expected result>  
**And** <additional result>
```

**关键格式要求**:
1. **必须有 `## Purpose` 段落** - openspec 解析器需要此段落才能识别 requirements
2. **标题格式**: `# <name> Specification`（不要包含 "Delta" 后缀）
3. **Requirement 使用 SHALL/MUST**: 描述中必须包含大写的 SHALL 或 MUST
4. **Scenario 使用 `####` 四级标题**: 不要使用 bullet points 或 bold
5. **Scenario 使用 Given/When/Then 格式**: 每行末尾加两个空格实现换行

### Delta Spec Format (用于 changes/)
在 `openspec/changes/<id>/specs/<capability>/spec.md` 中：

```markdown
# <capability-name> Specification Delta

## Overview
<变更概述>

## ADDED Requirements
### Requirement: <New Requirement>
...

## MODIFIED Requirements
### Requirement: <Existing Requirement>
<完整的修改后内容，不是增量>

## REMOVED Requirements
### Requirement: <Removed Requirement>
**Reason**: <删除原因>
```

### 从 Archive 恢复 Specs
当从 archive 重建 specs 时，需要：
1. 将 `## ADDED Requirements` 替换为 `## Requirements`
2. 将标题中的 "Specification Delta" 替换为 "Specification"
3. **添加 `## Purpose` 段落**（这是最关键的一步）
