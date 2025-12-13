# Design: Refactor Type Organization and Fix OpenRouter Worker Config

## Context

当前项目存在三个相关问题：

1. **OpenRouter 配置缺失**: Worker 代码支持 OpenRouter provider，但 `wrangler.toml` 没有说明如何配置 `OPENROUTER_API_KEY` secret，导致用户无法正确部署
2. **Interface 分散**: TypeScript interface 定义分散在 services/, worker/, utils/ 目录的多个文件中，不符合模块化设计原则
3. **缺乏约束**: 项目文档没有明确规定 type/interface 的组织规范，导致问题持续积累

## Goals / Non-Goals

**Goals:**
- 修复 OpenRouter Worker 配置的文档缺失
- 将所有 interface 定义集中到 `src/types/` 目录
- 在项目文档中建立类型组织的约束规范
- 保持向后兼容，不破坏现有功能

**Non-Goals:**
- 不重命名现有 interface（保持 API 兼容）
- 不修改 interface 的定义内容
- 不创建新的 `src/interfaces/` 目录（使用现有 `src/types/`）
- 不修改运行时行为

## Decisions

### Decision 1: 使用 `src/types/` 而非 `src/interfaces/`

**选择**: 复用现有的 `src/types/` 目录

**理由**:
- TypeScript 中 type 和 interface 语义相近，可以互换使用
- 项目已有 `src/types/` 目录且结构良好
- 避免引入新目录增加复杂度
- 符合 TypeScript 社区惯例（types 目录包含所有类型定义）

**备选方案**:
- 创建 `src/interfaces/` 目录：增加目录数量，区分度不明显
- 创建 `src/types-and-interfaces/`：名称冗长

### Decision 2: 按领域拆分类型文件

**选择**: 按功能领域组织类型文件

```
src/types/
├── api.ts        # HN API 相关类型 (已有)
├── cache.ts      # 缓存相关类型 (新增)
├── content.ts    # 内容过滤/文章类型 (新增)
├── llm.ts        # LLM provider 类型 (已有)
├── logger.ts     # 日志相关类型 (新增)
├── publisher.ts  # 发布器类型 (新增)
├── shared.ts     # 共享类型 (已有)
├── source.ts     # 内容源类型 (新增)
├── task.ts       # 任务类型 (已有)
├── utils.ts      # 工具类型 (新增)
├── worker.ts     # Worker 环境类型 (已有)
└── index.ts      # 统一导出 (新增/更新)
```

**理由**:
- 按领域组织便于查找和维护
- 文件大小可控，避免单一大文件
- 与现有文件结构一致

### Decision 3: 允许内部非导出类型

**选择**: 仅限制导出的 interface，允许文件内部非导出类型

**理由**:
- 某些类型仅用于单个文件的实现细节
- 强制所有类型集中会增加不必要的文件依赖
- 区分"公共 API"和"实现细节"是良好实践

**规则**:
- `export interface` / `export type` → 必须在 src/types/
- 无 export 的 interface/type → 可以在业务文件内定义

### Decision 4: Worker Env 类型统一

**选择**: 统一使用 `src/types/worker.ts` 中的 Env 定义

**理由**:
- 当前 `worker/index.ts` 和 `types/worker.ts` 都定义了 Env/WorkerEnv
- 重复定义容易导致不一致
- 统一位置便于维护

**迁移策略**:
1. 将 `worker/index.ts` 的 Env 定义移至 `types/worker.ts`
2. 删除 `types/worker.ts` 中的 WorkerEnv（如果与 Env 重复）
3. 更新所有引用点

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 大量文件修改可能引入错误 | TypeScript 编译器会捕获类型错误 |
| Import 路径变化多 | 使用 IDE 的重构功能，逐步验证 |
| 可能遗漏某些 interface | 使用 grep 全面扫描确保完整 |

## Migration Plan

1. **Phase 1: 创建新类型文件** (低风险)
   - 创建新的类型文件，从原位置复制 interface
   - 不删除原位置的定义
   - 验证新文件可以正确编译

2. **Phase 2: 更新引用** (中风险)
   - 逐个文件更新 import 语句
   - 每次更新后运行 TypeScript 编译
   - 确保测试通过

3. **Phase 3: 删除旧定义** (低风险)
   - 删除原位置的 interface 定义
   - 保留 re-export 如需向后兼容
   - 最终编译验证

4. **Phase 4: 文档更新**
   - 更新 openspec/project.md
   - 更新 README.md
   - 更新 wrangler.toml 注释

## Open Questions

1. ~~是否需要在原位置保留 re-export 以保持向后兼容？~~ 
   - 决定：不需要，这是内部重构，不影响外部 API

2. ~~`types/worker.ts` 和 `worker/index.ts` 的 Env 哪个保留？~~
   - 决定：保留 `types/worker.ts`，因为它是类型的正确位置

3. ~~纯 re-export 的 index.ts 文件是否应该删除？~~
   - 决定：是，删除无业务逻辑、仅有 type re-export 的文件
   - 已删除：`src/worker/sources/index.ts`、`src/worker/publishers/index.ts`
   - 更新依赖方直接从 `src/types/` 导入
