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

### Test Organization (CRITICAL)
- **Location**: 所有测试文件**必须**放在 `src/__tests__/` 目录下
- **Prohibition**: 禁止在任何其他目录（如 `src/utils/__tests__/`）中创建测试文件
- **Structure**: 按测试类型和对应的源代码模块组织：
  - `src/__tests__/utils/` - Utils 模块的测试
  - `src/__tests__/api/` - API 模块的测试
  - `src/__tests__/services/` - Services 模块的测试
  - `src/__tests__/worker/` - Worker 模块的测试
  - `src/__tests__/helpers/` - 测试辅助工具（mocks, fixtures）
  - `src/__tests__/integration/` - 集成测试
- **Naming Convention**: 测试文件使用 `.test.ts` 后缀（例如：`array.test.ts`）
- **Import Paths**: 测试文件导入源代码时使用相对路径（例如：`import { chunk } from '../../utils/array'`）
- **Rationale**: 集中管理所有测试文件，便于查找、维护和 CI/CD 配置

### Mock Data Integrity (CRITICAL)
- **Type Accuracy**: Mock 数据**必须**严格匹配实际的 TypeScript 类型定义
- **Prohibition**: **绝对禁止** Mock 数据与类型定义不一致（字段名、字段类型、必填/可选属性）
- **Verification**: 所有 Mock 工厂函数必须使用正确的类型注解，让 TypeScript 编译器验证正确性
- **Examples of Violations** (不可接受):
  - ❌ 使用 `score` 而实际类型定义是 `points`
  - ❌ Mock 数据缺少必填字段（如 `rank`, `timestamp`）
  - ❌ Mock 数据包含类型定义中不存在的字段（如 `descriptionChinese`）
  - ❌ 字段类型不匹配（如 `num_comments: number` 而定义是 `number | null`）
- **Enforcement**: 
  - 所有 Mock 工厂必须在函数签名中明确返回类型（如 `(): HNStory`）
  - 必须运行 `npx tsc --noEmit` 验证类型正确性
  - Mock 数据必须在顶部注释中标注 "CRITICAL: Must match [TypeName] interface exactly"
- **Maintenance**: 当类型定义更新时，**必须**同步更新对应的 Mock 数据
- **Rationale**: Mock 数据不匹配会导致测试失去意义，产生误导性的测试结果

### Test Quality Standards (CRITICAL)
- **Realistic Test Scenarios**: 测试**必须**反映真实的生产场景，而非人为构造的简化情况
  - Mock 数据必须匹配实际 API 响应结构（字段名、类型、格式）
  - LLM mock 响应必须使用真实的翻译示例，而非通用的 "翻译：Translated text"
  - 错误场景必须模拟真实的 API 失败模式（状态码、错误消息、限流头）
- **Safety Guardrails**: 测试**绝对不能**影响生产数据，必须通过显式的环境检查来防止
  - 检测生产凭据（如以 `sk-`, `ghp_` 开头的 API key）
  - 集成测试需要显式设置 `ALLOW_INTEGRATION_TESTS=true` 才能运行
  - Mock 环境必须使用安全的默认值（`test-` 前缀的 API keys）
  - 测试不得调用真实的外部服务（除非显式选择加入集成测试）
- **Strong Assertions**: 测试断言**必须**明确且非宽松，不能隐藏失败
  - **禁止**使用可选检查隐藏失败：`if (result) { expect(...) }` 
  - 必须明确验证预期的存在或缺失：`expect(result).toBeDefined()` 或 `expect(result).toBeNull()`
  - 对于过滤逻辑，必须使用基于属性的断言（如 "输出中无敏感关键词"）+ 具体示例检查
  - 错误断言必须验证错误消息内容（使用正则表达式），而非仅仅验证"抛出了某个错误"
- **Test Scenario Documentation**: 每个测试文件**必须**清晰记录是单元测试还是集成测试
  - `describe` 块应包含注释标明 "Unit Test" 或 "Integration Test"
  - 集成测试必须记录使用了哪些外部服务
  - Mock helpers 必须在 docstring 中说明真实性级别和与真实 API 的差异
  - 部分 mock 的场景必须明确记录哪些部分是真实的，哪些是 mocked
- **Coverage Quality Over Quantity**: 覆盖率目标必须平衡质量和实用性
  - 不应为了达到覆盖率百分比而编写无意义的测试
  - 重点关注有意义的场景覆盖，而非行数覆盖
  - 100% 覆盖率不是强制要求（某些错误日志分支难以测试是可接受的）
  - 分阶段提升覆盖率：Current: 55% → Phase 1: 70% → Phase 2: 80%
- **Examples of Good Practices**:
  - ✅ 使用真实翻译字典：`'Python Performance Tips' → 'Python 性能优化技巧'`
  - ✅ 基于属性的过滤断言：`expect(filtered.every(s => !s.title.includes('sensitive')))`
  - ✅ 明确的条件断言：`env.CRAWLER_API_URL ? expect(content).toBeDefined() : expect(content).toBeNull()`
  - ✅ 错误消息验证：`expect(() => fn()).toThrow(/rate limit exceeded/i)`
- **Examples of Bad Practices** (不可接受):
  - ❌ 通用 mock 响应：`mockTranslation() → "翻译：Translated text"`
  - ❌ 肤浅的断言：`expect(result.length).toBeGreaterThan(0)` (对过滤器测试)
  - ❌ 可选检查隐藏失败：`if (result.data) { expect(result.data).toContain(...) }`
  - ❌ 弱错误断言：`expect(() => fn()).toThrow()` (不验证错误类型或消息)
- **Rationale**: 高质量的测试是防止回归和重构后功能失效的关键保障

### Architecture Patterns
- **Directory Structure**:
  ```
  src/
  ├── __tests__/             # 所有测试文件 (CRITICAL: 禁止在其他目录创建测试)
  │   ├── utils/             # Utils 模块测试
  │   │   ├── array.test.ts
  │   │   ├── date.test.ts
  │   │   ├── fetch.test.ts
  │   │   ├── html.test.ts
  │   │   └── result.test.ts
  │   ├── api/               # API 模块测试
  │   ├── services/          # Services 模块测试
  │   ├── worker/            # Worker 模块测试
  │   ├── helpers/           # 测试辅助工具
  │   │   ├── fixtures.ts    # 测试数据工厂
  │   │   ├── mockHNApi.ts   # HN API mock
  │   │   └── mockLLMProvider.ts # LLM mock
  │   └── integration/       # 集成测试
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
      │   ├── telegram/      # Telegram 发布器 (可选)
      │   │   ├── index.ts   # TelegramPublisher 实现
      │   │   ├── client.ts  # Telegram API 客户端
      │   │   └── formatter.ts # 消息格式化
      │   └── terminal/      # Terminal 发布器 (本地测试)
      │       ├── index.ts   # TerminalPublisher 实现
      │       └── formatter.ts # 终端输出格式化
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
    - 当前实现: `GitHubPublisher` (支持自动版本控制), `TelegramPublisher` (可选), `TerminalPublisher` (本地测试)
    - `TerminalPublisher`: 用于本地开发测试，将 Markdown 输出到终端而不是发布到外部服务
    - 未来可扩展: RSS, Email 等
  - **Configuration Validation**: 启动时验证必需配置
    - `LLM_PROVIDER` 必须显式设置
    - 至少一个发布器必须启用 (GitHub, Telegram 或 LOCAL_TEST_MODE)
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

#### Test Framework & Organization
- **Framework**: Vitest 3.2.4 with Cloudflare Workers support
- **Test Location (CRITICAL)**: 所有测试文件**必须**放在 `src/__tests__/` 目录下
- **Test Organization**:
  - `src/__tests__/utils/` - Utils 模块单元测试
  - `src/__tests__/api/` - API 模块单元测试
  - `src/__tests__/services/` - Services 模块单元测试 (articleFetcher, contentFilter, translator, LLM providers)
  - `src/__tests__/worker/` - Worker 模块单元测试 (handlers, config, scheduled events)
  - `src/__tests__/helpers/` - 测试辅助工具（mocks, fixtures）
  - `src/__tests__/integration/` - 端到端集成测试 (daily export, publisher coordination)

#### Coverage Targets & Current Status

**Phased Improvement Plan**:
- **Current (Phase 0)**: 55% lines/statements, 62% functions, 84% branches
- **Phase 1 Target**: 70% lines/statements, 75% functions (add realistic LLM mocks, strengthen assertions)
- **Phase 2 Target**: 80% lines/statements, 80% functions (add integration tests, unify configs)

**Rationale by Module**:
- **Utils**: 100% target (critical infrastructure, no I/O, highly testable)
- **API**: 90%+ target (external dependencies, high business value)
- **Services**: 85%+ target (complex logic, multiple execution paths)
- **Worker**: 85%+ target (HTTP handlers, error scenarios)
- **Integration**: 80%+ target (end-to-end flows, partial external mocking)

**Current Status**:
| Layer | Target | Status | Files |
|-------|--------|--------|-------|
| Utils | 100% | ✅ Achieved | 5 files |
| API | 90%+ | ✅ Achieved | 3 files |
| Services | 90%+ | ⚠️ In Progress (current: ~52%) | 7 files |
| Worker | 85%+ | ⚠️ In Progress (current: ~61%) | 3 files |
| Publishers | 85%+ | ⚠️ Low Coverage (current: ~6-10%) | 3 files |
| Integration | 80%+ | ❌ Not Started | 2 files |
| **Total** | **55%+ (Phase 0)** | **✅ Current: 55%** | **22 files, 111+ tests** |

**Coverage Configuration**:
- `vitest.config.ts`: Standard config (80% thresholds for unit tests)
- `vitest.coverage.config.ts`: Phased config (55% → 70% → 80% for integration tests)
- See configuration files for detailed inline documentation

#### Test Infrastructure
- **Mock Strategy**: 集中管理的 mock 工厂在 `src/__tests__/helpers/`
  - `fixtures.ts` - 测试数据工厂 (HN stories, comments, API responses)
  - `workerEnvironment.ts` - Worker Env, Request, ExecutionContext mocks
  - `mockLLMProvider.ts` - LLM provider mock with rate limiting simulation
  - `mockHNApi.ts` - HackerNews API mocks

#### Key Test Coverage Areas
1. **Worker Layer**: HTTP handlers, configuration validation, scheduled event handling, error scenarios
2. **Services Layer**: 
   - ArticleFetcher: Content extraction, truncation, error handling
   - ContentFilter: Classification logic, sensitivity levels, batch filtering
   - MarkdownExporter: Jekyll format generation, filename formatting, story ranking
   - Translator: Title translation, batch processing, technical term preservation, rate limiting
   - LLM Providers: DeepSeek, OpenRouter, Zhipu implementations with rate limiting and retries
3. **Integration Tests**: Complete daily export workflows, multi-publisher coordination, graceful degradation
4. **Error Handling**: Network failures, timeouts, rate limiting (HTTP 429), authentication errors

#### Test Commands
- `npm test` - 运行所有测试
- `npm run test:watch` - 监听模式（文件变更时自动重新运行）
- `npm run test:ui` - UI 交互模式（可视化测试界面）
- `npm run test:coverage` - 生成覆盖率报告

#### Running Specific Tests
```bash
# Run specific test file
npm test -- articleFetcher.test.ts

# Run tests matching pattern
npm test -- --grep "translation"

# Run tests with verbose output
npm test -- --reporter=verbose
```

#### Manual Testing
- **Worker 本地**: `npm run dev:worker` + `curl -X POST http://localhost:8787/trigger-export-sync`
- **Worker 部署**: `npm run deploy:worker`
- **Local Test Mode**: Set `LOCAL_TEST_MODE=true` in `.dev.vars` to output to terminal instead of publishing

#### Writing New Tests
When adding features:
1. Follow the test structure pattern in existing tests
2. Use mock factories from `src/__tests__/helpers/` for realistic test data
3. Mock all external API calls (no real HTTP calls in tests)
4. Aim for > 80% coverage on the feature
5. Test both happy paths and error scenarios
6. Keep tests independent - no execution order dependencies
7. Use descriptive test names: "should [behavior] when [condition]"

See [docs/TESTING.md](../docs/TESTING.md) for comprehensive testing guidelines and examples.

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

**注意**: 至少需要启用一个发布器 (GitHub、Telegram 或 LOCAL_TEST_MODE)

### GitHub 发布器 (默认启用)
- `GITHUB_ENABLED`: 启用 GitHub 发布 ("true" 或 "false"，默认 "true")
- `TARGET_REPO`: 目标仓库 (格式: "owner/repo"，启用时必需)
- `GITHUB_TOKEN`: GitHub personal access token (启用时必需)

### Telegram 发布器 (可选)
- `TELEGRAM_ENABLED`: 启用 Telegram 发布 ("true" 或 "false"，默认 "false")
- `TELEGRAM_BOT_TOKEN`: Bot API Token (通过 @BotFather 获取，启用时必需)
- `TELEGRAM_CHANNEL_ID`: 频道 ID ("@channel_name" 或 "-100xxxxxxxxx"，启用时必需)
- `TELEGRAM_BATCH_SIZE`: 每条消息合并的文章数 (1-10，默认 2)

### 本地测试模式 (仅用于本地开发)
- `LOCAL_TEST_MODE`: 启用本地测试模式 ("true" 或 "false"，默认 "false")
  - 当启用时，输出最终 Markdown 到终端而不是发布到外部服务
  - 必须同时禁用 GitHub 和 Telegram: `GITHUB_ENABLED="false" TELEGRAM_ENABLED="false"`
  - 适合本地开发和测试，不会污染 GitHub 仓库或 Telegram 频道

**本地测试模式示例配置**:
```env
LOCAL_TEST_MODE=true
GITHUB_ENABLED=false
TELEGRAM_ENABLED=false
LLM_PROVIDER=openrouter
LLM_OPENROUTER_API_KEY=<your-api-key>
```

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
