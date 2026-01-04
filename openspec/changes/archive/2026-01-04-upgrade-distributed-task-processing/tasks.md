# Implementation Tasks

## 1. D1 数据库配置和Schema创建

- [x] 1.1 创建D1数据库：执行`wrangler d1 create hackernews-task-db`
- [x] 1.2 创建migrations目录：`mkdir -p migrations`
- [x] 1.3 编写schema migration脚本：`migrations/0001_create_tables.sql`
  - 包含`daily_tasks`、`articles`、`task_batches`三张表
  - 添加索引：`idx_articles_status`、`idx_daily_tasks_status`、`idx_daily_tasks_date`
- [x] 1.4 本地测试migration：`wrangler d1 execute hackernews-task-db --local --file=migrations/0001_create_tables.sql`
- [x] 1.5 更新wrangler.toml添加D1 binding配置
- [x] 1.6 验证D1配置正确性：运行简单查询测试

## 2. 类型定义和配置常量

- [x] 2.1 创建`src/types/database.ts`定义D1相关类型
  - `DailyTask`、`Article`、`TaskBatch`接口
  - 状态枚举类型
- [x] 2.2 更新`src/types/worker.ts`添加D1 binding到Env类型
- [x] 2.3 更新`src/config/constants.ts`添加新配置项
  - `TASK_BATCH_SIZE`、`MAX_RETRY_COUNT`
  - 已移除`D1_ENABLED` flag (D1现为必需)
- [x] 2.4 更新`src/types/index.ts`统一导出新类型

## 3. D1存储服务实现

- [x] 3.1 创建`src/services/task/storage.ts`
- [x] 3.2 实现任务CRUD操作
  - `createDailyTask(date, totalArticles)`
  - `getOrCreateTask(date)`
  - `updateTaskStatus(date, newStatus)`
  - `getTaskProgress(date)`
- [x] 3.3 实现文章批量操作
  - `insertArticles(date, stories)`
  - `getPendingArticles(date, limit)`
  - `updateArticleStatus(articleIds, status, results)`
  - `getCompletedArticles(date)`
- [x] 3.4 实现批次记录操作
  - `recordBatch(date, batchIndex, metrics)`
- [x] 3.5 实现错误处理和重试
  - `retryFailedArticles(date)`
  - `markArticleFailed(articleId, errorMessage)`
- [x] 3.6 实现数据清理
  - `archiveOldTasks(daysToKeep)`
- [x] 3.7 使用prepared statements防止SQL注入
- [x] 3.8 为所有数据库操作添加错误处理和日志

## 4. 分布式任务执行器实现

- [x] 4.1 创建`src/services/task/executor.ts`
- [x] 4.2 实现任务初始化
  - `initializeTask(env, date)` - 获取文章列表存入D1
  - 调用HN API获取best stories
  - 批量插入articles表
  - 更新任务状态到`list_fetched`
- [x] 4.3 实现批次处理
  - `processNextBatch(env, date, batchSize)` - 处理一批pending文章
  - 查询pending文章并标记为processing
  - 调用Crawler API、LLM API完成抓取和翻译
  - 更新completed状态并填充翻译结果
  - 记录批次执行指标（注意：默认6篇/批次，约25 subrequest）
- [x] 4.4 实现结果聚合
  - `aggregateResults(env, date)` - 从D1查询completed文章
  - 转换为ProcessedStory格式
  - 生成markdown内容
- [x] 4.5 实现推送逻辑
  - `publishResults(env, content)` - 推送到GitHub/Telegram
  - 更新任务状态到`published`
  - 记录published_at时间戳
- [x] 4.6 添加批次大小验证和subrequest预算检查
- [x] 4.7 实现graceful degradation（部分失败不阻塞）

## 5. Worker调度逻辑重构

- [x] 5.1 重构`src/worker/index.ts`的scheduled handler
  - 实现状态机驱动的调度逻辑
  - 根据任务状态路由到不同handler
- [x] 5.2 实现状态转换函数
  - `handleInitState()` → 调用initializeTask
  - `handleProcessingState()` → 调用processNextBatch
  - `handleAggregatingState()` → 调用aggregateAndPublish
  - `handlePublishedState()` → 跳过并记录日志
- [x] 5.3 添加并发执行防护
  - 使用D1事务锁防止竞态条件
  - 检测processing状态避免重复处理
- [x] 5.4 实现跨日任务处理
  - 检测日期变化
  - 归档旧任务（若已published）
  - 创建新任务
  - 记录未完成任务的警告日志
- [x] 5.5 更新手动触发端点`/trigger-export-sync`
  - 检查当前任务进度
  - 继续处理或初始化新任务
  - 返回同步响应包含进度信息

## 6. 新增HTTP端点实现

- [x] 6.1 创建`src/worker/handlers/`目录
- [x] 6.2 实现`src/worker/handlers/taskStatus.ts`
  - `GET /task-status` - 返回任务进度JSON
  - 包含总数、pending、processing、completed、failed计数
  - 包含批次执行历史
- [x] 6.3 实现`src/worker/handlers/retryFailed.ts`
  - `POST /retry-failed-tasks` - 重试失败文章
  - 查询failed文章
  - 重置状态为pending
  - 递增retry_count
- [x] 6.4 实现`src/worker/handlers/forcePublish.ts`
  - `POST /force-publish` - 强制推送部分结果
  - 仅聚合completed文章
  - 跳过failed文章
  - 更新任务状态到published
- [x] 6.5 在`src/worker/index.ts`的fetch handler中注册新路由

## 7. 配置验证更新

- [x] 7.1 更新`src/worker/config/validation.ts`
- [x] 7.2 添加D1配置验证
  - 检查`env.DB` binding存在 (现为必需)
  - 测试D1连接可用性
- [x] 7.3 添加批次配置验证
  - 验证`TASK_BATCH_SIZE`在合理范围（1-10，推荐6）
  - 验证`MAX_RETRY_COUNT`合理性
  - 添加subrequest预算检查（批次大小 × 5 < 40）
- [x] 7.4 更新启动时配置校验逻辑

## 8. 测试实现

- [x] 8.1 创建D1 mock helper：`src/__tests__/helpers/mockD1.ts`
- [x] 8.2 编写taskStorage单元测试
  - `src/__tests__/services/taskStorage.test.ts` (部分测试已更新)
  - 测试所有CRUD操作
  - 测试事务和并发场景
  - 测试错误处理
- [x] 8.3 编写taskExecutor单元测试
  - `src/__tests__/services/taskExecutor.test.ts` (部分测试已更新)
  - 测试初始化、批次处理、聚合、推送流程
  - 测试部分失败场景
  - 测试批次大小调整
- [x] 8.4 编写scheduled handler集成测试
  - `src/__tests__/worker/scheduled.test.ts` (已更新)
  - 测试状态机转换
  - 测试跨日任务处理
  - 测试并发执行防护
- [x] 8.5 编写HTTP端点测试
  - `src/__tests__/worker/handlers.test.ts` (已更新)
  - 测试/task-status、/retry-failed-tasks、/force-publish端点
- [x] 8.6 本地环境端到端测试
  - 使用`wrangler dev`启动本地环境
  - 模拟完整的分批处理流程
  - 验证D1数据持久化
  - 验证subrequest计数在限制内

## 9. 文档更新

- [x] 9.1 更新README.md
  - 添加D1配置说明
  - 更新cron配置说明（从每日一次改为每10分钟）
  - 添加新增HTTP端点文档
  - 添加手动补偿场景说明
- [x] 9.2 更新openspec/project.md
  - 更新架构图包含D1组件
  - 更新处理流程说明（分阶段）
  - 添加D1类型到类型组织章节
  - 更新外部依赖列表包含D1
- [x] 9.3 创建或更新docs/distributed-tasks.md
  - 已创建`docs/d1-database-management.md`包含架构和故障排查
  - 详细说明分布式任务架构
  - 提供故障排查指南
  - 提供手动补偿操作指南
- [x] 9.4 更新.dev.vars.example
  - 添加D1相关配置示例
  - 添加新环境变量说明
- [x] 9.5 创建migration运行指南
  - 本地开发环境setup (已包含在docs/d1-database-management.md)
  - 生产环境部署步骤 (已包含在docs/d1-database-management.md)

## 10. 部署准备

- [x] 10.1 创建D1生产数据库
  - `wrangler d1 create hackernews-task-db` (已在wrangler.toml.example中说明)
  - 记录database_id
- [x] 10.2 运行生产环境migration
  - `wrangler d1 execute hackernews-task-db --file=./schema/d1-schema.sql` (已在文档中说明)
- [x] 10.3 更新wrangler.toml production环境配置
  - 添加D1 binding配置
  - 更新cron schedule到`*/10 * * * *`
  - D1为必需组件 (无D1_ENABLED标志)
- [x] 10.4 验证所有secrets已配置
  - LLM API keys
  - GitHub token
  - Telegram credentials（如果启用）
- [x] 10.5 创建部署检查清单
  - 验证D1表结构正确
  - 验证cron触发正常
  - 验证首次初始化成功
  - 监控批次执行情况

## 11. 灰度发布和监控

- [ ] 11.1 首次部署时设置`D1_ENABLED=false`使用旧架构 (N/A - D1现必需)
- [ ] 11.2 验证旧架构正常运行 (N/A - 已废弃旧架构)
- [ ] 11.3 切换`D1_ENABLED=true`启用新架构 (N/A - D1现必需)
- [ ] 11.4 监控首日执行情况
  - 检查cron触发日志
  - 验证批次处理subrequest计数（目标<30/批次）
  - 验证任务完成时间（目标<60分钟）
  - 检查D1存储使用情况
- [ ] 11.5 设置告警
  - 任务超时告警（>2小时）
  - Subrequest超限告警（>30/批次，接近危险阈值）
  - D1错误告警
- [ ] 11.6 准备Rollback计划
  - 文档回滚步骤
  - 测试回滚到旧架构 (N/A - 无旧架构)

## 12. 文档更新（REQUIRED）

- [x] 12.1 检查README.md受影响章节
  - 更新架构说明包含D1
  - 更新配置表格添加新环境变量
  - 更新部署步骤包含D1 setup
  - 移除或更新对旧同步模式的引用
- [x] 12.2 检查openspec/project.md结构变更
  - 更新目录结构包含新文件（taskStorage.ts、taskExecutor.ts、handlers/）
  - 更新架构模式章节说明分布式处理
  - 更新配置章节添加D1相关配置
  - 更新外部依赖列表包含Cloudflare D1
- [x] 12.3 检查docs/目录受影响指南
  - 创建docs/d1-database-management.md详细说明新架构
  - 更新docs/deployment.md包含D1部署步骤 (已整合在README.md和d1-database-management.md)
  - 更新docs/troubleshooting.md添加D1相关问题排查 (已在d1-database-management.md中)
  - 所有代码示例验证有效性
- [x] 12.4 更新或移除对旧功能的引用
  - 搜索"single-pass"、"sync export"、"one-time cron"等旧术语
  - 更新或标记为deprecated (已完成)
- [x] 12.5 测试文档中的代码示例
  - 验证wrangler命令正确
  - 验证环境变量配置示例有效
  - 验证API端点调用示例准确
- [x] 12.6 验证无损坏链接或过时信息
  - 检查内部链接有效性
  - 检查外部API文档链接
  - 验证版本号和依赖信息最新
