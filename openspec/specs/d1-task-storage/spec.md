# d1-task-storage Specification

## Purpose
TBD - created by archiving change upgrade-distributed-task-processing. Update Purpose after archive.
## Requirements
### Requirement: D1数据库初始化
系统 SHALL 提供D1数据库schema初始化机制。

#### Scenario: 创建数据库表结构
**Given** 系统首次部署到Cloudflare Workers环境  
**When** 执行数据库migration脚本  
**Then** 系统 SHALL 创建`daily_tasks`表存储任务元数据  
**And** 系统 SHALL 创建`articles`表存储文章处理结果  
**And** 系统 SHALL 创建`task_batches`表存储批次执行记录  
**And** 系统 SHALL 创建必要的索引优化查询性能

#### Scenario: 数据库绑定验证
**Given** wrangler.toml配置了D1 binding  
**When** Worker启动时  
**Then** 系统 SHALL 验证D1绑定是否可用  
**And** 当`D1_ENABLED=true`但binding不存在时 SHALL 抛出配置错误

### Requirement: 任务CRUD操作
系统 SHALL 提供完整的任务增删改查操作。

#### Scenario: 创建每日任务
**Given** 当前日期为2026-01-04  
**When** 调用`createDailyTask(date, totalArticles)`  
**Then** 系统 SHALL 在`daily_tasks`表插入新记录  
**And** 初始状态 SHALL 为`init`  
**And** `created_at`和`updated_at` SHALL 为当前Unix时间戳  
**And** 当该日期任务已存在时 SHALL 返回错误

#### Scenario: 查询或创建任务（幂等）
**Given** 可能存在或不存在当日任务  
**When** 调用`getOrCreateTask(date)`  
**Then** 系统 SHALL 查询该日期的任务记录  
**And** 若不存在 SHALL 自动创建初始任务  
**And** 返回任务对象包含id、status、progress等字段

#### Scenario: 更新任务状态
**Given** 存在状态为`processing`的任务  
**When** 调用`updateTaskStatus(date, 'aggregating')`  
**Then** 系统 SHALL 更新任务状态到新值  
**And** `updated_at`字段 SHALL 更新为当前时间戳  
**And** 使用SQL事务保证原子性更新

### Requirement: 文章批量操作
系统 SHALL 支持文章记录的批量写入和查询。

#### Scenario: 批量插入文章记录
**Given** 从HN API获取到30篇文章元数据  
**When** 调用`insertArticles(date, stories)`  
**Then** 系统 SHALL 批量插入30条记录到`articles`表  
**And** 每条记录初始状态 SHALL 为`pending`  
**And** `rank`字段 SHALL 按stories数组索引设置（1-30）  
**And** 使用prepared statement防止SQL注入

#### Scenario: 查询待处理文章
**Given** 存在10篇pending状态的文章  
**When** 调用`getPendingArticles(date, limit=6)`  
**Then** 系统 SHALL 返回最多6篇pending文章  
**And** 按`rank`字段升序排序（优先处理排名靠前的）  
**And** 查询使用索引`idx_articles_status`优化性能

#### Scenario: 批量更新文章状态
**Given** 处理完6篇文章  
**When** 调用`updateArticleStatus(articleIds, 'completed', results)`  
**Then** 系统 SHALL 批量更新文章状态  
**And** 填充翻译结果字段（title_zh, content_summary_zh, comment_summary_zh）  
**And** 更新`updated_at`时间戳  
**And** 使用事务保证全部成功或全部回滚

### Requirement: 查询已完成文章
系统 SHALL 支持查询所有已完成文章用于聚合。

#### Scenario: 获取completed文章
**Given** 某日任务有25篇completed和5篇failed文章  
**When** 调用`getCompletedArticles(date)`  
**Then** 系统 SHALL 返回25篇completed文章  
**And** 按`rank`升序排序  
**And** 不包含failed或pending状态的文章

#### Scenario: 检查任务完成度
**Given** 某日任务总共30篇文章  
**When** 调用`getTaskProgress(date)`  
**Then** 系统 SHALL 返回进度统计对象  
**And** 包含total、pending、processing、completed、failed计数  
**And** 使用单个聚合查询获取所有计数

### Requirement: 批次执行记录
系统 SHALL 记录每个批次的执行情况用于可观测性。

#### Scenario: 记录批次成功执行
**Given** 成功处理第2批次共6篇文章  
**When** 调用`recordBatch(date, batchIndex=2, articleCount=6, subrequestCount=25, durationMs=12500, status='success')`  
**Then** 系统 SHALL 在`task_batches`表插入记录  
**And** 记录subrequest消耗和执行时长  
**And** 用于后续分析和告警

#### Scenario: 记录批次部分失败
**Given** 处理批次时2篇文章失败  
**When** 调用`recordBatch(date, batchIndex=3, status='partial', errorMessage='2 articles failed')`  
**Then** 系统 SHALL 记录状态为`partial`  
**And** 保存错误消息用于故障排查

### Requirement: 错误处理和重试机制
系统 SHALL 提供错误状态管理和重试支持。

#### Scenario: 标记文章失败并记录错误
**Given** LLM API调用失败  
**When** 调用`updateArticleStatus(articleId, 'failed', {errorMessage: 'LLM timeout'})`  
**Then** 系统 SHALL 更新文章状态为`failed`  
**And** 记录错误消息到`error_message`字段  
**And** 自动递增`retry_count`计数器

#### Scenario: 重试失败文章
**Given** 存在3篇failed文章且retry_count < 3  
**When** 调用`retryFailedArticles(date)`  
**Then** 系统 SHALL 将这些文章状态改为`pending`  
**And** 重新加入处理队列  
**And** 当retry_count >= 3时 SHALL 跳过该文章

### Requirement: 数据清理和归档
系统 SHALL 提供历史数据清理机制避免D1存储溢出。

#### Scenario: 归档旧任务
**Given** 某任务状态为`published`且已超过7天  
**When** 执行定期清理任务  
**Then** 系统 SHALL 将任务状态更新为`archived`  
**And** 可选择删除关联的articles和task_batches记录  
**And** 保留daily_tasks记录用于历史审计

