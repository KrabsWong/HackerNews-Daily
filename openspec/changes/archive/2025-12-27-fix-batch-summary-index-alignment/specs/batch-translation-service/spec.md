# batch-translation-service Specification Delta

## Overview

修复批量总结服务中由于 LLM 返回顺序不保证导致的索引与内容错乱问题。通过改用并发单条处理替代批量 prompt，确保索引映射完全由代码控制，消除对 LLM 输出顺序的依赖。

## MODIFIED Requirements

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

## ADDED Requirements

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

## Notes

This change replaces batch JSON prompt processing with concurrent single-item processing.
The batch JSON prompt approach was removed because it relied on LLM returning results in the same order as input, which is not guaranteed. This caused index-content misalignment issues.
The new approach uses code-controlled index mapping which guarantees correct alignment.
