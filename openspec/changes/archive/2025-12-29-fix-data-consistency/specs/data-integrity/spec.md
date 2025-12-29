# data-integrity Specification Delta

## Overview

定义数据处理流程中的完整性保障机制，确保标题、描述、评论三者始终对应同一个 story。

## ADDED Requirements

### Requirement: 批量翻译索引一致性保障

系统在批量翻译标题时 SHALL 确保返回结果与输入顺序严格一致。

#### Scenario: 批量翻译结果数量匹配

**Given** 输入 10 个标题进行批量翻译  
**When** LLM 返回翻译结果  
**Then** 系统 SHALL 验证返回数组长度等于 10  
**And** 如果长度不匹配，SHALL 记录警告日志并使用原标题作为 fallback

#### Scenario: 批量翻译结果顺序校验

**Given** 输入标题数组 ["Title A", "Title B", "Title C"]  
**When** 批量翻译完成  
**Then** 返回数组 SHALL 保持相同索引对应关系  
**And** 系统 SHALL 在日志中输出对照记录便于验证

### Requirement: 数据装配完整性验证

系统在组装 ProcessedStory 时 SHALL 验证所有必需字段都已填充。

#### Scenario: 装配时缺失字段处理

**Given** 第 i 个 story 的 description 为空字符串或 undefined  
**When** 组装 ProcessedStory  
**Then** 系统 SHALL 将 description 设置为 "暂无描述"

#### Scenario: 装配时评论缺失处理

**Given** 第 i 个 story 的 commentSummary 为空字符串或 undefined  
**When** 组装 ProcessedStory  
**Then** 系统 SHALL 将 commentSummary 设置为 "暂无评论"

### Requirement: 数据对齐日志记录

系统 SHALL 在关键处理节点记录数据对齐信息便于问题排查。

#### Scenario: 批量处理后记录对齐信息

**Given** 批量翻译/摘要完成  
**When** 进入数据装配阶段  
**Then** 系统 SHALL 记录日志包含：  
- 原始 story 数量  
- 翻译标题数量  
- 描述数量  
- 评论摘要数量

#### Scenario: 检测到数量不一致

**Given** 任意两个数组长度不相等  
**When** 进行对齐验证  
**Then** 系统 SHALL 抛出错误并记录详细的数量差异信息  
**And** 不得继续处理以避免数据错位
