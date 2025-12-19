# batch-translation-service Specification Delta

## Overview
Fix data alignment issues in batch translation when articles have missing content. Ensure translated results maintain correct positional correspondence with input articles.

## MODIFIED Requirements

### Requirement: 批量内容摘要
The system SHALL maintain data alignment between input articles and translated summaries when processing batches with missing content. Return arrays always have the same length as input arrays, using empty strings for null/missing content.

#### Scenario: 处理缺失内容的数据对齐
- **Given** 系统有 20 篇文章需要批量摘要
- **And** 第 13 篇文章没有内容（爬虫获取失败）
- **When** `summarizeContentBatch` 被调用，批量大小为 10
- **Then** 系统 SHALL 正确处理 20 篇文章输入
- **And** 系统 SHALL 返回包含 20 个元素的 string 数组
- **And** 第 13 个元素 SHALL 为空字符串 `''`（对应缺失内容的文章）
- **And** 其他元素的摘要 SHALL 正确对应各自的原文章
- **And** 返回数组长度 SHALL 始终等于输入数组长度

#### Scenario: 稀疏数组的批次处理
- **Given** 系统有 15 篇文章需要批量翻译标题
- **And** 其中 5 篇文章内容为空或 null
- **When** `translateTitlesBatch` 被调用，批量处理
- **Then** 系统 SHALL 维护原始输入顺序
- **And** 返回的翻译结果 SHALL 与输入数组长度相同
- **And** 缺失内容的文章对应位置 SHALL 为空字符串 `''`
- **And** 结果数组中每个元素的位置 SHALL 精确对应输入数组中的位置

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

## ADDED Requirements

### Requirement: 数据对齐验证
The system SHALL validate that output arrays maintain alignment with input arrays.

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