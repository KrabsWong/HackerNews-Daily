# Batch Translation Service Specification Delta

## Overview

This delta modifies the batch translation service requirements to ensure proper index alignment when assembling translated results. The change addresses a critical bug where `push()`-based array construction and `||` operators cause data misalignment between titles, descriptions, and comment summaries.

## MODIFIED Requirements

### Requirement: 批量内容摘要
The system SHALL maintain data alignment between input articles and translated summaries when processing batches with missing content. Return arrays always have the same length as input arrays, using empty strings for null/missing content. The system SHALL use index assignment instead of `push()` operations when assembling description arrays, and SHALL use explicit empty string checks (`!== ''`) instead of falsy checks (`||`) when applying fallback values.

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

#### Scenario: Building descriptions array with index assignment (NEW)
**Given** the system has content summaries with empty strings for missing content  
**When** the system builds the descriptions array  
**Then** the system SHALL initialize `descriptions` as `new Array(N)` where N is the story count  
**And** the system SHALL assign values using `descriptions[i] = value` for each index i  
**And** the system SHALL NOT use `push()` operations  
**And** empty strings in content summaries SHALL trigger fallback translation

#### Scenario: Explicit empty string handling in assembly (NEW)
**Given** batch results contain empty strings for missing items  
**When** the system assembles final story objects  
**Then** the system SHALL check `value !== ''` before applying fallback text  
**And** the system SHALL NOT use `||` operator which treats `''` as falsy  
**And** fallback text ("暂无描述", "暂无评论") SHALL only appear for empty strings

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

## Implementation Notes

### Key Changes

1. **Index-based description construction** in `src/worker/sources/hackernews.ts:173-182`:
   ```typescript
   // Before: push()-based (order-dependent, fragile)
   const descriptions: string[] = [];
   for (let i = 0; i < filteredStories.length; i++) {
     if (contentSummaries[i]) {
       descriptions.push(contentSummaries[i]);
     } else {
       descriptions.push(await translator.translateDescription(...));
     }
   }
   
   // After: index-based (guaranteed alignment)
   const descriptions: string[] = new Array(filteredStories.length);
   for (let i = 0; i < filteredStories.length; i++) {
     if (contentSummaries[i]) {
       descriptions[i] = contentSummaries[i];
     } else {
       descriptions[i] = await translator.translateDescription(...);
     }
   }
   ```

2. **Explicit empty string checks** in `src/worker/sources/hackernews.ts:204-205`:
   ```typescript
   // Before: || operator treats '' as falsy
   description: descriptions[i] || '暂无描述',
   commentSummary: commentSummaries[i] || '暂无评论',
   
   // After: explicit empty string check
   description: descriptions[i] !== '' ? descriptions[i] : '暂无描述',
   commentSummary: commentSummaries[i] !== '' ? commentSummaries[i] : '暂无评论',
   ```

3. **Array length validation** after Phase 2 batch processing:
   ```typescript
   logInfo('Validating array alignment');
   const expectedLength = filteredStories.length;
   const arrayLengths = {
     translatedTitles: translatedTitles.length,
     contentSummaries: contentSummaries.length,
     descriptions: descriptions.length,
     commentSummaries: commentSummaries.length,
   };
   
   const allLengthsMatch = Object.values(arrayLengths).every(len => len === expectedLength);
   if (!allLengthsMatch) {
     logError('Array length mismatch detected', new Error('Alignment validation failed'), {
       expected: expectedLength,
       actual: arrayLengths,
     });
     throw new Error(`Array alignment validation failed: expected ${expectedLength} items, got ${JSON.stringify(arrayLengths)}`);
   }
   
   logInfo('Array alignment validated', arrayLengths);
   ```

### Testing Requirements

- Unit tests for description assembly with mixed content availability (5 tests added)
- Integration tests for array length validation
- Regression tests for alignment scenarios
- All 495 existing tests pass

### Success Criteria

- All arrays maintain the same length as `filteredStories`
- `processedStories[i]` always corresponds to `filteredStories[i]`
- Empty strings are handled consistently across all fields
- Fallback text appears only when appropriate
- Zero array length validation errors in production
