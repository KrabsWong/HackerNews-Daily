# Tasks: Update Documentation

## Task List

### Phase 1: 立即文档更新
- [x] 1. 分析当前 README.md 结构和内容
- [x] 2. 分析当前 project.md 与实际代码结构的差异
- [x] 3. 检查 docs/ 目录下所有文档内容
- [x] 4. 识别与当前代码无关的过期内容
- [x] 5. 更新 README.md Features 部分 - 修正 LLM provider 描述（支持多 provider）
- [x] 6. 精简 README.md - 删除详细开发指南章节（如需要）
- [x] 7. 精简 README.md - 保留核心内容（Features, Usage, Configuration, API）
- [x] 8. 更新 project.md - 修正目录结构以反映实际代码
- [x] 9. 清理 docs/ 目录 - 删除分布式架构相关内容
- [x] 10. 重命名 docs/ 文件统一为小写连字符格式
- [x] 11. 审查并统一所有文档语言风格（避免中英文混搭）
- [x] 12. 更新所有指向重命名文件的链接
- [x] 13. 验证所有文档链接有效性

### Phase 2: 建立文档自动更新机制
- [x] 14. 更新 openspec/AGENTS.md - 添加文档更新步骤
- [x] 15. 更新 openspec/AGENTS.md - 添加文档更新检查清单
- [x] 16. 更新 openspec/project.md - 添加文档维护规范
- [x] 17. 更新 openspec/project.md - 添加 tasks.md 模板要求

### Phase 3: 验证和测试
- [x] 18. 运行 `openspec validate update-documentation --strict`
- [x] 19. 验证所有 Markdown 格式正确
- [x] 20. 检查所有内部链接有效（包括重命名后的文件）
- [x] 21. 最终检查：README.md Features 描述准确
- [x] 22. 最终检查：docs/ 文件命名统一（小写连字符）
- [x] 23. 最终检查：文档语言风格统一
- [x] 24. 最终检查：所有文档与代码一致

## Task Details

### Phase 1: 立即文档更新

#### 5. 更新 README.md Features 部分 - 修正 LLM provider 描述

**目标**：修正 Features 中关于 LLM 的描述，反映当前支持多个 provider

**当前问题**：
- 第 11 行提到 "Translates titles, article summaries, and comment summaries to Chinese using DeepSeek LLM"
- 实际代码支持 DeepSeek 和 OpenRouter 两个 provider（见 `src/services/llmProvider.ts`）

**修改方案**：
```markdown
- 🌏 Translates titles, article summaries, and comment summaries to Chinese using configurable LLM providers (DeepSeek or OpenRouter)
```

或更简洁：
```markdown
- 🌏 Translates titles, article summaries, and comment summaries to Chinese
```

同时检查其他 Features 是否准确。

#### 6. 精简 README.md - 删除详细开发指南章节（如需要）

**目标**：删除冗余章节（预计减少约 300 行）

删除以下章节：
1. **Prerequisites** (第 31-35 行) - 详细安装步骤
2. **Installation** (第 36-67 行) - 克隆仓库步骤
3. **Summary Generation** (第 156-165 行) - 内部实现细节
4. **Crawler API 详细配置** (第 166-199 行) - 保留环境变量即可
5. **Caching 详细说明** (第 200-217 行) - 保留在配置表格
6. **Content Filtering 详细配置** (第 218-260 行) - 保留在配置表格
7. **Example Output** (第 261-304 行) - 用户可运行查看
8. **Build** (第 305-317 行) - 移到 docs/LOCAL_DEVELOPMENT.md
9. **Error Handling** (第 318-326 行) - 移到文档目录
10. **Development** (第 327-353 行) - 移到文档目录
11. **Troubleshooting** (第 354-463 行，约 110 行) - 移到 docs/

#### 7. 精简 README.md - 保留核心内容

**目标**：保留并优化核心内容（预计最终约 150-180 行）

保留以下内容：
1. **项目标题和简介** (1-3 行)
2. **Features 特性列表** (保持现有格式)
3. **Prerequisites** (简化版，2-3 行)
4. **Quick Start** (新增简化版，约 10 行)
5. **Deployment 部署说明** (保留)
6. **Usage 使用说明** (保留)
7. **Configuration 环境变量表格** (保留)
8. **API Documentation** (保留)
9. **Documentation 文档链接** (保留)
10. **License** (保留)

#### 8. 更新 project.md - 修正目录结构

**目标**：在 project.md 的 "Architecture Patterns" 部分更新目录结构（约第 31-56 行）

**变更点**：
- 删除原有的 `shared/` 目录引用
- 更新 `api/` 为 `api/hackernews/` 子目录
- 添加 `types/` 目录（api.ts, shared.ts, task.ts）
- 添加 `utils/` 目录（array.ts, date.ts, fetch.ts, html.ts, result.ts）
- 更新 `services/translator/` 为子目录结构
- 更新 `worker/` 子目录，添加 `logger.ts` 和 `stubs/`

#### 9. 清理 docs/ 目录 - 删除分布式架构相关内容 ✅

**已完成**：
- ✅ QUICK_REFERENCE.md - 删除分布式架构、更新端点
- ✅ LOCAL_DEVELOPMENT.md - 删除分布式对比
- ✅ LOGGING.md - 完全重写，删除分布式日志
- ✅ cloudflare-worker-deployment.md - 删除 GitHub Actions 迁移章节

#### 10. 重命名 docs/ 文件统一为小写连字符格式

**目标**：将所有 docs/ 文件名统一为小写连字符格式（kebab-case）

**需要重命名的文件**：
```bash
git mv docs/QUICK_REFERENCE.md docs/quick-reference.md
git mv docs/LOCAL_DEVELOPMENT.md docs/local-development.md
git mv docs/LOGGING.md docs/logging.md
```

**保持不变**：
- `cloudflare-worker-deployment.md`（已经是小写连字符）
- `README.md`（约定俗成的大写）

**原因**：统一命名规范，提高专业性。

#### 11. 审查并统一所有文档语言风格

**目标**：消除中英文不必要的混搭，统一语言风格

**规范**：
1. 技术文档以英文为主（代码、配置、命令等）
2. 仅在必要的解释性描述中使用中文
3. 确保同一文档内语言风格一致
4. 避免一句话中中英文频繁切换

**检查文件**：
- README.md
- docs/quick-reference.md（重命名后）
- docs/local-development.md（重命名后）
- docs/logging.md（重命名后）
- docs/cloudflare-worker-deployment.md
- docs/README.md
- openspec/project.md

**方法**：
- 阅读每个文档，标记中英文混搭严重的段落
- 优先使用英文表达技术概念
- 保持专业性和可读性平衡

#### 12. 更新所有指向重命名文件的链接

**目标**：更新所有引用重命名文件的链接

**需要检查的文件**：
1. README.md - 更新指向 docs/ 的链接
2. docs/README.md - 更新指向其他文档的链接
3. openspec/project.md - 更新指向文档的链接（如有）
4. 其他可能引用这些文件的地方

**链接变更**：
- `./docs/LOCAL_DEVELOPMENT.md` → `./docs/local-development.md`
- `./docs/LOGGING.md` → `./docs/logging.md`
- `./docs/QUICK_REFERENCE.md` → `./docs/quick-reference.md`

#### 13. 验证所有文档链接有效性

**检查清单**：
1. README.md 中的链接：
   - `./docs/cloudflare-worker-deployment.md`
   - `./docs/local-development.md`（重命名后）
   - `./docs/logging.md`（重命名后）
   - `./docs` 目录
2. 确保 docs/ 目录包含：
   - `cloudflare-worker-deployment.md` ✅
   - `local-development.md`（重命名后）
   - `logging.md`（重命名后）
   - `quick-reference.md`（重命名后）
   - `README.md` ✅
3. docs/README.md 中的所有链接
4. 验证外部链接格式正确（不需要测试连接）

### Phase 2: 建立文档自动更新机制

#### 14. 更新 openspec/AGENTS.md - 添加文档更新步骤

在 "Stage 2: Implementing Changes" 部分（约第 49-57 行）：

**原文**：
```markdown
### Stage 2: Implementing Changes
Track these steps as TODOs and complete them one by one.
1. **Read proposal.md** - Understand what's being built
2. **Read design.md** (if exists) - Review technical decisions
3. **Read tasks.md** - Get implementation checklist
4. **Implement tasks sequentially** - Complete in order
5. **Confirm completion** - Ensure every item in `tasks.md` is finished before updating statuses
6. **Update checklist** - After all work is done, set every task to `- [x]` so the list reflects reality
7. **Approval gate** - Do not start implementation until the proposal is reviewed and approved
```

**修改为**：
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

#### 15. 更新 openspec/AGENTS.md - 添加文档更新检查清单

在 "Stage 2: Implementing Changes" 部分之后添加新章节：

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

#### 16. 更新 openspec/project.md - 添加文档维护规范

在 "Project Conventions" 部分（约第 16-28 行）之后添加新章节：

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

#### 17. 更新 openspec/project.md - 添加 tasks.md 模板要求

在 "OpenSpec Conventions" 部分（约第 162-219 行）之后添加：

```markdown
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
```

### Phase 3: 验证和测试

#### 18-24. 最终验证

**检查清单**：
- [ ] `openspec validate update-documentation --strict` 通过
- [ ] Markdown 格式正确（无语法错误）
- [ ] 所有内部链接可访问（包括重命名后的文件）
- [ ] README.md Features 描述准确（LLM provider）
- [ ] README.md 长度合理（约 150-180 行，如有精简）
- [ ] project.md 目录结构与实际代码一致
- [ ] docs/ 所有文件使用小写连字符命名
- [ ] docs/ 目录所有文档语言风格统一
- [ ] docs/ 目录所有文档与代码一致
- [ ] AGENTS.md 新增内容格式正确
- [ ] project.md 新增内容格式正确

## Implementation Notes

- **保持兼容性**：不修改任何代码，仅更新文档和规范
- **向后兼容**：确保现有的文档链接继续有效
- **用户体验**：简化后的 README 应该能让新用户快速上手
- **详细文档分离**：将详细的开发、故障排除内容移到 `docs/` 目录
- **自动化优先**：通过规范约束 AI，而不是人工检查

## Validation Checklist

完成后检查：
- [ ] README.md Features 描述准确（支持多 LLM provider）
- [ ] README.md 长度合理（如有精简，约 150-180 行）
- [ ] 删除了所有冗余的开发细节章节（如有精简）
- [ ] 保留了所有核心功能说明
- [ ] project.md 目录结构准确反映实际代码
- [ ] docs/ 所有文件使用小写连字符命名
- [ ] docs/ 目录无过期内容
- [ ] docs/ 目录文档语言风格统一
- [ ] 所有文档链接有效（包括重命名后的文件）
- [ ] `openspec validate update-documentation --strict` 通过
- [ ] Markdown 格式正确
- [ ] AGENTS.md 包含文档更新检查清单
- [ ] project.md 包含文档维护规范
- [ ] 未来 proposals 将自动遵循新规范
