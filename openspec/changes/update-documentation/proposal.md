# Proposal: Update Documentation

## Summary

简化 README.md，删除冗余的开发细节和故障排除指南，保留项目特性概述、环境变量配置、使用说明和 API 文档。同时更新 project.md 以反映当前代码结构的变化。

**此外，本 proposal 还将建立文档自动更新机制**：确保未来每个 OpenSpec change 在实施和归档时都自动检查和更新相关文档（README.md 和 docs/），避免文档与代码脱节。

## Motivation

1. **README.md 过于冗长**：当前 README 包含近 500 行内容，包括详细的本地开发指南、故障排除等，对于快速了解项目来说信息过载
2. **README.md Features 内容过时**：Features 列表提到 "DeepSeek AI" 但代码已支持多个 LLM provider（DeepSeek 和 OpenRouter），需要更新为准确描述
3. **project.md 目录结构过时**：经过多轮迭代后，实际的 `src/` 目录结构已发生变化：
   - 新增 `types/` 目录（api.ts, shared.ts, task.ts）
   - 新增 `utils/` 目录（array.ts, date.ts, fetch.ts, html.ts, result.ts）
   - `api/` 重构为 `api/hackernews/` 子目录结构（algolia.ts, firebase.ts, mapper.ts）
   - `services/translator/` 拆分为多个文件（index.ts, summary.ts, title.ts）
   - 移除了 `shared/` 目录
4. **文档命名不一致**：docs/ 目录中文件命名混用大写下划线（`QUICK_REFERENCE.md`, `LOCAL_DEVELOPMENT.md`, `LOGGING.md`）和小写连字符（`cloudflare-worker-deployment.md`），不专业
5. **中英文混搭**：多处文档存在中英文混杂现象，缺乏统一的语言规范，降低了专业性
6. **文档容易过时**：每次代码变更后，文档常常被遗忘更新，导致文档与实际代码脱节
7. **缺乏自动化检查**：没有机制确保 AI 在每次变更后自动验证和更新文档

## Changes

### 1. README.md 简化（本次立即执行）

**删除以下章节**：
- Prerequisites (详细安装步骤)
- Installation (克隆仓库步骤)
- Summary Generation (内部实现细节)
- Crawler API 详细配置
- Caching 详细说明
- Content Filtering 详细配置
- Example Output
- Build 步骤
- Error Handling
- Development (项目结构)
- Troubleshooting (所有故障排除内容)

**保留内容**：
- 项目简介（1-2 句话）
- Features 特性列表
- Deployment 部署方式简述
- Usage（CLI Mode, Daily Export Mode, Force Refresh, Comment Summaries）
- Configuration 环境变量表格
- API Documentation
- Documentation 指向 docs/ 目录的链接
- License

### 2. project.md 更新（本次立即执行）

更新目录结构以反映当前实际情况，详见下方目录树。

### 3. docs/ 目录清理和标准化（本次立即执行）

**3.1 清理过时内容**：
- 删除所有关于分布式架构的描述（已改为简单串行架构）
- 删除不存在的 API 端点（如 `/start-export`, `/process-batch`, `/aggregate-and-publish`）
- 删除 GitHub Actions 迁移指南（项目已完全迁移到 Cloudflare Workers）
- 更新所有文档以反映当前实际代码

**3.2 统一文件命名**（重命名为小写连字符格式）：
- `QUICK_REFERENCE.md` → `quick-reference.md`
- `LOCAL_DEVELOPMENT.md` → `local-development.md`
- `LOGGING.md` → `logging.md`
- 保持 `cloudflare-worker-deployment.md` 不变
- 保持 `README.md` 不变（约定俗成的大写）

**3.3 统一语言风格**：
- 技术文档使用英文为主（代码、配置、命令等）
- 仅在必要的解释性描述中使用中文
- 确保同一文档内语言风格一致
- 避免中英文混搭造成阅读困难

### 4. 建立文档自动更新机制（本次添加规范）

在以下文件中添加文档更新规范，确保 AI 在每次变更后自动检查和更新文档：

#### 4.1 更新 `openspec/AGENTS.md`

在 "Stage 2: Implementing Changes" 部分添加文档更新步骤：

```markdown
### Stage 2: Implementing Changes
Track these steps as TODOs and complete them one by one.
1. **Read proposal.md** - Understand what's being built
2. **Read design.md** (if exists) - Review technical decisions
3. **Read tasks.md** - Get implementation checklist
4. **Implement tasks sequentially** - Complete in order
5. **Update documentation** - REQUIRED: Check and update affected docs (see Documentation Update Checklist below)
6. **Confirm completion** - Ensure every item in `tasks.md` is finished before updating statuses
7. **Update checklist** - After all work is done, set every task to `- [x]` so the list reflects reality
8. **Approval gate** - Do not start implementation until the proposal is reviewed and approved
```

并添加新的子章节：

```markdown
### Documentation Update Checklist

**REQUIRED for every change implementation and archive:**

After completing code changes, ALWAYS check and update the following if affected:

1. **README.md**
   - [ ] Features list reflects new/changed capabilities
   - [ ] Configuration table includes new environment variables
   - [ ] Usage examples are accurate
   - [ ] API documentation is up-to-date
   - [ ] No references to removed features

2. **openspec/project.md**
   - [ ] Directory structure matches actual `src/` layout
   - [ ] Architecture patterns describe current implementation
   - [ ] Configuration section lists all current env vars
   - [ ] External dependencies are accurate

3. **docs/ directory**
   - [ ] All guides reflect current API endpoints and architecture
   - [ ] Code examples are valid and tested
   - [ ] No references to removed features or old implementations
   - [ ] New features are documented if user-facing

**How to verify:**
- Run `git diff` on docs to see what changed
- Test code examples in documentation
- Search for references to removed features: `rg "old-feature-name" README.md docs/`
- Check that file paths and code structure match reality

**When to skip:**
- Bug fixes that don't change user-facing behavior
- Internal refactoring with no API changes
- Dependency updates (non-breaking)
```

#### 4.2 更新 `openspec/project.md`

在 "Project Conventions" 部分添加文档维护规范：

```markdown
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
```

### 5. 更新 tasks.md 模板规范

为所有未来的 proposal 建立标准，在 `openspec/project.md` 中添加 tasks.md 模板要求：

```markdown
### tasks.md Template

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
```

## Updated Directory Structure for project.md

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
│   └── constants.ts       # 配置常量
├── services/
│   ├── translator/        # 翻译服务
│   │   ├── index.ts       # 翻译服务入口
│   │   ├── summary.ts     # 摘要翻译
│   │   └── title.ts       # 标题翻译
│   ├── articleFetcher.ts  # 文章抓取
│   ├── cache.ts           # 本地缓存
│   ├── contentFilter.ts   # 内容过滤
│   ├── llmProvider.ts     # LLM 提供商抽象
│   └── markdownExporter.ts
├── types/                 # 类型定义
│   ├── api.ts             # API 相关类型
│   ├── shared.ts          # 共享类型
│   └── task.ts            # 任务类型
├── utils/                 # 工具函数
│   ├── array.ts           # 数组工具
│   ├── date.ts            # 日期工具
│   ├── fetch.ts           # HTTP 请求封装
│   ├── html.ts            # HTML 处理
│   └── result.ts          # Result 类型
├── worker/                # Cloudflare Worker
│   ├── index.ts           # Worker 入口
│   ├── exportHandler.ts   # 导出处理
│   ├── githubClient.ts    # GitHub API
│   ├── githubPush.ts      # Git 操作
│   ├── logger.ts          # 日志工具
│   └── stubs/             # Worker 存根
└── index.ts               # CLI 入口
```

## Impact

### Immediate Impact (本次变更)
- 简化后的 README.md 预计约 150-180 行
- 对现有功能无影响，纯文档变更
- docs/ 目录所有文档与代码同步
- 详细开发指南继续存在于 `docs/LOCAL_DEVELOPMENT.md`

### Long-term Impact (自动化机制)
- 未来所有 proposal 实施时将自动包含文档更新检查
- 减少文档过时的风险
- 提高文档质量和一致性
- 降低维护成本

## Implementation Plan

### Phase 1: 立即执行（当前 proposal）
1. 更新 README.md Features 部分，修正 LLM provider 描述
2. 简化 README.md（如需要）
3. 更新 project.md 目录结构
4. 统一 docs/ 目录文件命名（重命名为小写连字符）
5. 清理 docs/ 目录过时内容和中英文混搭
6. 更新所有指向重命名文件的链接
7. 验证所有文档链接

### Phase 2: 添加规范（当前 proposal）
1. 更新 `openspec/AGENTS.md` 添加文档更新步骤和检查清单
2. 更新 `openspec/project.md` 添加文档维护规范
3. 验证更新后的规范文件格式正确

### Phase 3: 验证机制（当前 proposal）
1. 用 `openspec validate` 验证所有变更
2. 手动测试：创建一个测试 proposal，验证 AI 是否遵循新规范
3. 文档化新的工作流程

## Open Questions

无。这是一个文档整理 + 流程优化任务。

## Success Criteria

- [ ] README.md Features 描述准确（支持多 LLM provider）
- [ ] README.md 长度合理（约 150-180 行）
- [ ] project.md 目录结构准确反映代码
- [ ] docs/ 目录所有文件使用小写连字符命名
- [ ] docs/ 目录无过时内容
- [ ] 文档语言风格统一，无不必要的中英文混搭
- [ ] AGENTS.md 包含文档更新检查清单
- [ ] project.md 包含文档维护规范
- [ ] 所有文档链接有效（包括重命名后的文件）
- [ ] `openspec validate update-documentation --strict` 通过
