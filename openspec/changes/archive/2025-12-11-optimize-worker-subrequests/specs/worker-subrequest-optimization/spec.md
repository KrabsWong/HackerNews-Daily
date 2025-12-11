# worker-subrequest-optimization Specification Delta

## Overview

在 Cloudflare Worker 运行时中编排所有 subrequest 优化策略。通过批量评论获取和批量 LLM 翻译，将 subrequests 从 ~491 降低到 ~72。所有文章内容通过 Crawler API 获取以确保更丰富的数据。

## ADDED Requirements

### Requirement: 统一 Crawler 内容获取
系统 SHALL 通过 Crawler API 获取所有文章内容，以确保更丰富、更完整的数据。

#### Scenario: 获取文章内容
**Given** 系统需要获取 30 个故事的文章内容  
**When** `fetchArticlesBatch` 被调用  
**Then** 系统 SHALL 为每个 URL 调用 Crawler API  
**And** 系统 SHALL 返回完整的 markdown 内容  
**And** 系统 SHALL 从第一段提取描述  

#### Scenario: Crawler API 未配置
**Given** `CRAWLER_API_URL` 环境变量未设置  
**When** 尝试获取文章内容  
**Then** 系统 SHALL 返回 null 作为 fullContent  
**And** 系统 SHALL 记录警告  
**And** 系统 SHALL 继续处理其他步骤  

### Requirement: 优化的流水线编排
系统 SHALL 按优化顺序执行导出流水线以最小化 subrequests。

#### Scenario: 执行优化流水线
**Given** Worker 被触发进行每日导出  
**When** 导出处理器运行  
**Then** 系统 SHALL 按以下顺序执行：  
  1. 从 Algolia 获取故事（优化分页）  
  2. 从 Algolia 批量获取评论  
  3. 通过 Crawler API 获取文章内容  
  4. 批量 LLM 翻译和摘要  
  5. 生成 Markdown  
  6. 推送到 GitHub  

### Requirement: 集中化批量配置
系统 SHALL 通过 `LLM_BATCH_CONFIG` 提供批量处理配置。

#### Scenario: 加载优化配置
**Given** Worker 环境被加载  
**When** 导出处理器初始化  
**Then** 系统 SHALL 加载 `LLM_BATCH_CONFIG` 配置  
**And** 系统 SHALL 支持 `batchSize=0` 表示不分批  
**And** 系统 SHALL 记录已加载的配置  

## Implementation Notes

### Subrequest 预算分解

| API Type | 优化前 | 优化后 | 节省 |
|----------|--------|--------|------|
| Algolia (stories) | 10 | 2 | -8 |
| Firebase (comments) | 330 | 0 | -330 |
| Algolia (comments) | 0 | 30 | +30 |
| Crawler API | 30 | 30 | 0 |
| DeepSeek API | 120 | 3-9 | -111+ |
| GitHub API | 1 | 1 | 0 |
| **Total** | **491** | **~72** | **-419** |

### 流水线优化流程

```
1. Algolia Stories (2 requests)
   └─ 获取 top 30 stories

2. Algolia Comments (30 requests)
   └─ 每个 story 1 次查询

3. Crawler API (30 requests)
   └─ 每个 URL 1 次爬取

4. Batch LLM (3-9 requests)
   ├─ 批量翻译标题
   ├─ 批量摘要内容
   └─ 批量摘要评论

5. GitHub Push (1 request)

Total: ~72 subrequests
```

### 配置建议

默认配置（无限制模式）：
```typescript
LLM_BATCH_CONFIG = {
  DEFAULT_BATCH_SIZE: 0,        // 不分批
  MAX_BATCH_SIZE: 0,            // 无上限
  MAX_CONTENT_PER_ARTICLE: 0,   // 不截断
}
```

可通过环境变量 `LLM_BATCH_SIZE` 覆盖批量大小。
