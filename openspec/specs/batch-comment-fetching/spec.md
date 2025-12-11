# batch-comment-fetching Specification

## Purpose
TBD - created by archiving change optimize-worker-subrequests. Update Purpose after archive.
## Requirements
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

