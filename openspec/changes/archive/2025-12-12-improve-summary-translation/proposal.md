# Proposal: improve-summary-translation

## Summary
改进文章摘要翻译功能，解决批量请求时输出带有"文章1"/"摘要1"等序号标记的问题，并将默认批量大小从不限制改为每批 1 个请求（单独请求），同时保留批量处理能力作为可配置选项。

## Problem Statement

### 问题 1: 批量翻译输出带有序号标记
当前批量摘要翻译的 prompt 中，输出格式示例使用了 `["摘要1", "摘要2", ...]` 这样的占位符，导致 AI 模型可能会在实际输出中保留这些序号标记（如 "文章1: xxx" 或 "摘要1: xxx"），污染了翻译结果。

### 问题 2: 默认批量大小不合理
当前配置 `LLM_BATCH_CONFIG.DEFAULT_BATCH_SIZE = 0` 表示不分批处理（一次性处理所有内容）。这可能导致：
- 单次请求 payload 过大
- AI 模型对多篇文章的处理质量下降
- 输出格式更容易出错

## Proposed Solution

### 修复 1: 改进批量请求的 prompt 格式
- 移除 prompt 中 "摘要1"、"翻译1" 等序号占位符
- 使用更明确的无序号输出格式示例
- 添加明确指令禁止在输出中添加序号标记

### 修复 2: 调整默认批量大小
- 将 `LLM_BATCH_CONFIG.DEFAULT_BATCH_SIZE` 改为 `1`（默认每批 1 个请求）
- 保留批量能力，用户可通过配置或环境变量启用批量模式
- 当 `batchSize = 1` 时，实际调用的是单独请求逻辑

## Affected Capabilities
- `batch-translation-service`: 修改默认批量大小和 prompt 格式

## Out of Scope
- 不修改翻译服务的其他逻辑
- 不修改内容提取或评论抓取功能

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 单独请求增加 API 调用次数 | High | Low | 这是预期行为，用户可通过配置恢复批量模式 |
| 批量模式用户需要手动配置 | Medium | Low | 在文档中说明配置方法 |

## Success Criteria
1. 翻译输出不再包含 "文章1"、"摘要1" 等序号标记
2. 默认使用单独请求模式，每篇文章单独一个 API 调用
3. 用户可通过 `LLM_BATCH_SIZE` 环境变量或配置恢复批量模式
