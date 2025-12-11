# batch-comment-fetching Specification Delta

## Overview

引入使用 Algolia HN Search API 的批量评论获取能力，替代单独的 Firebase API 调用。这将 subrequests 从 ~330 减少到 30。

## ADDED Requirements

### Requirement: Algolia 评论查询
系统 SHALL 使用 Algolia HN Search API 为每个 story 获取评论。

#### Scenario: 获取 Story 的评论
**Given** 系统需要获取一个 story 的 10 条评论  
**When** `fetchCommentsFromAlgolia` 函数被调用  
**Then** 系统 SHALL 使用 `tags=comment,story_XXX` 格式查询  
**And** 系统 SHALL 返回 HNComment 格式的评论  
**And** 系统 SHALL 进行 1 次 API 请求  

#### Scenario: 批量获取多个 Stories 的评论
**Given** 系统需要获取 30 个 stories 的评论  
**When** `fetchCommentsBatchFromAlgolia` 函数被调用  
**Then** 系统 SHALL 为每个 story 单独查询评论  
**And** 系统 SHALL 进行 30 次 API 请求（每个 story 1 次）  
**And** 系统 SHALL 返回 2D 数组：`HNComment[][]`  

### Requirement: 评论分组
系统 SHALL 按父 story ID 分组获取的评论。

#### Scenario: 将评论映射到 Stories
**Given** 从 Algolia 获取了评论  
**When** 系统接收到响应  
**Then** 系统 SHALL 从每条评论中提取父 story ID  
**And** 系统 SHALL 按父 story ID 分组评论  
**And** 系统 SHALL 保持每个 story 内评论的顺序  

## Implementation Notes

### API 端点
- Algolia HN Search API: `https://hn.algolia.com/api/v1/search`
- 查询参数: `tags=comment,story_XXX`

### 数据映射
- Algolia 返回的字段名与 Firebase 不同
- 映射：`objectID` → `id`
- 映射：`comment_text` → `text`
- 映射：`author` → `by`
- 映射：`created_at_i` → `time`

### 性能影响
- **之前**: 330 Firebase 请求（30 story 详情 + 300 评论详情）
- **之后**: 30 Algolia 请求（每个 story 1 次评论查询）
- **减少**: 300 subrequests
