# cron-trigger-scheduler Specification

## Purpose
TBD - created by archiving change upgrade-distributed-task-processing. Update Purpose after archive.
## Requirements
### Requirement: 高频Cron调度
系统 SHALL 支持高频率的cron触发以实现增量任务处理。

#### Scenario: 配置高频cron触发
**Given** wrangler.toml配置cron schedule  
**When** 设置为`*/10 * * * *`（每10分钟）  
**Then** Cloudflare Workers SHALL 每10分钟触发scheduled handler  
**And** 系统 SHALL 在每次触发时检查当前任务状态  
**And** 根据状态决定执行初始化、处理批次或推送

#### Scenario: 冷启动优化
**Given** Worker实例可能处于冷启动状态  
**When** cron触发scheduled handler  
**Then** 系统 SHALL 快速完成状态检查（<500ms）  
**And** 若无任务需要处理 SHALL 提前返回节省执行时间  
**And** 通过高频触发保持实例温热减少冷启动

### Requirement: 状态驱动调度逻辑
系统 SHALL 基于任务状态决定调度行为。

#### Scenario: init状态触发初始化
**Given** 当日任务状态为`init`  
**When** cron handler执行  
**Then** 系统 SHALL 调用`initializeTask()`获取文章列表  
**And** 将任务状态转换为`list_fetched`  
**And** 记录日志标注初始化完成

#### Scenario: list_fetched状态触发首批处理
**Given** 当日任务状态为`list_fetched`  
**When** cron handler执行  
**Then** 系统 SHALL 调用`processNextBatch()`处理首批8篇文章  
**And** 将任务状态转换为`processing`  
**And** 记录批次索引为1

#### Scenario: processing状态继续批次处理
**Given** 当日任务状态为`processing`  
**When** cron handler执行  
**Then** 系统 SHALL 查询是否还有pending文章  
**And** 若有 SHALL 继续处理下一批次  
**And** 若无 SHALL 转换状态到`aggregating`

#### Scenario: aggregating状态触发推送
**Given** 当日任务状态为`aggregating`  
**When** cron handler执行  
**Then** 系统 SHALL 聚合所有completed文章  
**And** 调用GitHubPublisher和TelegramPublisher推送  
**And** 推送成功后转换状态到`published`

#### Scenario: published状态跳过处理
**Given** 当日任务状态为`published`  
**When** cron handler执行  
**Then** 系统 SHALL 快速返回不执行任何操作  
**And** 记录日志提示任务已完成  
**And** 避免重复推送浪费subrequest配额

### Requirement: 并发执行防护
系统 SHALL 防止多个cron触发并发执行导致的冲突。

#### Scenario: 使用D1事务锁防止竞态
**Given** 两个cron实例几乎同时触发  
**When** 第一个实例开始处理批次并标记文章为`processing`  
**Then** 第二个实例 SHALL 在查询pending文章时发现已无待处理  
**And** 第二个实例提前返回避免重复处理  
**And** D1事务保证状态更新的原子性

#### Scenario: 处理中检测到状态变更
**Given** 批次处理耗时8分钟  
**When** 下一个cron触发时任务仍在`processing`  
**Then** 系统 SHALL 检查是否有文章处于`processing`状态  
**And** 若有 SHALL 跳过本次执行避免冲突  
**And** 记录日志提示上一批次仍在处理中

### Requirement: 执行时间窗口管理
系统 SHALL 确保任务在合理时间窗口内完成。

#### Scenario: 预估任务完成时间
**Given** 总共30篇文章，批次大小6  
**When** 系统规划执行计划  
**Then** 预计需要5批次（30/6向上取整）  
**And** 每批次间隔10分钟  
**And** 总时间约50分钟（初始化+5批次+推送）

#### Scenario: 超时检测和告警
**Given** 任务开始处理超过2小时  
**When** cron handler检查任务创建时间  
**Then** 系统 SHALL 检测到任务超时  
**And** 记录错误日志提示可能的死锁或失败  
**And** 可选择重置任务状态或发送告警

### Requirement: 可配置调度间隔
系统 SHALL 支持通过配置调整cron触发频率。

#### Scenario: 使用默认10分钟间隔
**Given** 环境变量`CRON_INTERVAL_MINUTES`未设置  
**When** 系统读取配置  
**Then** 使用默认值10分钟  
**And** wrangler.toml配置为`*/10 * * * *`

#### Scenario: 自定义调度间隔
**Given** 设置`CRON_INTERVAL_MINUTES=5`  
**When** 部署Worker  
**Then** wrangler.toml配置应为`*/5 * * * *`  
**And** 任务完成时间缩短至20分钟  
**And** 需注意免费配额消耗增加

#### Scenario: 调度间隔验证
**Given** 配置`CRON_INTERVAL_MINUTES=1`（过于频繁）  
**When** 系统启动验证  
**Then** 系统 SHALL 记录警告日志  
**And** 提示可能快速消耗免费配额  
**And** 建议最小间隔5分钟

### Requirement: 跨日任务处理
系统 SHALL 处理跨日任务场景避免遗漏。

#### Scenario: 新一天开始时初始化
**Given** 当前日期从2026-01-04变为2026-01-05  
**When** cron handler触发  
**Then** 系统 SHALL 检测到日期变化  
**And** 创建新的2026-01-05任务（状态`init`）  
**And** 将2026-01-04任务标记为`archived`（若未published）

#### Scenario: 前一日任务未完成告警
**Given** 2026-01-04任务状态仍为`processing`  
**When** 2026-01-05的cron触发  
**Then** 系统 SHALL 记录警告日志  
**And** 提示前一日任务未完成  
**And** 继续创建新任务不阻塞当日处理  
**And** 可通过手动端点补偿旧任务

### Requirement: 手动触发兼容性
系统 SHALL 保持现有手动触发端点的兼容性。

#### Scenario: 手动触发同步导出
**Given** 用户调用`POST /trigger-export-sync`  
**When** handler接收请求  
**Then** 系统 SHALL 忽略cron调度逻辑  
**And** 立即执行完整的初始化+处理+推送流程  
**And** 或检查当前进度并继续处理  
**And** 返回同步响应包含结果

#### Scenario: 异步触发导出
**Given** 用户调用`POST /trigger-export`  
**When** handler接收请求  
**Then** 系统 SHALL 将任务加入处理队列  
**And** 立即返回响应提示任务已启动  
**And** 后续由cron调度逐步完成

### Requirement: 可观测性和监控
系统 SHALL 记录调度执行情况用于监控。

#### Scenario: 记录cron触发日志
**Given** 每次cron触发  
**When** scheduled handler开始执行  
**Then** 系统 SHALL 记录日志包含：  
  - 触发时间戳  
  - 当前任务日期  
  - 任务状态（init/processing/published等）  
  - 执行的操作（初始化/处理批次/推送/跳过）  
**And** 日志级别为INFO便于审计

#### Scenario: 异常情况记录
**Given** cron handler执行过程中发生异常  
**When** 捕获到Error对象  
**Then** 系统 SHALL 记录ERROR级别日志  
**And** 包含完整错误堆栈  
**And** 任务状态不变以便下次重试  
**And** 避免异常导致任务永久卡住

