# Subrequest预算分析与风险评估

## 关键发现：批量翻译的实际行为

### 问题描述

在设计初期，我们假设所有LLM批量操作都会合并为单次API调用，但实际代码审查发现：

**假设（错误）**:
```typescript
// 我们以为的批量翻译
translateTitlesBatch(8篇)     → 1次 LLM调用
summarizeContentBatch(8篇)    → 1次 LLM调用  
summarizeCommentsBatch(8篇)   → 1次 LLM调用
总计: 3次 subrequest
```

**实际情况（正确）**:
```typescript
// 实际的批量翻译实现
translateTitlesBatch(8篇)     → 1次 LLM调用 ✅ (真批量，JSON数组)
summarizeContentBatch(8篇)    → 8次 LLM调用 ⚠️ (并发单次调用)
summarizeCommentsBatch(8篇)   → 8次 LLM调用 ⚠️ (并发单次调用)
总计: 17次 subrequest
```

### 代码证据

**1. 标题翻译 - 真批量** (`src/services/translator/title.ts:158-309`)
```typescript
export async function translateTitlesBatch(
  provider: LLMProvider,
  titles: string[],
  batchSize: number = 10
): Promise<string[]> {
  // 分批处理，每批合并为单个JSON数组发送给LLM
  const batches = chunk(titles, batchSize);
  
  for (const batch of batches) {
    const result = await provider.chatCompletion({
      messages: [{
        role: 'user',
        content: `Translate these titles to Chinese. Return a JSON array:
        ${JSON.stringify(batch)}`
      }]
    });
    // 1个批次 → 1次LLM调用 ✅
  }
}
```

**2. 内容摘要 - 伪批量** (`src/services/translator/summary.ts:291-360`)
```typescript
export async function summarizeContentBatch(
  provider: LLMProvider,
  contents: (string | null)[],
  maxLength: number,
  concurrency: number = LLM_BATCH_CONFIG.DEFAULT_CONCURRENCY
): Promise<string[]> {
  // 使用并发控制，但每篇文章是独立的LLM调用
  const batches = chunk(itemsToProcess, concurrency);
  
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const summary = await summarizeContent(provider, item.content, maxLength);
        // 每个item → 1次LLM调用 ⚠️
        return { index: item.index, summary };
      })
    );
  }
}
```

**3. 评论摘要 - 伪批量** (`src/services/translator/summary.ts:376-441`)
```typescript
export async function summarizeCommentsBatch(
  provider: LLMProvider,
  commentArrays: HNComment[][],
  concurrency: number = LLM_BATCH_CONFIG.DEFAULT_CONCURRENCY
): Promise<string[]> {
  // 同样使用并发单次调用，不是真批量
  const batches = chunk(storiesToProcess, concurrency);
  
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        const summary = await summarizeCommentsWithRetry(provider, item.comments);
        // 每个story → 1次LLM调用 ⚠️
        return { index: item.index, summary };
      })
    );
  }
}
```

### Fallback风险分析

**标题翻译的Fallback机制** (`title.ts:215-230`):
```typescript
// 批量失败时的处理
if (!result.ok) {
  console.warn('Batch API error, using original titles as fallback');
  for (let i = 0; i < batch.length; i++) {
    allTranslations.push(batch[i]); // 直接返回原文
  }
  continue; // ✅ 不会fallback到单次调用，安全
}
```

**内容/评论摘要没有fallback机制**:
- 每篇文章本身就是单次调用
- 失败后返回空字符串或null
- 不存在"批量失败后逐个重试"的风险 ✅

**结论**: 不存在"批量失败后fallback到逐个调用"的风险，因为内容/评论摘要本身就是单次调用。

## 修正后的Subrequest预算

### 单批次详细计算（批次大小=6）

```
1. D1查询pending文章: 0 subrequest (本地绑定)
2. Crawler API获取内容: 6 × 1 = 6 subrequest
3. Algolia获取评论: 6 × 1 = 6 subrequest
4. LLM翻译标题: 1 subrequest (真批量)
5. LLM翻译内容摘要: 6 × 1 = 6 subrequest (并发单次)
6. LLM总结评论: 6 × 1 = 6 subrequest (并发单次)
7. D1更新状态: 0 subrequest (本地绑定)

总计: 6 + 6 + 1 + 6 + 6 = 25 subrequest
```

### 不同批次大小的对比

| 批次大小 | Subrequest/批次 | 批次数 | 总时间 | Buffer | 推荐 |
|---------|----------------|-------|-------|--------|------|
| 4篇 | 17 | 8 | 80min | 28 | 过于保守 |
| **6篇** | **25** | **5** | **50min** | **20** | ✅ **推荐** |
| 8篇 | 33 | 4 | 40min | 12 | 风险较高 |
| 10篇 | 41 | 3 | 30min | 4 | ❌ 危险 |

**选择理由**:
- **6篇/批次**: 25 subrequest + 20 buffer = 45 < 50限制
- **安全余量**: 20个buffer可应对意外情况（如重试、API响应慢导致额外调用等）
- **完成时间**: 50分钟可接受（非实时需求）
- **批次数**: 5批次不会过于分散

## 风险评估

### 风险1: 意外subrequest消耗

**场景**: LLM API返回错误但不是429（如500、502），导致重试

**当前缓解**:
```typescript
// title.ts 有重试逻辑
for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  const result = await provider.chatCompletion(...);
  if (result.ok) return;
  
  // 仅对429重试
  const isRateLimited = result.error.status === 429;
  if (isRateLimited && attempt < MAX_RETRIES) {
    await delay(provider.getRetryDelay());
    continue;
  }
  return title; // 非429错误直接返回原文，不重试
}
```

**风险等级**: 🟢 低  
**理由**: 仅对429重试，其他错误直接返回fallback

### 风险2: D1绑定调用意外计入subrequest

**场景**: Cloudflare文档错误，D1实际计入subrequest

**当前缓解**:
- 预留20个buffer可应对（即使D1每批次3-5次调用也在安全范围内）
- 监控首日执行，记录实际subrequest消耗

**风险等级**: 🟡 中  
**理由**: 官方文档明确说明D1不计入，但缺乏实际验证

### 风险3: 批次大小配置错误

**场景**: 用户配置`TASK_BATCH_SIZE=15`导致超限

**当前缓解**:
```typescript
// 启动时验证批次大小
function validateBatchSize(batchSize: number): void {
  const estimatedSubrequests = batchSize * 4 + 1; // 保守估计
  if (estimatedSubrequests > 40) {
    throw new Error(
      `Batch size ${batchSize} would exceed subrequest limit. ` +
      `Estimated: ${estimatedSubrequests} > 40. Please use ≤6.`
    );
  }
}
```

**风险等级**: 🟢 低  
**理由**: 启动时验证，配置错误直接失败

### 风险4: Crawler API超时导致重试

**场景**: Crawler API响应慢，触发超时重试

**当前缓解**:
- 设置合理的超时时间（5s per URL）
- 超时后直接fallback到description，不重试Crawler
- 记录失败文章到D1，可后续手动重试

**风险等级**: 🟢 低  
**理由**: 超时不重试，graceful degradation

## 未来优化方向

### 优化1: 实现真批量内容摘要

**当前问题**: `summarizeContentBatch`是并发单次调用

**优化方案**:
```typescript
// 改为类似标题翻译的JSON数组批量请求
const prompt = `Summarize these articles in Chinese. Return a JSON array:
${JSON.stringify(contents.map((c, i) => ({ index: i, content: c })))}`;

// 6篇内容 → 1次LLM调用
```

**收益**: 单批次subrequest从25降到20

**挑战**: 
- LLM需要处理更长的context（6篇文章全文）
- 可能触发token限制
- 需要严格验证JSON输出顺序

### 优化2: 实现真批量评论摘要

**当前问题**: `summarizeCommentsBatch`是并发单次调用

**优化方案**: 同上，改为JSON数组批量请求

**收益**: 单批次subrequest从25降到15

**挑战**: 同上

### 优化3: 动态批次大小调整

**当前问题**: 固定批次大小6，未充分利用剩余quota

**优化方案**:
```typescript
function calculateBatchSize(remainingQuota: number): number {
  // 根据剩余quota动态调整
  const maxSafe = Math.floor((remainingQuota - 10) / 4);
  return Math.min(maxSafe, 6); // 最大不超过6
}
```

**收益**: 在quota充足时可适当增大批次，缩短完成时间

**挑战**: 需要实现subrequest计数器（Cloudflare未提供原生API）

## 监控指标

部署后需重点监控以下指标：

1. **批次subrequest消耗**
   - 目标: <25/批次
   - 告警阈值: >30/批次
   - 危险阈值: >40/批次

2. **任务完成时间**
   - 目标: <60分钟
   - 告警阈值: >90分钟
   - 危险阈值: >120分钟

3. **D1查询延迟**
   - 目标: <100ms
   - 告警阈值: >500ms

4. **文章失败率**
   - 目标: <5%
   - 告警阈值: >10%

## 结论

通过将批次大小从8篇调整为6篇，我们确保了即使在最坏情况下（所有LLM调用都是单次，存在重试等）也能保持在安全阈值内。

**最终方案**:
- ✅ 批次大小: 6篇
- ✅ Subrequest/批次: 25个（预留20个buffer）
- ✅ 总批次数: 5批次
- ✅ 完成时间: 约50分钟
- ✅ 风险等级: 低

该方案在成本、速度和可靠性之间取得了良好平衡，适合Cloudflare Workers免费版的限制。
