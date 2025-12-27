# batch-translation-service Specification

## Purpose
TBD - created by archiving change optimize-worker-subrequests. Update Purpose after archive.
## Requirements
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
The system SHALL maintain data alignment between input articles and translated summaries when processing batches with missing content. The system SHALL use concurrent single-item processing with code-controlled index mapping to ensure 100% reliable alignment.

#### Scenario: Concurrent single-item processing
- **GIVEN** a batch of 30 articles to summarize
- **AND** concurrency limit is set to 5
- **WHEN** the batch summarization is invoked
- **THEN** the system SHALL process 5 articles concurrently at a time
- **AND** each article SHALL be summarized in a separate LLM request
- **AND** results SHALL be mapped back to correct indices by code logic

#### Scenario: Index mapping guaranteed by code
- **GIVEN** articles with indices [0, 1, 2, 3, 4]
- **WHEN** concurrent summarization completes
- **THEN** each summary SHALL be stored at its original index in the result array
- **AND** the mapping SHALL NOT depend on the order of LLM responses

#### Scenario: Partial failure handling
- **GIVEN** a batch of 5 articles being processed concurrently
- **WHEN** summarization for article at index 2 fails
- **THEN** the system SHALL store empty string at index 2
- **AND** the system SHALL continue processing other articles
- **AND** successful results SHALL be stored at their correct indices

### Requirement: 批量评论摘要
系统 SHALL 使用并发单条处理批量摘要评论，通过代码控制索引映射确保100%可靠对齐。

#### Scenario: Concurrent comment summarization
- **GIVEN** comments for 30 stories to summarize
- **AND** concurrency limit is set to 5
- **WHEN** the batch comment summarization is invoked
- **THEN** the system SHALL process 5 stories concurrently at a time
- **AND** each story's comments SHALL be summarized in a separate LLM request

#### Scenario: Stories with insufficient comments skipped
- **GIVEN** 30 stories where 5 have fewer than 3 comments
- **WHEN** batch comment summarization is invoked
- **THEN** the system SHALL skip the 5 stories with insufficient comments
- **AND** the system SHALL process the remaining 25 stories with concurrency control
- **AND** skipped stories SHALL have empty string at their indices

### Requirement: 统一的 chunk 方法
The system SHALL support chunking arrays while preserving positional information for sparse data.

#### Scenario: 稀疏数组的chunk处理（修改）
- **Given** 输入数组包含 null 或空值，如 `[a, b, null, c, null, d]`
- **And** `batchSize=2`
- **When** `chunk()` 方法被调用
- **Then** 系统 SHALL 返回 `[[a, b], [null, c], [null, d]]`
- **And** 每个批次 SHALL 保持原始数组中的相对位置

#### Scenario: 索引跟踪和结果映射（新增）
- **Given** 系统需要处理有有效内容的项目数组
- **When** 批量处理完成后
- **Then** 系统 SHALL 使用原始索引将结果映射回完整数组
- **And** 返回的数组 SHALL 与输入数组具有相同的长度和顺序
- **And** 无效/缺失内容的位置 SHALL 用空字符串 `''` 填充
- **And** 系统 SHALL 不需要在调用方进行复杂的索引跟踪

### Requirement: 数据对齐验证
The system SHALL validate that output arrays maintain alignment with input arrays. After batch processing completes and before story assembly, the system SHALL validate that all result arrays have the same length as the input story array.

#### Scenario: 输入输出长度验证
- **Given** 系统完成批量翻译操作
- **When** 返回结果数组
- **Then** 结果数组长度 SHALL 等于输入数组长度
- **And** 结果数组中每个元素的位置 SHALL 对应输入数组中的位置

#### Scenario: 缺失内容处理验证
- **Given** 输入数组中包含 null 或空值
- **When** 批量处理完成
- **Then** 结果数组中对应位置 SHALL 为空字符串 `''`
- **And** 系统 SHALL 记录处理过程中跳过的缺失内容
- **And** 调用方 SHALL 在展示层检查空字符串并应用兜底文案（如"暂无描述"、"暂无评论"）

#### Scenario: Runtime array alignment validation (NEW)
**Given** batch translation completes with result arrays  
**When** the system prepares to assemble stories (Phase 2.5)  
**Then** the system SHALL check that all arrays (translatedTitles, contentSummaries, descriptions, commentSummaries) have length equal to filteredStories.length  
**And** the system SHALL throw an error if any array length mismatches  
**And** the error message SHALL include expected length and actual lengths of all arrays  
**And** the system SHALL log the validation result for debugging

### Requirement: Concurrency Configuration
The system SHALL support configurable concurrency for LLM requests to balance throughput and rate limit compliance.

#### Scenario: Default concurrency
- **GIVEN** no LLM_CONCURRENCY environment variable is set
- **WHEN** batch processing is invoked
- **THEN** the system SHALL use default concurrency of 5

#### Scenario: Custom concurrency
- **GIVEN** LLM_CONCURRENCY environment variable is set to 10
- **WHEN** batch processing is invoked
- **THEN** the system SHALL process up to 10 items concurrently

#### Scenario: Concurrency of 1 for sequential processing
- **GIVEN** LLM_CONCURRENCY environment variable is set to 1
- **WHEN** batch processing is invoked
- **THEN** the system SHALL process items one at a time sequentially

