# distributed-task-executor Specification

## Purpose
TBD - created by archiving change upgrade-distributed-task-processing. Update Purpose after archive.
## Requirements
### Requirement: 任务初始化流程
系统 SHALL 支持每日任务的初始化，获取文章列表并存储到D1。

#### Scenario: 首次初始化当日任务
**Given** 当前日期为2026-01-04且尚无该日任务  
**When** cron触发或手动调用`initializeTask(env, date)`  
**Then** 系统 SHALL 从HN API获取best stories列表（约2-3 subrequest）  
**And** 系统 SHALL 创建daily_task记录状态为`init`  
**And** 系统 SHALL 批量插入30篇文章到articles表（状态为`pending`）  
**And** 系统 SHALL 更新任务状态从`init`到`list_fetched`  
**And** 总计消耗 < 5个subrequest

#### Scenario: 任务已存在时跳过初始化
**Given** 当日任务已存在且状态为`list_fetched`  
**When** 再次调用`initializeTask(env, date)`  
**Then** 系统 SHALL 检测到任务已初始化  
**And** 直接返回不重复获取列表  
**And** 记录日志提示任务已存在

### Requirement: 批次增量处理
系统 SHALL 支持每次处理固定批次的文章，控制subrequest在限制内。

#### Scenario: 处理首批6篇文章
**Given** 存在30篇pending文章  
**When** 调用`processNextBatch(env, date, batchSize=6)`  
**Then** 系统 SHALL 从D1查询前6篇pending文章  
**And** 系统 SHALL 标记这6篇为`processing`状态  
**And** 系统 SHALL 执行以下操作：  
  - 调用Crawler API获取文章内容（6 subrequest）  
  - 调用Algolia获取评论（6 subrequest）  
  - 批量调用LLM翻译标题（1 subrequest，真批量JSON数组）  
  - 调用LLM翻译摘要（6 subrequest，并发单次调用）  
  - 调用LLM总结评论（6 subrequest，并发单次调用）  
**And** 系统 SHALL 更新文章状态为`completed`并填充翻译结果  
**And** 总计消耗约25个subrequest < 45安全阈值（预留20个buffer应对意外）

#### Scenario: 处理过程中部分文章失败
**Given** 批次处理中2篇文章LLM翻译超时  
**When** 执行批次处理  
**Then** 系统 SHALL 继续处理其他6篇文章  
**And** 系统 SHALL 标记失败的2篇为`failed`状态  
**And** 记录错误消息到error_message字段  
**And** 成功的6篇状态为`completed`

#### Scenario: 无更多待处理文章
**Given** 所有文章都已completed或failed  
**When** 调用`processNextBatch(env, date)`  
**Then** 系统 SHALL 返回空结果表示无任务  
**And** 触发状态转换到`aggregating`阶段  
**And** 记录日志提示所有批次已完成

### Requirement: 批次大小动态调整
系统 SHALL 根据配置调整批次大小，平衡处理速度和subrequest限制。

#### Scenario: 使用默认批次大小
**Given** 环境变量`TASK_BATCH_SIZE`未设置  
**When** 执行批次处理  
**Then** 系统 SHALL 使用默认批次大小6篇  
**And** 保证subrequest消耗 < 30（含buffer）

#### Scenario: 自定义批次大小
**Given** 环境变量`TASK_BATCH_SIZE=4`  
**When** 执行批次处理  
**Then** 系统 SHALL 每批处理4篇文章  
**And** subrequest消耗约17个（更保守）  
**And** 需要8批次完成30篇文章

#### Scenario: 批次大小验证
**Given** 配置`TASK_BATCH_SIZE=15`（过大）  
**When** 系统启动时  
**Then** 系统 SHALL 验证批次大小  
**And** 当预估subrequest > 40时 SHALL 拒绝启动  
**And** 提示调整批次大小到安全范围（建议≤6）

### Requirement: 结果聚合与推送
系统 SHALL 在所有文章完成后聚合结果并推送。

#### Scenario: 聚合已完成文章
**Given** 28篇completed、2篇failed文章  
**When** 调用`aggregateResults(env, date)`  
**Then** 系统 SHALL 查询所有completed文章（忽略failed）  
**And** 系统 SHALL 转换为ProcessedStory格式  
**And** 系统 SHALL 生成Markdown内容  
**And** 返回聚合结果对象包含stories和markdown

#### Scenario: 推送到GitHub和Telegram
**Given** 聚合得到28篇文章的markdown  
**When** 调用`publishResults(env, content)`  
**Then** 系统 SHALL 调用GitHubPublisher推送markdown（1-2 subrequest）  
**And** 系统 SHALL 调用TelegramPublisher推送消息（1-2 subrequest）  
**And** 系统 SHALL 更新任务状态到`published`  
**And** 记录published_at时间戳  
**And** 总计消耗约4个subrequest

#### Scenario: 推送失败处理
**Given** GitHub API返回403权限错误  
**When** 执行推送操作  
**Then** 系统 SHALL 记录推送失败错误  
**And** 任务状态保持在`aggregating`  
**And** 下次cron触发时重试推送  
**And** Telegram推送仍应继续执行（独立失败）

### Requirement: 状态机驱动调度
系统 SHALL 使用状态机模式协调多阶段任务执行。

#### Scenario: 状态机驱动cron handler
**Given** cron每10分钟触发一次  
**When** scheduled handler执行  
**Then** 系统 SHALL 读取当前任务状态  
**And** 根据状态执行相应操作：  
  - `init` → 执行initializeTask  
  - `list_fetched` → 执行processNextBatch  
  - `processing` → 继续执行processNextBatch  
  - `aggregating` → 执行aggregateAndPublish  
  - `published` → 跳过不处理  
**And** 每次执行后检查是否需要状态转换

#### Scenario: 状态转换的原子性
**Given** 任务从`processing`转换到`aggregating`  
**When** 检测到所有文章completed  
**Then** 系统 SHALL 使用D1事务更新状态  
**And** 保证状态转换的原子性  
**And** 避免并发cron触发导致重复处理

### Requirement: 手动触发支持
系统 SHALL 支持手动触发任务的各个阶段。

#### Scenario: 手动触发新任务
**Given** 用户通过HTTP调用`POST /trigger-export-sync`  
**When** handler接收到请求  
**Then** 系统 SHALL 检查当日任务状态  
**And** 若任务不存在 SHALL 初始化新任务  
**And** 若任务存在但未published SHALL 继续处理  
**And** 返回任务进度信息给调用者

#### Scenario: 强制推送部分结果
**Given** 存在20篇completed和10篇failed文章  
**When** 用户调用`POST /force-publish`  
**Then** 系统 SHALL 仅聚合20篇completed文章  
**And** 忽略failed文章不阻塞推送  
**And** 推送后更新任务状态为`published`  
**And** 记录日志提示跳过了failed文章

#### Scenario: 重试失败文章
**Given** 存在5篇failed文章  
**When** 用户调用`POST /retry-failed-tasks`  
**Then** 系统 SHALL 将这些文章状态改为`pending`  
**And** 下次批次处理会重新尝试  
**And** 递增retry_count计数器  
**And** 返回重试文章数量给调用者

### Requirement: 可观测性和监控
系统 SHALL 记录关键指标用于性能分析和故障排查。

#### Scenario: 记录批次执行指标
**Given** 完成一个批次处理  
**When** 批次执行结束  
**Then** 系统 SHALL 记录以下指标：  
  - 批次索引（1-4）  
  - 文章数量（8篇）  
  - 实际subrequest消耗（19个）  
  - 执行时长（毫秒）  
  - 成功/失败状态  
**And** 存储到task_batches表用于后续分析

#### Scenario: 查询任务进度
**Given** 任务正在处理中  
**When** 用户调用`GET /task-status`  
**Then** 系统 SHALL 返回实时进度信息：  
  - 任务日期  
  - 当前状态（processing/aggregating/published）  
  - 总文章数（30）  
  - pending/processing/completed/failed各状态计数  
  - 已完成批次数/总批次数  
**And** 响应格式为JSON便于监控系统集成

#### Scenario: 异常情况告警
**Given** 某批次subrequest消耗超过30个  
**When** 记录批次执行指标  
**Then** 系统 SHALL 记录警告日志  
**And** 提示批次大小可能需要调整  
**And** 用于运维人员排查潜在风险

