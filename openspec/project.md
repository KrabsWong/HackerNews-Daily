# Project Context

## Purpose
HackerNews Daily (hacknews-daily) 是一个自动化工具，用于抓取 HackerNews 的精选内容（/best 页面），将标题和摘要翻译成中文，并以多种格式输出（CLI、Web UI、Markdown 日报）。

## Tech Stack
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.3+ (strict mode)
- **Build**: tsc (CommonJS output to ES2020)
- **Web Frontend**: Vite + TypeScript (web/ 目录)
- **HTTP Client**: Axios
- **HTML Parsing**: Cheerio, JSDOM, @mozilla/readability
- **Server**: Express 5.x
- **Environment**: dotenv

## Project Conventions

### Code Style
- **Language**: 所有代码使用 TypeScript，启用 strict 模式
- **Module System**: CommonJS (ES2020 target)
- **Naming**:
  - 文件名: camelCase (e.g., `hackerNews.ts`, `articleFetcher.ts`)
  - 类/接口: PascalCase (e.g., `HNStory`, `AlgoliaSearchResponse`)
  - 函数/变量: camelCase (e.g., `fetchTopStories`, `storyLimit`)
  - 常量: SCREAMING_SNAKE_CASE (e.g., `HN_API`, `ALGOLIA_HN_API`)
- **Exports**: 优先使用 named exports
- **Error Handling**: 使用 try-catch 并返回 null 或空数组，避免抛出异常中断流程

### Architecture Patterns
- **Directory Structure**:
  ```
  src/
  ├── api/          # 外部 API 调用 (HackerNews, Algolia)
  ├── config/       # 配置常量
  ├── services/     # 业务逻辑服务
  ├── server/       # Express 服务器
  └── index.ts      # CLI 入口
  ```
- **API Pattern**: 
  - 使用 Axios 进行 HTTP 请求
  - 所有 API 配置集中在 `config/constants.ts`
  - 超时和重试策略在配置中定义
- **Data Flow**: 
  ```
  API Fetch → Transform → Cache → Translate → Export
  ```

### Testing Strategy
- 目前无自动化测试
- 手动测试命令: `npm run fetch`

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
- **Best Stories**: HN 的精选列表，由 HN 算法根据质量筛选
- **Score/Points**: 帖子的评分（点赞数）
- **Story**: 一篇帖子，包含 title, url, score, time, by 等字段

### 数据处理流程
1. 从 Firebase 获取 best stories ID 列表
2. 使用 Algolia 批量获取 story 详情
3. 按日期范围过滤（默认昨天一整天）
4. 按 score 降序排序，取 top N（默认 30）
5. 翻译标题和摘要
6. 输出到 CLI / Web / Markdown

## Important Constraints
- **Rate Limiting**: Algolia API 有请求限制，批量请求需控制并发
- **Timeout**: 所有外部请求必须设置超时（默认 10s）
- **Graceful Degradation**: 单个请求失败不应阻断整体流程
- **中文输出**: 最终输出面向中文用户

## External Dependencies
- **HackerNews Firebase API**: 获取 best stories ID
- **Algolia HN Search API**: 批量获取 story 详情和搜索
- **Translation Service**: 使用 LLM 进行翻译（需配置 API key）

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
