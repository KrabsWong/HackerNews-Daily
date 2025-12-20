# Design: Complete Utils and API Module Test Coverage

## Context

测试基础设施已经在前一个 proposal 中完成搭建，包括：
- ✅ Vitest 框架配置
- ✅ 测试目录组织规范（`src/__tests__/`）
- ✅ Mock 工厂和 fixtures
- ✅ 83 个测试用例全部通过

当前状态：
- Utils 模块：部分覆盖（54.24%）
  - ✅ date.ts - 100%
  - ✅ result.ts - 100%
  - ⚠️ array.ts - 94.66%
  - ⚠️ html.ts - 78.57%
  - ❌ fetch.ts - 0%
- API 模块：完全无覆盖（0%）
  - ❌ firebase.ts - 0%
  - ❌ algolia.ts - 0%
  - ❌ mapper.ts - 0%

本 proposal 聚焦于完成 Utils 和 API 模块的测试覆盖，为后续 Services/Publishers/Worker 模块测试奠定基础。

## Goals / Non-Goals

### Goals
- 完成 Utils 模块所有文件的测试，达到 100% 覆盖率
- 完成 API 模块所有文件的测试，达到 90%+ 覆盖率
- 建立 API 测试的最佳实践模式（用于后续模块参考）
- 提升整体覆盖率到 15-20%

### Non-Goals
- Services 模块测试（留给后续 proposal）
- Publishers 模块测试（留给后续 proposal）
- Worker 模块测试（留给后续 proposal）
- 集成测试（留给后续 proposal）
- 性能测试或压力测试

## Decisions

### Testing fetch.ts - HTTP Client

**挑战**: fetch.ts 包含网络请求、超时、重试等异步逻辑，需要仔细 mock。

**决策**: 使用 Vitest 的 `vi.fn()` mock fetch API，模拟各种响应场景。

**测试策略**:
```typescript
// Mock global fetch
global.fetch = vi.fn();

// Mock successful response
(global.fetch as any).mockResolvedValueOnce(
  new Response(JSON.stringify({ data: 'test' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
);

// Mock timeout (using AbortController)
// Mock retry scenarios (5xx errors)
// Mock content-type errors
```

**关键测试点**:
1. 成功请求和 JSON 解析
2. 超时触发和 AbortController
3. 重试逻辑（网络错误、5xx 错误）
4. 指数退避算法验证
5. Content-Type 验证
6. FetchError 异常处理

### Testing API Modules - External Dependencies

**挑战**: Firebase 和 Algolia API 是外部依赖，需要完全 mock。

**决策**: 使用已创建的 `mockHNApi` helper，提供可定制的 mock 响应。

**测试策略**:
```typescript
import { 
  mockFirebaseBestStories, 
  mockAlgoliaStoriesResponse,
  createMockHNApiFetch 
} from '../../helpers/mockHNApi';

// Mock fetch with custom responses
global.fetch = createMockHNApiFetch();

// Or mock specific responses
global.fetch = vi.fn().mockResolvedValue(
  new Response(JSON.stringify(mockAlgoliaStoriesResponse([1, 2, 3])))
);
```

**关键测试点**:

**Firebase API**:
1. fetchBestStories() - 获取 ID 列表
2. fetchStoryById() - 单个 story 查询
3. fetchCommentById() - 单个 comment 查询
4. 错误处理（404, timeout, 网络错误）

**Algolia API**:
1. searchStories() - 基础搜索
2. searchStories() - 带过滤器（tags, date range）
3. batchFetchStoryDetails() - 批量查询（重要：测试分块逻辑）
4. fetchStoryComments() - 评论查询
5. 分页处理
6. 错误处理和降级

**Mapper**:
1. Algolia → HN 数据结构转换
2. 字段映射（story_id → id, created_at_i → time）
3. 可选字段处理
4. 类型转换验证

### Coverage Improvement Strategy

**当前覆盖率缺口分析**:

**array.ts (94.66%)**:
- 缺失行 43-44: chunk() 函数的数组长度不匹配警告
- 缺失行 99-100: parseJsonArray() 的特定错误上下文日志
- **补充策略**: 构造会触发这些警告的边界测试用例

**html.ts (78.57%)**:
- 缺失行 26-28: stripHTML() 的异常捕获和警告日志
- **补充策略**: 触发 cheerio 解析错误（虽然很难，但可以通过 mock cheerio.load 实现）

**fetch.ts (0%)**:
- 完全未测试
- **策略**: 从零开始，覆盖所有主要路径和错误场景

### Test Data Management

**决策**: 继续使用现有的 fixtures 和 mock 工厂，根据需要扩展。

**扩展计划**:
```typescript
// fixtures.ts 中添加
export function createMockFirebaseStory(overrides) { ... }
export function createMockAlgoliaSearchResponse(overrides) { ... }

// mockHNApi.ts 中添加
export function mockFirebaseStoryResponse(id) { ... }
export function mockAlgoliaSearchError(status) { ... }
```

### Error Scenario Testing

**重要**: API 测试必须覆盖各种错误场景，不仅仅是成功路径。

**必测错误场景**:
1. 网络错误（网络不可达）
2. HTTP 错误（404, 500, 503）
3. 超时错误
4. 无效 JSON 响应
5. 部分成功（批量请求中部分失败）
6. 空结果集

## Risks / Trade-offs

### Risk: Mock 可能与真实 API 行为不一致

**影响**: 测试通过但真实场景失败。

**缓解**:
- Mock 数据基于真实 API 响应结构
- 定期与真实 API 文档对比
- 保留手动集成测试作为最终验证

### Risk: 覆盖率数字好看但测试质量低

**影响**: 高覆盖率但低价值测试。

**缓解**:
- 关注有意义的场景，而非纯粹追求行覆盖率
- 每个测试必须验证实际行为，而非仅仅执行代码
- Code review 时检查测试质量

### Risk: 测试维护负担

**影响**: 测试文件过多，维护困难。

**缓解**:
- 保持测试简洁和聚焦
- 使用 DRY 原则，抽取公共测试辅助函数
- 良好的测试命名和注释

## Migration Plan

### Phase 1: Utils Module Completion (预计 1-2 小时)
1. 创建 fetch.test.ts（最复杂，约 30-40 个测试用例）
2. 补充 array.test.ts（2-3 个测试用例）
3. 补充 html.test.ts（1-2 个测试用例）
4. 验证 Utils 模块 100% 覆盖率

### Phase 2: API Module Testing (预计 2-3 小时)
1. 创建 firebase.test.ts（约 15-20 个测试用例）
2. 创建 algolia.test.ts（约 25-30 个测试用例）
3. 创建 mapper.test.ts（约 10-15 个测试用例）
4. 验证 API 模块 90%+ 覆盖率

### Phase 3: Verification (预计 30 分钟)
1. 运行完整测试套件
2. 生成覆盖率报告
3. 验证目标达成
4. 更新文档

### Rollback Plan
如果遇到问题：
- 测试是纯增量的，可以安全删除任何有问题的测试文件
- 不影响生产代码
- 可以逐个文件提交，便于回滚

## Open Questions

1. **Q**: fetch.ts 的重试逻辑测试是否需要实际等待延迟？
   **A**: 使用 `vi.useFakeTimers()` 模拟时间流逝，避免测试变慢。

2. **Q**: Algolia 批量查询的分块大小（100）是否需要参数化测试？
   **A**: 是的，测试不同批次大小（1, 50, 100, 150）确保分块逻辑正确。

3. **Q**: 是否需要测试 API 的并发请求场景？
   **A**: 不在本 proposal 范围，留给集成测试。

4. **Q**: Mock 数据是否需要覆盖所有 HN API 字段？
   **A**: 覆盖核心字段即可，可选字段测试代表性场景。
