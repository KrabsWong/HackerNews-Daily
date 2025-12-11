# worker-subrequest-optimization Specification

## Purpose
TBD - created by archiving change optimize-worker-subrequests. Update Purpose after archive.
## Requirements
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

