# Change: 升级为分布式任务处理架构以适应Cloudflare免费版限制

## Why

当前系统在Cloudflare Workers付费版本下运行良好，但需要降级到免费版本时面临严重限制：
- **Subrequest限制**: 免费版每次Worker执行最多50个subrequest
- **当前架构瓶颈**: 处理30篇文章需要约80-100个subrequest（HN API + Algolia评论 + Crawler API + LLM API）
- **任务失败**: 无法在单次cron触发中完成全部抓取和翻译任务

这个限制导致系统无法正常运行，需要进行架构升级以支持任务分片和增量处理。

## What Changes

### 核心架构变更
1. **引入D1数据库持久化** (新增)
   - 存储文章抓取状态和翻译结果
   - 记录任务执行进度和日期标记
   - 支持断点续传和手动补偿

2. **任务分片处理机制** (新增)
   - 将单个大任务拆分为多个小批次
   - 每批次控制在subrequest限制内（<45个）
   - 支持任务状态跟踪和重试机制

3. **高频Cron触发调度器** (修改)
   - 从每日一次改为每5-10分钟轮询
   - 检查未完成任务并执行下一批次
   - 全部完成后触发推送流程

4. **新增手动补偿机制** (新增)
   - 保留现有`/trigger-export-sync`端点作为紧急入口
   - 新增`/retry-failed-tasks`端点重试失败任务
   - 新增`/force-publish`端点强制推送已完成内容

### 数据模型设计
创建以下D1表结构：
- `daily_tasks`: 每日任务元数据（日期、状态、创建时间）
- `articles`: 文章抓取和翻译结果（URL、标题、摘要、评论、状态）
- `task_batches`: 批次执行记录（批次ID、subrequest计数、耗时）

### 处理流程变更
**旧流程** (单次同步):
```
Cron触发 → 获取30篇文章列表 → 全部抓取+翻译+推送 → 完成
```

**新流程** (分片异步):
```
初始触发 → 获取文章列表 → 存入D1 (状态: pending)
  ↓
定时轮询 → 查询pending任务 → 处理一批(5-8篇) → 更新状态为processing → 完成后标记completed
  ↓
重复轮询 → 直到所有文章completed → 聚合结果 → 推送GitHub/Telegram → 标记daily_task为published
```

### Subrequest预算管理
- **文章列表获取**: ~2 subrequest (Firebase + Algolia)
- **单篇文章处理**: ~4-5 subrequest (Crawler API + LLM翻译/摘要 + Algolia评论)
- **批次大小**: 6篇/批次 = 25 subrequest < 45安全阈值（预留20个buffer）
- **推送阶段**: ~2-4 subrequest (GitHub API + Telegram API)
- **总批次数**: 5批次完成30篇文章，总耗时约50分钟

**关键说明**: 当前LLM批量翻译中，只有标题翻译是真正的批量合并请求（6篇→1次调用），内容摘要和评论总结使用并发单次调用（每篇独立subrequest）。未来可优化为真批量以进一步降低subrequest消耗。

### 兼容性保证
- **保留现有API**: `/trigger-export-sync`继续可用（用于测试和紧急情况）
- **环境变量**: 新增`TASK_BATCH_SIZE=8`和`CRON_INTERVAL_MINUTES=10`
- **数据库可选**: 通过`D1_ENABLED=true`开关，未启用时回退到旧架构

## Impact

### 新增能力（需创建新specs）
- `d1-task-storage`: D1数据库集成和CRUD操作
- `distributed-task-executor`: 分布式任务编排和状态机
- `cron-trigger-scheduler`: 高频轮询调度器

### 修改现有能力（需更新现有specs）
- `cloudflare-worker-runtime`: 修改cron配置从`0 1 * * *`到`*/10 * * * *`
- `daily-export`: 修改为分阶段处理而非单次同步

### 受影响代码
- `wrangler.toml`: 新增D1 binding配置
- `src/worker/index.ts`: 修改scheduled handler逻辑
- `src/worker/sources/hackernews.ts`: 拆分为多个子任务处理函数
- `src/services/`: 新增`taskStorage.ts`和`taskExecutor.ts`
- `src/types/`: 新增`database.ts`类型定义

### 数据库依赖（新增）
- Cloudflare D1: SQL数据库（免费配额：5GB存储，500万读/100万写每天）
- 需要运行migration脚本创建表结构

### 部署变更
- 需要执行`wrangler d1 create hackernews-task-db`创建数据库
- 需要运行`wrangler d1 migrations apply`应用schema
- 需要更新`wrangler.toml`添加D1 binding

### 向后兼容性
- **非破坏性变更**: 旧的`/trigger-export-sync`端点保持功能不变
- **可选启用**: 通过环境变量控制是否使用新架构
- **数据迁移**: 无历史数据需要迁移（每日重新开始）
