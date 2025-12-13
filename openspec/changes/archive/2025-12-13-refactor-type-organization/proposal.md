# Change: Refactor Type Organization and Fix OpenRouter Worker Config

## Why

1. **Critical Bug**: Worker 支持 OpenRouter provider，但 `wrangler.toml` 缺少 `OPENROUTER_API_KEY` 的配置说明，导致用户无法正确配置
2. **Code Organization**: Interface 定义分散在多个业务代码文件中（services/, worker/, utils/），难以维护和复用
3. **Convention Gap**: 项目缺少明确的 type/interface 组织约束，导致新增代码可能继续分散定义

## What Changes

### 1. Worker OpenRouter Configuration Fix
- 更新 `wrangler.toml` 添加 OpenRouter 相关配置注释和说明
- 更新 Worker 部署文档说明 OpenRouter secret 配置方法
- 验证 OpenRouter API key 在配置验证逻辑中正确处理

### 2. Interface Consolidation
- 将分散的 interface 定义迁移到 `src/types/` 或 `src/interfaces/` 目录
- 按功能领域拆分文件：
  - `types/cache.ts` - 缓存相关接口
  - `types/content.ts` - 内容过滤/文章相关接口
  - `types/logger.ts` - 日志相关接口
  - `types/publisher.ts` - 发布器相关接口
  - `types/source.ts` - 内容源相关接口
  - `types/utils.ts` - 工具类接口
- 更新所有引用点使用集中的类型导出

### 3. Project Convention Update
- 在 `openspec/project.md` 中添加 Type/Interface 组织约束
- 明确规定：所有 type 和 interface 必须定义在 `src/types/` 目录下
- 禁止在业务代码中直接定义 interface

## Impact

- **Affected specs**: 
  - `worker-config` (新增 OpenRouter 配置要求)
  - `type-organization` (新增类型组织规范)
- **Affected code**:
  - `wrangler.toml` - 添加配置注释
  - `src/types/` - 新增/合并多个类型文件
  - `src/services/cache.ts` - 移除 interface 定义
  - `src/services/contentFilter.ts` - 移除 interface 定义
  - `src/services/articleFetcher.ts` - 移除 interface 定义
  - `src/worker/logger.ts` - 移除 interface 定义
  - `src/worker/index.ts` - 移除 Env interface (使用 types/worker.ts)
  - `src/worker/publishers/` - 移除 interface 定义
  - `src/worker/sources/` - 移除 interface 定义
  - `src/utils/fetch.ts` - 移除 interface 定义
  - `src/utils/date.ts` - 移除 interface 定义
  - `openspec/project.md` - 添加类型组织约束
  - `README.md` - 更新 Worker 配置说明
