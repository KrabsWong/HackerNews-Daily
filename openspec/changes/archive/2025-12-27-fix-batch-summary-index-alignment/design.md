# Design: 批量总结索引对齐修复

## Context

当前批量总结的实现存在一个隐式假设：LLM 返回的数组顺序与输入顺序一致。这个假设不被 LLM 保证，导致间歇性的内容错乱问题。

即使要求 LLM 返回带索引的格式，仍存在以下不可控因素：
1. LLM 可能忽略格式要求
2. 不同 provider/model 行为不一致
3. 解析复杂度增加，引入新的失败点

## Goals / Non-Goals

**Goals**:
- **彻底消除**索引与内容错乱问题
- 保持合理的处理性能
- 保持代码简洁，减少复杂度

**Non-Goals**:
- 保持当前的批量 prompt 方式
- 追求极致的 API 调用效率

## Decisions

### Decision 1: 采用并发单条处理替代批量 prompt

**选择**: 完全移除批量 prompt，改用并发单条处理

**理由**:
1. **可靠性优先**：单条处理时，索引映射完全由代码控制，不依赖 LLM 行为
2. **简化代码**：移除复杂的批量 JSON 解析和 fallback 逻辑
3. **复用现有代码**：`summarizeContent` 和 `summarizeComments` 已经过验证
4. **性能可接受**：通过并发处理，总时间增加有限

**性能分析**:
```
当前批量方式 (假设 30 篇文章，batchSize=10):
- 请求数: 3 个批量请求
- 串行等待: 3 × ~5s = ~15s (假设每个批量请求 5s)

并发单条方式:
- 请求数: 30 个单条请求  
- 并发等待: 30 个并发 / 并发数 × ~2s
  - 无限制并发: ~2s (受 rate limit 影响)
  - 并发数=5: 6 轮 × 2s = ~12s
  - 并发数=10: 3 轮 × 2s = ~6s
```

结论：并发单条处理的性能与批量方式相当，但可靠性大幅提升。

### Decision 2: 使用简单的分批并发控制

**选择**: 使用 `chunk` + `Promise.all` 实现分批并发

**理由**:
- 不引入新依赖 (如 p-limit)
- 复用现有的 `chunk` 函数
- 代码简单易理解

**实现模式**:
```typescript
async function summarizeWithConcurrency(
  items: Item[],
  concurrency: number
): Promise<string[]> {
  const results: string[] = new Array(items.length).fill('');
  const batches = chunk(
    items.map((item, index) => ({ item, index })),
    concurrency
  );
  
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async ({ item, index }) => {
        const summary = await summarizeSingle(item);
        return { index, summary };
      })
    );
    
    // 索引由代码控制，100% 可靠
    for (const { index, summary } of batchResults) {
      results[index] = summary;
    }
  }
  
  return results;
}
```

### Decision 3: 并发数配置

**选择**: 默认并发数 = 5，可通过环境变量 `LLM_CONCURRENCY` 配置

**理由**:
- 5 是保守值，对大多数 LLM provider 友好
- 可根据实际 rate limit 调整
- 与现有 `LLM_BATCH_SIZE` 配置风格一致

## Risks / Trade-offs

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| API 调用数增加导致费用上升 | 确定 | 低 | 单条请求 token 数更少，总 token 量相近 |
| Rate limit 触发更频繁 | 中 | 中 | 通过并发数控制；保留重试逻辑 |
| 处理时间增加 | 低 | 低 | 并发处理抵消单条请求开销 |

## Migration Plan

1. 修改 `summarizeContentBatch` 为并发单条处理
2. 修改 `summarizeCommentsBatch` 为并发单条处理
3. 移除批量 prompt 相关代码
4. 更新测试
5. 使用 2025-12-26 数据验证

## Open Questions

无。方案简单明确。
