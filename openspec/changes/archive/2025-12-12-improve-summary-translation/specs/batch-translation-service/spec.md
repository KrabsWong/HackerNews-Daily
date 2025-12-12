# batch-translation-service Specification Delta

## Overview
修改批量翻译服务的默认配置和 prompt 格式，解决输出带有序号标记的问题，并将默认批量大小改为 1（单独请求模式）。

## MODIFIED Requirements

### Requirement: 集中化批量配置
系统 SHALL 通过 `LLM_BATCH_CONFIG` 提供可配置的批量处理参数，**默认使用单请求模式**。

#### Scenario: 加载批量配置（修改后）
**Given** 系统正在初始化  
**When** 配置被加载  
**Then** 系统 SHALL 读取 `LLM_BATCH_CONFIG` 配置  
**And** `DEFAULT_BATCH_SIZE=1` 表示默认每批处理 1 个请求（单独请求模式）  
**And** `MAX_BATCH_SIZE=0` 表示无上限  
**And** `MAX_CONTENT_PER_ARTICLE=0` 表示不截断文章内容

#### Scenario: 环境变量覆盖
**Given** 环境变量 `LLM_BATCH_SIZE` 已设置  
**When** 系统解析批量大小  
**Then** 系统 SHALL 使用环境变量值  
**And** 值大于 1 时启用批量模式

### Requirement: 批量标题翻译
系统 SHALL 在 LLM API 调用中翻译标题，**prompt 中不使用序号占位符**。

#### Scenario: 单请求翻译标题（新增）
**Given** 系统收集了 30 个标题需要翻译  
**And** `batchSize=1`（默认单请求模式）  
**When** `translateTitlesBatch` 被调用  
**Then** 系统 SHALL 将每个标题作为独立批次处理  
**And** 系统 SHALL 发送 30 个独立的 LLM API 请求  
**And** 系统 SHALL 返回与输入顺序相同的翻译结果

#### Scenario: 批量翻译标题（启用批量模式）
**Given** 系统收集了 30 个标题需要翻译  
**And** `batchSize=10`（批量模式）  
**When** `translateTitlesBatch` 被调用  
**Then** 系统 SHALL 将标题格式化为 JSON 数组  
**And** prompt 输出格式示例 SHALL NOT 包含 "翻译1"、"翻译2" 等序号  
**And** 系统 SHALL 返回与输入顺序相同的翻译结果

### Requirement: 批量内容摘要
系统 SHALL 批量摘要文章内容，**prompt 中不使用序号占位符**。

#### Scenario: 单请求摘要内容（新增）
**Given** 系统有 30 篇文章内容需要摘要  
**And** `batchSize=1`（默认）  
**When** `summarizeContentBatch` 被调用  
**Then** 系统 SHALL 将每篇文章作为独立批次处理  
**And** 系统 SHALL 返回与输入顺序相同的摘要结果

#### Scenario: 批量摘要内容无序号标记（修改）
**Given** 系统有多篇文章内容需要批量摘要  
**And** `batchSize > 1`  
**When** `summarizeContentBatch` 被调用  
**Then** prompt 输出格式示例 SHALL NOT 包含 "摘要1"、"摘要2" 等序号  
**And** prompt SHALL 明确指示不要添加任何序号或标记  
**And** 返回的摘要内容 SHALL NOT 包含 "文章1"、"文章2" 等前缀

### Requirement: 批量评论摘要
系统 SHALL 批量摘要评论，**prompt 中不使用序号占位符**。

#### Scenario: 批量摘要评论无序号标记（修改）
**Given** 系统有多个故事的评论需要批量摘要  
**And** `batchSize > 1`  
**When** `summarizeCommentsBatch` 被调用  
**Then** prompt 输出格式示例 SHALL NOT 包含 "摘要1"、"摘要2" 等序号  
**And** 返回的摘要内容 SHALL NOT 包含序号前缀

### Requirement: 统一的 chunk 方法
系统 SHALL 使用统一的 chunk 方法支持灵活的分批策略，**包括单请求模式**。

#### Scenario: batchSize 为 1 单请求模式（新增）
**Given** `batchSize=1`  
**When** `chunk([a, b, c])` 方法被调用  
**Then** 系统 SHALL 返回 `[[a], [b], [c]]`（每个元素独立批次）

#### Scenario: batchSize 为 0 不分批
**Given** `batchSize=0`  
**When** `chunk()` 方法被调用  
**Then** 系统 SHALL 返回包含整个数组的单个批次

#### Scenario: batchSize 大于数组长度
**Given** `batchSize >= array.length`  
**When** `chunk()` 方法被调用  
**Then** 系统 SHALL 返回包含整个数组的单个批次
