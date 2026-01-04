# 设计文档：分布式任务处理架构

## Context

### 背景
当前HackerNews Daily项目设计为Cloudflare Workers付费版环境，在单次cron触发中完成所有操作（抓取30篇文章、翻译、推送）。但Cloudflare Workers免费版有严格的subrequest限制（50个/次执行），现有架构无法在此限制下运行。

### 约束条件
- **Subrequest限制**: 免费版最多50个subrequest/次执行
- **当前需求**: 处理30篇文章需要约80-100个subrequest
- **免费D1配额**: 5GB存储、500万读/100万写每天
- **Cron频率**: 免费版支持最高每分钟触发
- **Worker执行时间**: 单次最多30秒（免费版）、15分钟（付费版脚本模式）

### 利益相关者
- **开发者**: 需要降低成本，使用免费版
- **用户**: 期望每日稳定获取HN精选内容
- **系统**: 需要在限制内完成任务，保证可靠性

## Goals / Non-Goals

### Goals
1. **适应免费版限制**: 将任务拆分到subrequest限制内（<45个/批次）
2. **保证完整性**: 确保30篇文章全部处理完成
3. **支持断点续传**: 任务失败后可从中断处恢复
4. **保持现有功能**: 不改变最终输出格式和推送逻辑
5. **向后兼容**: 支持同时运行在付费版和免费版

### Non-Goals
1. 不优化LLM成本（翻译依然使用现有provider）
2. 不改变文章选择策略（依然是best stories前30篇）
3. 不实时推送（依然每日一次聚合推送）
4. 不支持多日任务并行（简化状态管理）

## Decisions

### 决策1: 选择D1而非KV作为持久化存储

**选择**: Cloudflare D1 (SQL数据库)

**理由**:
- **结构化查询**: 需要复杂查询（按状态筛选、按日期分组、批量更新）
- **事务支持**: 批次提交需要原子性（避免部分写入）
- **关系型数据**: 文章与任务、批次之间有明确关系
- **成本**: 免费配额充足（500万读/100万写），远超需求（<1000次操作/天）

**KV的劣势**:
- 仅支持key-value查询，无法高效查询"所有pending状态的文章"
- 无事务支持，需要应用层实现一致性
- 需要额外索引键管理（如`task:2026-01-04:pending`）

### 决策2: 任务分片策略 - 固定批次大小（6篇/批次）

**选择**: 每批处理6篇文章，预估25个subrequest

**Subrequest预算分解** (单批次):
```
初始化阶段（仅首次）:
- Firebase获取best stories列表: 1 subrequest
- Algolia批量查询30篇详情: 1 subrequest
- D1写入30条记录: 0 subrequest (本地绑定)
  总计: ~2 subrequest

处理阶段（每批次6篇）:
- D1查询pending文章: 0 subrequest (绑定调用)
- Crawler API获取文章内容: 6 subrequest (6篇 × 1次)
- Algolia获取评论: 6 subrequest (6篇 × 1次)
- LLM批量翻译标题: 1 subrequest (真批量，JSON数组合并)
- LLM批量翻译摘要: 6 subrequest (并发单次调用，实际非批量)
- LLM批量总结评论: 6 subrequest (并发单次调用，实际非批量)
- D1更新completed状态: 0 subrequest (绑定调用)
  总计: ~25 subrequest/批次

推送阶段（所有完成后）:
- D1查询所有completed文章: 0 subrequest
- GitHub API推送: 1-2 subrequest (创建文件)
- Telegram API推送: 1-2 subrequest (分批发送)
  总计: ~4 subrequest
```

**总计**: 2 (初始) + 25×5批次 (125) + 4 (推送) = **131 subrequest**（分散到7次执行）  
**单次最大**: 25 subrequest < 45安全阈值（预留20个buffer应对意外）

**关键说明**:
- **标题翻译是真批量**: 使用JSON数组，6篇→1次调用
- **内容/评论摘要是伪批量**: 当前实现使用并发单次调用（concurrency控制），每篇都是独立subrequest
- **批次大小调整**: 从8篇降到6篇，确保即使所有LLM调用都是单次也在安全范围内
- **总批次数**: 30÷6=5批次，完成时间约50分钟

**备选方案考虑**:
- **动态批次大小**: 根据剩余quota调整（复杂度高，收益有限）
- **更大批次（8篇）**: 需要33 subrequest/批次，buffer太小（仅12个）
- **更小批次（4篇）**: 仅需17 subrequest/批次，但需要8批次（耗时80分钟）
- **优化LLM批量策略**: 未来可改进content/comment摘要为真批量（如标题翻译），可降到每批次13 subrequest

### 决策3: Cron调度频率 - 每10分钟轮询

**选择**: `*/10 * * * *`（每10分钟触发一次）

**理由**:
- **覆盖时间窗口**: 5批次 × 10分钟 = 50分钟内完成全部处理
- **容错能力**: 单次失败后10分钟内重试
- **避免冷启动**: 保持Worker实例温热
- **免费配额**: 144次/天（24h × 6次/h）<< 100,000次免费配额

**备选方案**:
- **每5分钟**: 过于频繁，可能浪费执行次数
- **每15分钟**: 完成时间延长至1小时，不够及时

### 决策4: 状态机设计 - 三阶段状态转换

**状态机定义**:
```
daily_tasks 表:
  init → list_fetched → processing → aggregating → published → archived
  
articles 表:
  pending → processing → completed → failed
```

**转换规则**:
1. **init → list_fetched**: 获取文章列表成功后
2. **list_fetched → processing**: 开始处理第一批文章时
3. **processing → aggregating**: 所有文章completed时
4. **aggregating → published**: 推送成功后
5. **published → archived**: 次日初始化新任务时归档旧任务

**幂等性保证**:
- 每个状态转换前检查当前状态
- 使用SQL事务保证原子性
- 处理阶段支持重复执行（基于状态过滤）

### 决策5: 手动补偿机制设计

**新增HTTP端点**:
1. **`POST /retry-failed-tasks`**: 重试所有failed状态的文章
   - 使用场景: LLM API临时故障后恢复
   - 行为: 将failed改为pending，重新加入处理队列

2. **`POST /force-publish`**: 强制推送当前已完成内容
   - 使用场景: 部分文章失败但需要先发布其他内容
   - 行为: 跳过failed文章，仅聚合completed文章推送

3. **`GET /task-status`**: 查询当前任务进度
   - 返回: 总数、pending数、processing数、completed数、failed数

**保留现有端点**:
- **`POST /trigger-export-sync`**: 触发新一轮任务（重置当日任务）
- 使用场景: 测试或紧急情况下手动触发

## Data Model

### D1 Schema设计

```sql
-- 每日任务元数据表
CREATE TABLE daily_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_date TEXT NOT NULL UNIQUE,           -- YYYY-MM-DD
  status TEXT NOT NULL,                      -- init, list_fetched, processing, aggregating, published, archived
  total_articles INTEGER DEFAULT 0,
  completed_articles INTEGER DEFAULT 0,
  failed_articles INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,               -- Unix timestamp
  updated_at INTEGER NOT NULL,
  published_at INTEGER,                      -- Unix timestamp when published
  UNIQUE(task_date)
);

-- 文章抓取和翻译结果表
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_date TEXT NOT NULL,                   -- 关联daily_tasks
  story_id INTEGER NOT NULL,                 -- HN story ID
  rank INTEGER NOT NULL,                     -- 排名 1-30
  url TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_zh TEXT,
  score INTEGER NOT NULL,
  published_time INTEGER NOT NULL,           -- Unix timestamp
  content_summary_zh TEXT,
  comment_summary_zh TEXT,
  status TEXT NOT NULL,                      -- pending, processing, completed, failed
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(task_date, story_id)
);

-- 批次执行记录表（用于observability）
CREATE TABLE task_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_date TEXT NOT NULL,
  batch_index INTEGER NOT NULL,
  article_count INTEGER NOT NULL,
  subrequest_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,                      -- success, partial, failed
  error_message TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(task_date, batch_index)
);

-- 索引优化
CREATE INDEX idx_articles_status ON articles(task_date, status);
CREATE INDEX idx_daily_tasks_status ON daily_tasks(status);
CREATE INDEX idx_daily_tasks_date ON daily_tasks(task_date DESC);
```

### TypeScript类型定义

```typescript
// src/types/database.ts
export interface DailyTask {
  id: number;
  task_date: string;  // YYYY-MM-DD
  status: 'init' | 'list_fetched' | 'processing' | 'aggregating' | 'published' | 'archived';
  total_articles: number;
  completed_articles: number;
  failed_articles: number;
  created_at: number;
  updated_at: number;
  published_at: number | null;
}

export interface Article {
  id: number;
  task_date: string;
  story_id: number;
  rank: number;
  url: string;
  title_en: string;
  title_zh: string | null;
  score: number;
  published_time: number;
  content_summary_zh: string | null;
  comment_summary_zh: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  retry_count: number;
  created_at: number;
  updated_at: number;
}

export interface TaskBatch {
  id: number;
  task_date: string;
  batch_index: number;
  article_count: number;
  subrequest_count: number;
  duration_ms: number;
  status: 'success' | 'partial' | 'failed';
  error_message: string | null;
  created_at: number;
}
```

## Architecture

### 组件设计

```
src/services/
├── taskStorage.ts           # D1 CRUD操作封装
│   ├── TaskStorageService
│   ├── createDailyTask()
│   ├── getOrCreateTask()
│   ├── insertArticles()
│   ├── getPendingArticles()
│   ├── updateArticleStatus()
│   └── getTaskProgress()
│
├── taskExecutor.ts          # 分布式任务编排
│   ├── DistributedTaskExecutor
│   ├── initializeTask()     # 获取文章列表存入D1
│   ├── processNextBatch()   # 处理一批pending文章
│   ├── aggregateResults()   # 聚合completed文章
│   └── publishResults()     # 推送到GitHub/Telegram
│
└── subrequestCounter.ts     # Subrequest计数器（可选，用于监控）
    └── SubrequestTracker

src/worker/
├── index.ts                 # 修改scheduled handler
│   └── handleScheduledTrigger()  # 状态机驱动
│
└── handlers/
    ├── retryFailed.ts       # POST /retry-failed-tasks
    ├── forcePublish.ts      # POST /force-publish
    └── taskStatus.ts        # GET /task-status

src/types/
└── database.ts              # D1类型定义
```

### 处理流程详解

#### 阶段1: 初始化任务（首次触发）
```typescript
async function initializeTask(env: Env, date: string) {
  // 1. 获取文章列表（2-3 subrequest）
  const stories = await fetchTopStoriesByScore(30, startTime, endTime);
  
  // 2. 创建daily_task记录
  await taskStorage.createDailyTask(date, stories.length);
  
  // 3. 批量插入articles（状态: pending）
  await taskStorage.insertArticles(date, stories);
  
  // 4. 更新任务状态: init → list_fetched
  await taskStorage.updateTaskStatus(date, 'list_fetched');
}
```

#### 阶段2: 增量处理批次（每10分钟触发）
```typescript
async function processNextBatch(env: Env, date: string) {
  // 1. 查询pending文章（取6篇）
  const articles = await taskStorage.getPendingArticles(date, 6);
  if (articles.length === 0) return;
  
  // 2. 标记为processing
  await taskStorage.updateArticleStatus(articles.map(a => a.id), 'processing');
  
  // 3. 批量处理（25 subrequest）
  const results = await processBatch(articles);
  
  // 4. 更新completed或failed状态
  await taskStorage.batchUpdateResults(results);
  
  // 5. 记录批次执行情况
  await taskStorage.recordBatch(date, batchIndex, subrequestCount);
}
```

#### 阶段3: 聚合与推送（所有完成后）
```typescript
async function aggregateAndPublish(env: Env, date: string) {
  // 1. 查询所有completed文章
  const completedArticles = await taskStorage.getCompletedArticles(date);
  
  // 2. 转换为ProcessedStory格式
  const stories = completedArticles.map(toProcessedStory);
  
  // 3. 生成Markdown
  const markdown = generateMarkdownContent(stories, new Date(date));
  
  // 4. 推送到GitHub/Telegram（4 subrequest）
  await publishToGitHub(markdown, date);
  await publishToTelegram(stories, date);
  
  // 5. 更新任务状态: aggregating → published
  await taskStorage.updateTaskStatus(date, 'published');
}
```

### Cron Handler状态机
```typescript
async function handleScheduledTrigger(env: Env) {
  const today = formatDateForDisplay(new Date());
  const task = await taskStorage.getOrCreateTask(today);
  
  switch (task.status) {
    case 'init':
      await initializeTask(env, today);
      break;
    
    case 'list_fetched':
    case 'processing':
      const hasMore = await processNextBatch(env, today);
      if (!hasMore) {
        await taskStorage.updateTaskStatus(today, 'aggregating');
      }
      break;
    
    case 'aggregating':
      await aggregateAndPublish(env, today);
      break;
    
    case 'published':
      // 已完成，跳过
      logInfo('Task already published for today');
      break;
  }
}
```

## Risks / Trade-offs

### 风险1: D1数据库冷启动延迟
**描述**: D1在免费版可能有冷启动延迟（首次查询>100ms）  
**影响**: 增加单次执行时间  
**缓解**: 每10分钟触发保持连接温热；查询使用索引优化

### 风险2: 任务跨日处理冲突
**描述**: 如果某日任务未完成，次日cron触发可能创建新任务  
**影响**: 旧任务被遗弃  
**缓解**: 
- 初始化时检查前一天是否有未完成任务
- 提供手动补偿端点完成旧任务
- 日志告警提示管理员介入

### 风险3: LLM API批量请求失败影响整批
**描述**: 批量翻译失败导致整批8篇文章标记为failed  
**影响**: 需要重试整批  
**缓解**: 
- 实现单篇降级策略（批量失败后逐个重试）
- 记录retry_count限制最大重试次数（3次）

### 风险4: Subrequest计数不准确
**描述**: D1绑定调用不算subrequest，但其他API可能计数偏差  
**影响**: 可能触发限制  
**缓解**: 
- 预留安全余量（目标40，限制50）
- 实现SubrequestTracker记录实际消耗
- 分批时动态调整批次大小

### Trade-off: 延迟 vs 成本
**选择**: 接受40分钟延迟换取免费版可用性  
**理由**: 
- 内容非实时性（每日一次发布可接受）
- 用户对延迟不敏感（通常订阅者阅读时间为发布后数小时）
- 成本节省显著（付费版$5/月 vs 免费版$0）

## Migration Plan

### 阶段1: 开发与测试（本地）
1. 创建D1数据库: `wrangler d1 create hackernews-task-db`
2. 运行migrations: `wrangler d1 migrations apply hackernews-task-db`
3. 实现新服务层: `taskStorage.ts`, `taskExecutor.ts`
4. 单元测试: 模拟D1绑定测试CRUD操作
5. 本地集成测试: `wrangler dev` + 手动触发验证流程

### 阶段2: 环境变量迁移
**新增配置** (wrangler.toml):
```toml
[[d1_databases]]
binding = "DB"
database_name = "hackernews-task-db"
database_id = "<generated-id>"

[vars]
D1_ENABLED = "true"
TASK_BATCH_SIZE = "8"
CRON_INTERVAL_MINUTES = "10"
MAX_RETRY_COUNT = "3"
```

### 阶段3: 灰度部署
1. 部署到生产但保持`D1_ENABLED=false`（使用旧架构）
2. 验证旧功能正常运行
3. 切换`D1_ENABLED=true`启用新架构
4. 监控首日执行情况（检查subrequest计数、任务完成时间）

### 阶段4: Rollback Plan
**触发条件**:
- Subrequest超限导致频繁失败
- D1查询延迟过高（>500ms）
- 任务完成时间超过2小时

**回滚步骤**:
1. 设置`D1_ENABLED=false`恢复旧架构
2. 检查当日任务状态，使用`/trigger-export-sync`补偿
3. 分析日志定位问题
4. 修复后重新灰度部署

## Open Questions

### Q1: 是否需要跨日任务优先级？
**问题**: 如果某日任务失败，次日是否优先完成旧任务？  
**建议**: 暂时不支持，依赖手动补偿。未来可扩展优先级队列。

### Q2: 是否需要实时进度通知？
**问题**: 用户是否需要知道"正在处理第2批/共4批"？  
**建议**: 第一版不实现，仅记录日志。未来可通过Telegram Bot发送进度消息。

### Q3: 是否需要持久化LLM翻译结果？
**问题**: 文章URL不变，翻译结果是否可以复用？  
**建议**: 暂不实现缓存，因为HN文章URL通常为新闻（不会重复出现在best列表）。

### Q4: 失败重试策略的最佳实践？
**问题**: 3次重试后仍失败，是否跳过该文章？  
**建议**: 跳过并记录，避免阻塞整体流程。手动补偿端点允许后续重试。
