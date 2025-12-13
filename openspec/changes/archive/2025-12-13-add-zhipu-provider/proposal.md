# Proposal: Add Zhipu AI Provider

## Summary

新增智普AI (Zhipu AI) 作为第三个 LLM Provider 选项，允许用户使用智普的 GLM 系列模型进行翻译和摘要生成。默认使用 `glm-4.5-flash` 模型。

## Motivation

1. **国内用户体验**: 智普AI是国内领先的大模型服务商，API 在国内访问稳定，延迟低
2. **成本优化**: glm-4.5-flash 是高性价比的快速模型，适合翻译和摘要等任务
3. **多样化选择**: 增加 Provider 选项，让用户根据需求灵活选择
4. **OpenAI 兼容**: 智普 API 兼容 OpenAI 格式，实现成本低

## Scope

### In Scope
- 新增 `ZhipuProvider` 类实现
- 扩展 `LLMProviderType` 枚举添加 `ZHIPU`
- 新增 `ZHIPU_API` 配置常量
- 扩展 `ProviderEnv` 类型支持智普环境变量
- 更新 provider utilities 支持智普
- 更新 Worker 配置验证支持智普
- 更新文档

### Out of Scope
- 智普特有功能（如 web-search-pro）
- 多模态功能（如 GLM-4V 视觉模型）
- 流式响应支持（保持现有非流式模式）

## API Details

Based on Zhipu AI official documentation:

- **API Endpoint**: `https://open.bigmodel.cn/api/paas/v4/chat/completions`
- **Authentication**: `Authorization: Bearer <API_KEY>`
- **Default Model**: `glm-4.5-flash` (高性价比快速模型)
- **Request Format**: OpenAI-compatible JSON format
- **Concurrency Limit**: **2** (glm-4.5-flash 并发限制为 2)
- **Environment Variables**:
  - `LLM_ZHIPU_API_KEY` - 智普 API 密钥
  - `LLM_ZHIPU_MODEL` - 可选，模型覆盖

## Concurrency Handling

智普 glm-4.5-flash 模型的并发限制为 2，需要特别处理：

1. **增加重试延迟**: 设置较长的 `RETRY_DELAY`（如 2000ms）以应对并发限制触发的 429 错误
2. **文档说明**: 明确告知用户并发限制，建议在高并发场景下选择其他 provider
3. **现有机制复用**: 项目已采用顺序处理模式（非并行），天然适配低并发限制

> 注：当前系统对每篇文章依次调用翻译和摘要 API，不会同时发起大量并发请求，因此并发限制 2 在正常使用场景下不会造成问题。

## Related Changes

- **llm-provider-abstraction**: 添加 Zhipu provider 支持
- **constants-config**: 添加 ZHIPU_API 配置常量

## Dependencies

- 无外部依赖变更
- 复用现有的 `utils/fetch.ts` HTTP 封装

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| API 格式差异 | 已验证智普 API 兼容 OpenAI 格式 |
| 并发限制 (2) | 增加重试延迟，文档明确说明限制 |
| 限流 429 错误 | 复用现有重试机制，延长重试间隔 |
| 国际访问 | 作为可选 provider，不影响其他 provider |

## Success Criteria

1. `LLM_PROVIDER=zhipu` 配置后系统正常工作
2. 翻译和摘要功能正常
3. 并发限制场景下重试机制正常工作
4. 错误处理和重试机制正常
5. 文档更新完整，包含并发限制说明
