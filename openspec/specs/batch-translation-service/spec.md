# batch-translation-service Specification

## Purpose
TBD - created by archiving change optimize-worker-subrequests. Update Purpose after archive.
## Requirements
### Requirement: 集中化批量配置
系统 SHALL 通过 `LLM_BATCH_CONFIG` 提供可配置的批量处理参数。

#### Scenario: 加载批量配置
**Given** 系统正在初始化  
**When** 配置被加载  
**Then** 系统 SHALL 读取 `LLM_BATCH_CONFIG` 配置  
**And** `DEFAULT_BATCH_SIZE=0` 表示不分批处理  
**And** `MAX_BATCH_SIZE=0` 表示无上限  
**And** `MAX_CONTENT_PER_ARTICLE=0` 表示不截断文章内容  

#### Scenario: 环境变量覆盖
**Given** 环境变量 `LLM_BATCH_SIZE` 已设置  
**When** 系统解析批量大小  
**Then** 系统 SHALL 使用环境变量值  
**And** 值为 0 时不分批处理

### Requirement: 批量标题翻译
系统 SHALL 在单个 LLM API 调用中翻译多个标题以减少 subrequests。

#### Scenario: 批量翻译所有标题
**Given** 系统收集了 30 个标题需要翻译  
**And** `batchSize=0`（不分批）  
**When** `translateTitlesBatch` 被调用  
**Then** 系统 SHALL 将所有标题格式化为 JSON 数组  
**And** 系统 SHALL 发送单个 LLM API 请求  
**And** 系统 SHALL 解析响应为翻译后的标题数组  
**And** 系统 SHALL 返回与输入顺序相同的翻译结果  

#### Scenario: 处理批量翻译失败
**Given** 批量翻译请求失败或返回无效格式  
**When** 检测到错误  
**Then** 系统 SHALL 记录错误详情  
**And** 系统 SHALL 自动回退到单独翻译  
**And** 系统 SHALL 继续处理而不中断整个导出

### Requirement: 批量内容摘要
系统 SHALL 批量摘要多篇文章内容以减少 subrequests。

#### Scenario: 无内容长度限制的批量摘要
**Given** 系统有 30 篇文章内容需要摘要  
**And** `MAX_CONTENT_PER_ARTICLE=0`  
**When** `summarizeContentBatch` 被调用  
**Then** 系统 SHALL 使用完整的文章内容  
**And** 系统 SHALL 根据 batchSize 分批或一次性处理  
**And** 系统 SHALL 返回与输入顺序相同的摘要结果  

#### Scenario: 处理空内容
**Given** 部分文章的 fullContent 为 null 或空  
**When** 准备批量摘要  
**Then** 系统 SHALL 跳过空内容  
**And** 系统 SHALL 在结果中为跳过的位置返回 null

### Requirement: 批量评论摘要
系统 SHALL 批量摘要多个故事的评论以减少 subrequests。

#### Scenario: 批量摘要评论
**Given** 系统有 30 个故事的评论  
**When** `summarizeCommentsBatch` 被调用  
**Then** 系统 SHALL 过滤掉评论数 <3 的故事  
**And** 系统 SHALL 根据 batchSize 分批或一次性处理  
**And** 系统 SHALL 返回摘要数组（评论不足的返回 null）

### Requirement: 统一的 chunk 方法
系统 SHALL 使用统一的 chunk 方法支持灵活的分批策略。

#### Scenario: batchSize 为 0 不分批
**Given** `batchSize=0`  
**When** `chunk()` 方法被调用  
**Then** 系统 SHALL 返回包含整个数组的单个批次  

#### Scenario: batchSize 大于数组长度
**Given** `batchSize >= array.length`  
**When** `chunk()` 方法被调用  
**Then** 系统 SHALL 返回包含整个数组的单个批次

