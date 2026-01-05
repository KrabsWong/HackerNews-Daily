# Architecture Refactoring Design Document

## Context

HackerNews Daily 是一个运行在 Cloudflare Workers 上的分布式任务处理系统，使用 D1 数据库进行状态管理。项目已经有较完善的功能实现和文档，但在代码组织、错误处理、测试覆盖率等方面存在优化空间。

## Goals

1. **提升代码质量**：减少重复代码，提高类型安全性
2. **改善可维护性**：统一配置管理，标准化错误处理
3. **增强可靠性**：提升测试覆盖率，加强错误恢复能力
4. **优化性能**：减少依赖项大小，优化数据库查询

## Non-Goals

- 不改变现有功能行为（除非是修复 bug）
- 不引入重大的架构变更（如切换到不同的运行时）
- 不添加新的外部服务依赖

## Detailed Design

### 1. 配置管理统一化

**现状分析**：
```
config/constants.ts          - 硬编码常量和辅助函数
worker/config/validation.ts  - 运行时配置验证
types/worker.ts              - Env 类型定义
```

**设计方案**：

```typescript
// config/schema.ts - 配置模式定义
export interface AppConfig {
  llm: LLMConfig;
  hackernews: HNConfig;
  task: TaskConfig;
  publishers: PublishersConfig;
}

// config/validator.ts - 配置验证器
export class ConfigValidator {
  validate(env: Env): AppConfig | ConfigValidationError;
}

// config/index.ts - 统一导出
export { AppConfig, ConfigValidator, getConfig };
```

**优势**：
- 类型安全的配置访问
- 集中的验证逻辑
- 更好的测试性

**权衡**：
- 需要重构现有配置访问代码
- 可能需要引入轻量级验证库（或手写验证逻辑）

### 2. 错误处理标准化

**现状分析**：
- 不同模块的错误处理策略不一致
- 缺少错误分类和上下文信息
- 日志记录不够结构化

**设计方案**：

```typescript
// types/errors.ts - 错误类型层次结构
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {}
}

export class APIError extends AppError {
  constructor(
    message: string,
    public statusCode: number,
    public provider: string,
    context?: Record<string, unknown>
  ) {}
}

export class ServiceError extends AppError {
  constructor(
    message: string,
    public service: string,
    public operation: string,
    context?: Record<string, unknown>
  ) {}
}

// utils/errorHandler.ts - 统一错误处理
export class ErrorHandler {
  static handle(error: unknown, context: ErrorContext): ErrorResponse;
  static retry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T>;
  static logError(error: Error, context: ErrorContext): void;
}
```

**错误处理策略**：

| 错误类型 | 策略 | 重试 | 降级 |
|---------|------|------|------|
| Network Timeout | 重试 3 次 | ✓ | ✗ |
| API Rate Limit (429) | 指数退避重试 | ✓ | ✗ |
| API Client Error (4xx) | 快速失败 | ✗ | 视情况 |
| API Server Error (5xx) | 重试 3 次 | ✓ | ✗ |
| LLM Parse Error | 重试 1 次 | ✓ | 使用原文 |
| Content Fetch Fail | 快速失败 | ✗ | 使用 meta |
| Publisher Error | 继续其他 | ✗ | ✓ |

**优势**：
- 统一的错误处理逻辑
- 更好的错误追踪和调试
- 明确的降级策略

**权衡**：
- 需要重构所有 try-catch 块
- 可能增加代码复杂度

### 3. 测试覆盖率提升

**现状分析**：
```
Current: 55% lines, 62% functions
Gaps:
  - Publishers: 6-10%
  - Integration: 缺失
  - Error scenarios: 不足
```

**设计方案**：

**Phase 1 (Target: 70% lines, 75% functions)**:
1. Publishers 测试套件（GitHub, Telegram, Terminal）
   - 成功发布场景
   - API 错误处理
   - 重试逻辑
   - 配置验证

2. 增强现有测试
   - 加强断言（移除可选检查）
   - 添加错误场景
   - 改进 Mock 真实性

3. 集成测试基础
   - 完整的 daily export 流程
   - 多 Publisher 协调
   - 状态机转换

**测试架构改进**：
```typescript
// __tests__/helpers/builders.ts - Test builders
export class StoryBuilder {
  withTitle(title: string): this;
  withScore(score: number): this;
  build(): HNStory;
}

// __tests__/helpers/scenarios.ts - Common scenarios
export const scenarios = {
  apiTimeout: () => createTimeoutError(),
  rateLimited: () => createRateLimitError(),
  invalidResponse: () => createInvalidResponse(),
};

// __tests__/integration/fixtures/ - Integration test fixtures
// Realistic API responses captured from actual services
```

**优势**：
- 更高的代码可信度
- 更早发现回归问题
- 更好的重构信心

**权衡**：
- 增加测试编写和维护成本
- 测试执行时间可能增加

### 4. 类型安全增强

**现状分析**：
- 过度使用 `as` 类型断言
- 可选链掩盖了 null/undefined 问题
- 状态机类型不够精确

**设计方案**：

```typescript
// types/statemachine.ts - 状态机类型改进
export type TaskState = 
  | { status: 'init'; data: null }
  | { status: 'list_fetched'; data: { articleCount: number } }
  | { status: 'processing'; data: { completed: number; total: number } }
  | { status: 'aggregating'; data: { stories: ProcessedStory[] } }
  | { status: 'published'; data: { publishedAt: number } }
  | { status: 'archived'; data: { reason: string } };

// Type guards
export function isProcessingState(state: TaskState): state is { status: 'processing'; data: ... } {
  return state.status === 'processing';
}

// types/database.ts - D1 类型改进
export interface D1Result<T> {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
}

// 使用示例
const result = await storage.getTask(taskDate);
if (result.success) {
  // TypeScript 知道 result.data 存在
  console.log(result.data.status);
} else {
  // TypeScript 知道 result.error 存在
  logError(result.error);
}
```

**优势**：
- 编译时捕获更多错误
- 更好的 IDE 智能提示
- 更明确的类型契约

**权衡**：
- 需要重写部分类型定义
- 可能增加类型复杂度

### 5. LLM Provider 抽象优化

**现状分析**：
- DeepSeek/OpenRouter/Zhipu 有重复的错误处理代码
- Rate limiting 处理分散
- 缺少请求日志

**设计方案**：

```typescript
// services/llm/base.ts - 基础 Provider 实现
export abstract class BaseLLMProvider implements LLMProvider {
  abstract getName(): string;
  abstract getModel(): string;
  abstract getRetryDelay(): number;
  
  // 通用错误处理
  protected handleError(error: unknown, context: string): never {
    // 统一的错误转换和日志记录
  }
  
  // 通用重试逻辑
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    // 指数退避重试
  }
  
  // 通用 rate limiting
  protected async rateLimit(): Promise<void> {
    // 基于 provider 的 rate limit 处理
  }
  
  // 通用请求日志
  protected logRequest(request: ChatCompletionRequest): void {
    // 结构化请求日志
  }
}

// services/llm/providers/deepseek.ts - 具体实现
export class DeepSeekProvider extends BaseLLMProvider {
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.logRequest(request);
    return this.withRetry(async () => {
      await this.rateLimit();
      // 实际 API 调用
    }, 3);
  }
}
```

**优势**：
- 减少重复代码
- 统一的错误处理和重试逻辑
- 更容易添加新 provider

**权衡**：
- 增加抽象层可能影响可读性
- 需要确保各 provider 的特殊逻辑得到支持

### 6. Worker 入口点重构

**现状分析**：
- `worker/index.ts` 320 行，职责过重
- 混合了路由、状态机、任务调度

**设计方案**：

```
worker/
├── index.ts              (50 行，入口点)
├── statemachine/
│   ├── index.ts          (状态机协调器)
│   ├── states/           (各个状态的处理逻辑)
│   │   ├── init.ts
│   │   ├── processing.ts
│   │   └── ...
├── routes/
│   ├── index.ts          (路由注册)
│   ├── health.ts         (健康检查)
│   ├── trigger.ts        (手动触发)
│   ├── status.ts         (任务状态)
│   └── ...
├── middleware/
│   ├── logger.ts         (请求日志)
│   ├── cors.ts           (CORS 处理)
│   └── errorHandler.ts   (错误处理)
```

**入口点简化**：
```typescript
// worker/index.ts
export default {
  async scheduled(event, env, ctx) {
    const stateMachine = createStateMachine(env);
    await stateMachine.execute();
  },
  
  async fetch(request, env, ctx) {
    const router = createRouter(env);
    return router.handle(request);
  }
};
```

**优势**：
- 职责分离，更易维护
- 更容易添加新端点或状态
- 更好的测试性

**权衡**：
- 文件数量增加
- 可能过度设计（对于当前规模）

### 7. 数据库查询优化

**现状分析**：
- 缺少查询性能监控
- 部分查询可能缺少索引

**设计方案**：

```sql
-- migrations/0002_add_indexes.sql
CREATE INDEX IF NOT EXISTS idx_articles_task_date_status 
  ON articles(task_date, status);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_status_updated 
  ON daily_tasks(status, updated_at);
```

```typescript
// services/task/storage.ts - 查询性能日志
class TaskStorage {
  private async executeQuery<T>(
    name: string,
    query: D1PreparedStatement
  ): Promise<T> {
    const start = Date.now();
    const result = await query.first<T>();
    const duration = Date.now() - start;
    
    if (duration > 100) {
      logWarn('Slow query detected', { name, duration });
    }
    
    return result;
  }
}
```

**优势**：
- 更快的查询性能
- 更容易发现性能问题

**权衡**：
- 需要测试和验证索引效果
- 额外的日志可能增加输出量

### 8. 监控和可观测性

**设计方案**：

```typescript
// worker/observability/metrics.ts
export class Metrics {
  static recordTaskDuration(stage: TaskStage, duration: number): void;
  static recordAPICall(provider: string, success: boolean, duration: number): void;
  static recordError(category: ErrorCategory, error: Error): void;
}

// worker/observability/tracing.ts
export class Tracer {
  static createTraceId(): string;
  static attachTraceContext(request: Request): Request;
  static logWithTrace(message: string, context: TraceContext): void;
}

// 使用示例
async function handleDistributedExport(env: Env): Promise<void> {
  const traceId = Tracer.createTraceId();
  const start = Date.now();
  
  try {
    // 处理逻辑
    Metrics.recordTaskDuration('export', Date.now() - start);
  } catch (error) {
    Metrics.recordError('export', error);
    Tracer.logWithTrace('Export failed', { traceId, error });
  }
}
```

**优势**：
- 更好的问题追踪
- 性能瓶颈识别
- 更容易的调试

**权衡**：
- 增加代码复杂度
- 可能影响性能（需要测量）

## Implementation Strategy

### Phase 1: 基础设施（2-3 天）
1. 错误处理标准化
2. 测试覆盖率提升（Publishers）
3. 类型安全增强（基础）

**Rationale**: 这些改进对后续重构最关键，且风险较低

### Phase 2: 代码组织（2-3 天）
1. 配置管理统一化
2. Worker 入口点重构
3. LLM Provider 抽象优化

**Rationale**: 基于 Phase 1 的错误处理和类型改进，重构更安全

### Phase 3: 优化和监控（1-2 天）
1. 数据库查询优化
2. 监控和可观测性
3. 依赖项审查

**Rationale**: 性能优化和监控在功能稳定后进行

## Risks and Mitigations

| 风险 | 影响 | 可能性 | 缓解措施 |
|-----|------|--------|---------|
| 重构引入新 bug | 高 | 中 | 提升测试覆盖率，分阶段实施 |
| 性能下降 | 中 | 低 | 基准测试，性能监控 |
| 破坏向后兼容 | 高 | 低 | 保留旧接口，提供迁移指南 |
| 过度设计 | 中 | 中 | 遵循 YAGNI，只实施必要改进 |

## Open Questions

1. 是否引入 Zod 等验证库？还是手写验证逻辑？
2. 错误处理是否需要集成 Sentry 等错误追踪服务？
3. 是否需要实现 API 请求去重/缓存机制？
4. D1 查询性能是否需要更细粒度的监控？
5. 是否考虑将部分逻辑移到 Durable Objects（如果需要更强的一致性）？

## Alternatives Considered

### Alternative 1: 最小改动（仅修复明显问题）
- **优点**：风险低，改动小
- **缺点**：技术债继续积累，未来维护成本更高
- **决策**：不采纳，当前代码质量足以支持更系统的重构

### Alternative 2: 完全重写（从零开始）
- **优点**：可以使用最新的最佳实践
- **缺点**：风险极高，时间成本巨大，可能引入新问题
- **决策**：不采纳，增量重构更安全

### Alternative 3: 引入框架（如 Hono）
- **优点**：提供开箱即用的路由、中间件等
- **缺点**：增加依赖，可能不符合 Cloudflare Workers 最佳实践
- **决策**：考虑但不优先，先手写简单路由层

## Success Metrics

1. **代码质量指标**：
   - 代码重复度 < 5%
   - 类型覆盖率 100%
   - ESLint 错误 = 0

2. **测试指标**：
   - 整体覆盖率 ≥ 70%
   - Publishers 覆盖率 ≥ 85%
   - 集成测试 ≥ 5 个场景

3. **性能指标**：
   - Worker 构建产物 < 500KB
   - 平均处理时间不增加 > 5%
   - 数据库查询 P95 < 100ms

4. **可维护性指标**：
   - 新功能添加时改动文件数 < 5
   - 错误追踪时间减少 30%
   - 配置变更无需代码修改
