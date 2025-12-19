# Project Context

## Purpose
HackerNews Daily 是一个 Cloudflare Worker，用于抓取 HackerNews 的精选内容（best 列表），使用 AI 生成文章摘要和评论要点，翻译成中文，并发布到 GitHub 和/或 Telegram。使用混合 Firebase + Algolia API 策略提高效率，并提供可选的 AI 内容过滤功能。

## Tech Stack
- **Runtime**: Cloudflare Workers
- **Language**: TypeScript 5.3+ (strict mode)
- **Build**: esbuild (Worker)
- **Content Extraction**: Mozilla Readability, Crawler API
- **LLM Provider**: DeepSeek API / OpenRouter / Zhipu AI (翻译、摘要、内容过滤)
- **HTTP Client**: Native fetch (utils/fetch.ts 封装)
- **HTML Parsing**: Cheerio, linkedom, @mozilla/readability
- **Environment**: Cloudflare secrets (.dev.vars for local)

## Project Conventions

### Code Style
- **Language**: 所有代码使用 TypeScript，启用 strict 模式
- **Module System**: ES2020 target
- **Naming**:
  - 文件名: camelCase (e.g., `hackerNews.ts`, `contentFilter.ts`)
  - 类/接口: PascalCase (e.g., `HNStory`, `AlgoliaSearchResponse`)
  - 函数/变量: camelCase (e.g., `fetchTopStories`, `filterStories`)
  - 常量: SCREAMING_SNAKE_CASE (e.g., `HN_API`, `ENABLE_CONTENT_FILTER`)
- **Exports**: 优先使用 named exports
- **Error Handling**: 使用 try-catch 并返回 null 或空数组，避免抛出异常中断流程
- **Graceful Degradation**: 单个请求失败不应阻断整体流程（如内容提取失败回退到 meta description）

### Type Organization (IMPORTANT)
- **Location**: 所有可导出的 `type` 和 `interface` 定义**必须**放在 `src/types/` 目录下
- **Prohibition**: 禁止在业务代码文件（services/, worker/, utils/）中定义可导出的 interface
- **Exception**: 仅供文件内部使用的非导出类型可以在业务文件中定义
- **Structure**: 按功能领域组织类型文件：
  - `types/api.ts` - HackerNews API 相关类型
  - `types/content.ts` - 内容过滤/文章相关类型
  - `types/llm.ts` - LLM provider 类型
  - `types/logger.ts` - 日志相关类型
  - `types/publisher.ts` - 发布器相关类型
  - `types/shared.ts` - 共享类型
  - `types/source.ts` - 内容源相关类型
  - `types/task.ts` - 任务相关类型
  - `types/utils.ts` - 工具类型
  - `types/worker.ts` - Worker 环境类型
  - `types/index.ts` - 统一导出入口
- **Import**: 业务代码应从 `types/` 目录导入类型，可保留 re-export 以兼容旧代码

### Architecture Patterns
- **Directory Structure**:
  ```
  src/
  ├── api/
  │   ├── hackernews/        # HackerNews API 模块
  │   │   ├── algolia.ts     # Algolia Search API
  │   │   ├── firebase.ts    # Firebase API
  │   │   ├── index.ts       # 统一导出
  │   │   └── mapper.ts      # 数据映射
  │   └── index.ts           # API 统一导出
  ├── config/
  │   └── constants.ts       # 配置常量 (包含 LLMProviderType 导出)
  ├── services/
  │   ├── translator/        # 翻译服务
  │   │   ├── index.ts       # 翻译服务入口
  │   │   ├── summary.ts     # 摘要翻译
  │   │   └── title.ts       # 标题翻译
  │   ├── articleFetcher.ts  # 文章抓取
  │   ├── contentFilter.ts   # 内容过滤
  │   └── markdownExporter.ts
  ├── types/                 # 类型定义 (所有可导出类型必须在此目录)
  │   ├── index.ts           # 统一导出入口
  │   ├── api.ts             # API 相关类型
  │   ├── content.ts         # 内容过滤/文章相关类型
  │   ├── llm.ts             # LLM provider 类型
  │   ├── logger.ts          # 日志相关类型
  │   ├── publisher.ts       # 发布器相关类型
  │   ├── shared.ts          # 共享类型
  │   ├── source.ts          # 内容源相关类型
  │   ├── task.ts            # 任务类型
  │   ├── utils.ts           # 工具类型
  │   └── worker.ts          # Worker 环境类型
  ├── utils/                 # 工具函数
  │   ├── array.ts           # 数组工具
  │   ├── date.ts            # 日期工具
  │   ├── fetch.ts           # HTTP 请求封装
  │   ├── html.ts            # HTML 处理
  │   └── result.ts          # Result 类型
  └── worker/                # Cloudflare Worker
      ├── index.ts           # Worker 入口
      ├── config/            # 配置验证
      │   └── validation.ts  # 配置验证逻辑
      ├── sources/           # 内容源实现
      │   └── hackernews.ts  # HackerNews 源实现
      ├── publishers/        # 发布渠道抽象
      │   ├── github/        # GitHub 发布器
      │   │   ├── index.ts   # GitHubPublisher 实现
      │   │   ├── client.ts  # GitHub API 客户端
      │   │   └── versioning.ts # 文件版本控制
      │   └── telegram/      # Telegram 发布器 (可选)
      │       ├── index.ts   # TelegramPublisher 实现
      │       ├── client.ts  # Telegram API 客户端
      │       └── formatter.ts # 消息格式化
      ├── logger.ts          # 日志工具
      └── stubs/             # Worker 存根
  ```
- **Worker Architecture**:
  - **ContentSource 抽象**: 定义统一接口支持多个内容源
    - `fetchContent(date, config)`: 获取并处理特定日期的内容
    - 当前实现: `HackerNewsSource`
    - 未来可扩展: Reddit, ProductHunt 等
  - **Publisher 抽象**: 定义统一接口支持多个发布渠道
    - `publish(content, config)`: 将内容发布到目标渠道
    - 当前实现: `GitHubPublisher` (支持自动版本控制), `TelegramPublisher` (可选)
    - 未来可扩展: RSS, Email 等
  - **Configuration Validation**: 启动时验证必需配置
    - `LLM_PROVIDER` 必须显式设置
    - 至少一个发布器必须启用
    - 提供者特定的配置根据启用状态验证
    - 失败时提供清晰的错误消息
- **API Pattern**: 
  - 混合策略: Firebase (best story IDs) + Algolia (批量查询详情和评论)
  - 使用原生 fetch 进行 HTTP 请求 (utils/fetch.ts 封装)
  - 所有 API 配置集中在 `config/constants.ts`
  - `LLMProviderType` 作为公共类型导出以保证类型安全
  - 超时和重试策略在配置中定义
- **Data Flow**: 
  ```
  Firebase (Best IDs) → Algolia (Details) → Date/Score Filter
    → Content Filter (optional) → Article Extraction → AI Summary
    → Comment Fetch → Comment Summary → Translation → Publishers
  ```

### Testing Strategy
- 目前无自动化测试
- 手动测试命令: 
  - Worker 本地: `npm run dev:worker` + `curl -X POST http://localhost:8787/trigger-export-sync`
  - Worker 部署: `npm run deploy:worker`

### Git Workflow
- **Branch**: 直接在 main 分支开发
- **Commit Convention**: 
  - `feat:` 新功能
  - `fix:` 修复
  - `chore:` 维护性工作
  - `docs:` 文档更新
- **Commit Message**: 使用英文，简洁描述变更内容

### Documentation Maintenance

**Critical Rule**: Documentation MUST be updated with every code change that affects:
- User-facing features or APIs
- Configuration or environment variables
- Project structure or architecture
- Deployment or setup procedures

**Update Targets:**
- `README.md` - High-level overview, features, usage, configuration
- `openspec/project.md` - Project structure, conventions, architecture
- `docs/` directory - Detailed guides and troubleshooting

**Verification:**
- Every proposal implementation MUST include a documentation update check
- Every archive operation MUST verify docs are in sync with code
- Use `rg` to search for references to removed features
- Test all code examples in documentation

**Automation:**
- AI assistants MUST check documentation in every change implementation
- Documentation updates are part of the Definition of Done
- No change is complete without documentation verification

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
- **Story ID**: HackerNews 上该帖子的唯一标识符，用于链接到原始讨论（格式: `https://news.ycombinator.com/item?id={storyId}`）
- **ProcessedStory**: 处理后的故事对象，包含中文翻译、AI 摘要、评论总结和 story ID，用于最终导出
- **Content Filtering**: 可选的 AI 内容过滤（基于 LLM 分类为 SAFE/SENSITIVE）
- **Article Summary**: 使用 Readability 提取正文后由 AI 生成约 300 字摘要
- **Comment Summary**: 获取 top 10 评论并生成约 100 字 AI 摘要

### 数据处理流程

#### Daily Export 模式 (前一天 00:00-23:59 UTC)
1. 从 Firebase 获取 best stories ID 列表
2. 使用 Algolia 批量获取 story 详情
3. 按日期范围过滤（昨天）
4. 按 score 降序排序，取 top N（默认 30）
5. **可选**: AI 内容过滤（移除 SENSITIVE 标题）
6. 抓取文章全文（Mozilla Readability）
7. 生成 AI 摘要（文章内容和评论）
8. 翻译标题和摘要到中文
9. 发布到 GitHub 和/或 Telegram

#### Markdown 输出格式
最终生成的 Markdown 文件（Jekyll 兼容）包含以下结构：

```markdown
---
layout: post
title: HackerNews Daily - YYYY-MM-DD
date: YYYY-MM-DD
---

## 1. 标题（中文翻译）

English Title

**发布时间**: YYYY-MM-DD HH:MM:SS UTC

**链接**: [Article URL](Article URL)

**描述**:

内容摘要...

**评论要点**:

评论摘要...（如有）

*[HackerNews](https://news.ycombinator.com/item?id={storyId})*

---
```

**说明**:
- 标题直接显示中文翻译（无括号装饰）
- 英文标题作为副标题显示
- HackerNews 链接作为斜体副标签显示在文章末尾，用户可点击访问原始讨论
- 每篇文章之间用 `---` 分隔

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
  - 单个发布器失败 → 不影响其他发布器
- **中文输出**: 最终输出面向中文用户
- **Performance**: 处理 30 篇文章约需 2-3 分钟（包含 AI 处理）

## External Dependencies
- **HackerNews Firebase API**: 获取 best stories ID 和评论详情
- **Algolia HN Search API**: 批量获取 story 详情和日期过滤
- **LLM Providers**: 
  - DeepSeek: 翻译、AI 摘要生成、内容过滤
  - OpenRouter: 翻译、AI 摘要生成、内容过滤
  - Zhipu AI: 翻译、AI 摘要生成、内容过滤 (glm-4.5-flash 并发限制 2)
- **Mozilla Readability**: 文章正文智能提取
- **GitHub API**: 文件创建和更新
- **Telegram Bot API**: 消息发送

## Configuration
主要环境变量（详见 `.env.example`）:

### LLM 配置 (必需)
- `LLM_PROVIDER`: **必需** (deepseek | openrouter | zhipu)
- `LLM_DEEPSEEK_API_KEY`: 条件必需 (当 LLM_PROVIDER=deepseek)
- `LLM_OPENROUTER_API_KEY`: 条件必需 (当 LLM_PROVIDER=openrouter)
- `LLM_ZHIPU_API_KEY`: 条件必需 (当 LLM_PROVIDER=zhipu)

**注意**: 至少需要启用一个发布器 (GitHub 或 Telegram)

### GitHub 发布器 (默认启用)
- `GITHUB_ENABLED`: 启用 GitHub 发布 ("true" 或 "false"，默认 "true")
- `TARGET_REPO`: 目标仓库 (格式: "owner/repo"，启用时必需)
- `GITHUB_TOKEN`: GitHub personal access token (启用时必需)

### Telegram 发布器 (可选)
- `TELEGRAM_ENABLED`: 启用 Telegram 发布 ("true" 或 "false"，默认 "false")
- `TELEGRAM_BOT_TOKEN`: Bot API Token (通过 @BotFather 获取，启用时必需)
- `TELEGRAM_CHANNEL_ID`: 频道 ID ("@channel_name" 或 "-100xxxxxxxxx"，启用时必需)
- `TELEGRAM_BATCH_SIZE`: 每条消息合并的文章数 (1-10，默认 2)

### 可选 LLM 配置
- `LLM_DEEPSEEK_MODEL`: DeepSeek 模型覆盖
- `LLM_OPENROUTER_MODEL`: OpenRouter 模型覆盖
- `LLM_OPENROUTER_SITE_URL`: OpenRouter 站点 URL
- `LLM_OPENROUTER_SITE_NAME`: OpenRouter 站点名称
- `LLM_ZHIPU_MODEL`: Zhipu AI 模型覆盖 (默认 glm-4.5-flash)

### 其他配置
- `HN_STORY_LIMIT`: 最大故事数（默认 30）
- `HN_TIME_WINDOW_HOURS`: 时间窗口（默认 24 小时）
- `ENABLE_CONTENT_FILTER`: 启用 AI 内容过滤（默认 false）
- `CONTENT_FILTER_SENSITIVITY`: 过滤敏感度（low/medium/high，默认 medium）

**配置验证**: Worker 启动时会验证所有必需配置，提供清晰的错误消息

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

### tasks.md Template Convention

Every `tasks.md` MUST include a final documentation update section:

```markdown
## X. Documentation Update (REQUIRED)

- [ ] X.1 Check README.md for affected sections
- [ ] X.2 Check openspec/project.md for structural changes
- [ ] X.3 Check docs/ for affected guides
- [ ] X.4 Update or remove references to changed features
- [ ] X.5 Test code examples in documentation
- [ ] X.6 Verify no broken links or outdated information
```

Where X is the next section number after implementation tasks.

**Example**:
If implementation tasks end at "## 3. Testing", then documentation section should be "## 4. Documentation Update (REQUIRED)".
