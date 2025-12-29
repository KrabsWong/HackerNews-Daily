# Change: Fix Data Consistency Between Title/Content/Comments

## Why

用户遇到标题、页面内容、评论内容混乱/不对应的问题。当前的批量处理流程中存在以下风险点：

1. **批量标题翻译**：LLM 可能返回与输入顺序不同的翻译结果，或返回数量不匹配
2. **空内容处理不一致**：描述和评论为空时的处理逻辑分散在多处，可能产生不一致结果
3. **最终渲染缺少兜底**：当描述或评论为空时，没有统一显示默认文案

## What Changes

### 1. 数据完整性保障
- **新增索引校验机制**：批量翻译后增加逐项校验，确保每个翻译结果与原标题对应
- **强化 fallback 策略**：任何一步处理失败时，保证数据一致性而非继续处理

### 2. 空内容默认值统一
- **描述为空**：统一显示 "暂无描述"
- **评论为空**：统一显示 "暂无评论"
- **确保这些默认值在最终 Markdown 渲染时生效**

### 3. 日志增强
- 增加关键节点的数据对齐日志，便于排查问题

## Impact

- **Affected specs**: 
  - `markdown-output` (添加空内容默认值渲染规范)
  - 新增 `data-integrity` (数据完整性保障规范)
- **Affected code**:
  - `src/services/translator/title.ts` - 批量翻译索引校验
  - `src/worker/sources/hackernews.ts` - 数据装配逻辑
  - `src/services/markdownExporter.ts` - 空内容渲染
