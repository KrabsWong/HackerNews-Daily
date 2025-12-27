# Change: 修复批量总结中索引与内容错乱问题

## Why

经过多次迭代仍无法解决评论要点和文章无法正确对应的问题。例如，在 2025-12-26 的数据中，第5篇文章 "Seven Diabetes Patients Die Due to Undisclosed Bug in Abbott's Glucose Monitors" 的评论要点却显示了第7篇文章 "My insulin pump controller uses the Linux kernel. It also violates the GPL" 的版权相关内容。

**根本原因分析**：

在 `summarizeCommentsBatch` 和 `summarizeContentBatch` 函数中，当调用 LLM 进行批量处理时：
1. 输入格式为 `[{index: 0, comments: "..."}, {index: 1, comments: "..."}, ...]`
2. 但输出格式仅为简单的字符串数组 `["摘要1", "摘要2", ...]`
3. **代码假设 LLM 返回的数组顺序与输入顺序严格一致**
4. **但 LLM 不保证遵守输入顺序**，可能按其内部逻辑重排

即使要求 LLM 返回带索引的格式，也存在以下风险：
- LLM 可能完全忽略索引要求
- LLM 可能返回格式错误的 JSON
- 不同 LLM provider 行为不一致

## What Changes

### 方案选择

| 方案 | 可靠性 | 性能 | 复杂度 |
|------|--------|------|--------|
| A: 要求 LLM 返回带索引的 JSON | 中 | 高 | 中 |
| B: 完全改用单条顺序处理 | 高 | 低 | 低 |
| **C: 并发单条处理 (推荐)** | **高** | **中** | **低** |

**选择方案 C**：并发单条处理

- 每个文章/评论单独调用 LLM，确保一对一映射
- 使用 `Promise.all` 并发处理，减少总时间
- 可配置并发数控制 rate limit

### 核心修复

1. **移除批量 prompt 逻辑**：不再尝试在一个请求中处理多个文章/评论

2. **改用并发单条处理**：
   ```typescript
   // 之前：一个请求处理 10 个
   const results = await batchSummarize(items);
   
   // 之后：10 个并发请求各处理 1 个
   const results = await Promise.all(items.map(item => summarize(item)));
   ```

3. **索引映射在代码层面保证**：
   ```typescript
   const results = await Promise.all(
     items.map(async (item, idx) => {
       const summary = await summarize(item);
       return { index: idx, summary };  // 索引由代码控制，不依赖 LLM
     })
   );
   ```

4. **可选的并发限制**：通过 p-limit 或简单的分批并发控制 rate limit

### 影响范围

- `src/services/translator/summary.ts`：重构 `summarizeContentBatch` 和 `summarizeCommentsBatch`
- 移除批量 prompt 相关代码
- 保留现有的单条处理函数 `summarizeContent` 和 `summarizeComments`

## Impact

- **Affected specs**: `batch-translation-service`
- **Affected code**: 
  - `src/services/translator/summary.ts:281-477` (summarizeContentBatch)
  - `src/services/translator/summary.ts:487-676` (summarizeCommentsBatch)
- **Breaking changes**: 无，仅内部实现变更
- **Performance**: 
  - 请求数增加（从 3 个批量请求变为 30 个单条请求）
  - 但通过并发处理，总时间增加有限
  - 可靠性显著提升，消除索引错乱问题
- **Risk**: 低，复用已有的单条处理逻辑
