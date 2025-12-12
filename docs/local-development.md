# 本地开发指南

## 概述

本项目支持两种运行模式：

1. **本地 CLI 模式** (`npm run fetch`) - Node.js 本地执行
2. **Cloudflare Worker 模式** - 分布式云端执行

## 本地 CLI 模式

### 安装依赖

```bash
npm install
```

### 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑 .env 添加你的 API keys
nano .env
```

必需的环境变量：
- `DEEPSEEK_API_KEY` - DeepSeek API 密钥
- `GITHUB_TOKEN` - GitHub Personal Access Token（如果需要推送）

可选的环境变量：
- `HN_STORY_LIMIT` - 获取的故事数量（默认 30）
- `HN_TIME_WINDOW_HOURS` - 时间窗口（默认 24 小时）
- `SUMMARY_MAX_LENGTH` - 摘要最大长度（默认 300 字符）
- `CACHE_ENABLED` - 是否启用缓存（默认 true）
- `CACHE_TTL_MINUTES` - 缓存有效期（默认 30 分钟）

### 运行本地 fetch

#### 基本用法

```bash
# 获取并显示最新故事
npm run fetch
```

输出示例：
```
🔍 HackerNews Daily - Chinese Translation

Validating configuration...
Fetching up to 30 stories from the past 24 hours...
Found 30 best stories (by score) from the past 24 hours

Translating titles to Chinese...
Translated 30/30 titles...

Fetching and extracting article content...
Fetched metadata for 30 articles...

Generating AI-powered summaries...
Summarized 30 articles...

Fetching top comments for each story...
Fetched comments for 30 stories...

Summarizing comments...
Summarized comments for 30 stories...

Rendering results...

#1 【OpenAI 发布 GPT-5】
OpenAI Announces GPT-5
发布时间：2024-12-11 10:30  |  评分：850
链接：https://example.com/gpt5
描述：OpenAI 宣布推出最新的 GPT-5 模型...
评论要点：用户讨论了新模型的性能提升和应用场景...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Successfully displayed 30 stories
```

#### 导出到文件模式

```bash
# 导出昨天的文章到 Markdown 文件
npm run fetch -- --export-daily
```

这会：
1. 获取昨天（UTC 时间）的所有故事
2. 生成 Jekyll 格式的 Markdown 文件
3. 保存到 `hacknews-export/YYYY-MM-DD-daily.md`

输出示例：
```
📄 Export mode enabled - exporting yesterday's articles

Fetching up to 30 stories from the past 24 hours...
Found 25 stories from 2024-12-10

📁 Created directory: hacknews-export

✅ Successfully exported 25 stories to hacknews-export/2024-12-10-daily.md
```

#### 强制刷新（跳过缓存）

```bash
# 跳过缓存，强制重新获取
npm run fetch -- --no-cache

# 或
npm run fetch -- --refresh
```

### 本地 fetch 的特点

✅ **优点**:
- 完全本地执行，无需网络部署
- 可以快速测试和调试
- 支持缓存，避免重复 API 调用
- 可以导出到本地文件
- 无 subrequest 限制

❌ **限制**:
- 需要手动运行
- 不支持定时任务
- 依赖本地环境和依赖

⚠️ **注意事项**:
- 本地 fetch 使用的是旧的 API（`fetchTopStories`, `fetchCommentsBatch`）
- Worker 使用的是新的优化 API（`fetchTopStoriesByScore`, `fetchCommentsBatchFromAlgolia`）
- 两者的实现略有不同，但结果相同

### 缓存机制

本地模式支持缓存以提高性能：

- **缓存位置**: `.cache/stories.json`
- **缓存时效**: 默认 30 分钟（可配置）
- **缓存内容**: 处理后的故事（翻译、摘要、评论）

缓存会在以下情况失效：
- 超过 TTL 时间
- 配置变更（story limit, time window, summary length 等）
- 使用 `--no-cache` 标志

清除缓存：
```bash
rm -rf .cache/stories.json
```

## Cloudflare Worker 模式

### 本地开发

```bash
# 启动本地 Worker 开发服务器
npx wrangler dev
```

这会启动本地服务器在 `http://localhost:8787`，你可以测试所有 Worker 端点：

```bash
# 健康检查
curl http://localhost:8787/

# 触发导出（异步）
curl -X POST http://localhost:8787/trigger-export

# 触发导出（同步）
curl -X POST http://localhost:8787/trigger-export-sync
```

### Worker 日志

Worker 的所有 `console.log` 输出会显示在终端：

```bash
# 查看实时日志
npx wrangler tail --format pretty
```

详见 [LOGGING.md](./LOGGING.md)

## 性能对比

| 特性 | 本地 Fetch | Cloudflare Worker |
|------|-----------|-------------------|
| 执行位置 | 本地机器 | Cloudflare Edge |
| 触发方式 | 手动运行 | Cron 定时 / HTTP 触发 |
| 处理方式 | 单进程串行 | 串行处理（付费计划无限制） |
| 执行时间 | ~2-3 分钟（取决于网络和API） | ~2-3 分钟（取决于网络和API） |
| API 调用 | 约 66 次 | 约 66 次 |
| 缓存 | 本地文件缓存 | 本地文件缓存（CLI） |
| 日志 | 终端输出 | Cloudflare Logs |
| 适用场景 | 开发调试、一次性导出 | 生产自动化、定时任务 |

## 故障排查

### 本地 fetch 常见问题

#### 问题 1: API Key 错误
```
❌ Error: Missing DEEPSEEK_API_KEY environment variable
```

**解决方案**:
1. 检查 `.env` 文件是否存在
2. 确认 `DEEPSEEK_API_KEY` 已设置
3. 重新运行 `npm run fetch`

#### 问题 2: 网络错误
```
❌ Failed to fetch stories from Algolia HN API
```

**解决方案**:
1. 检查网络连接
2. 确认可以访问 `https://hn.algolia.com`
3. 检查代理设置
4. 稍后重试

#### 问题 3: 文件权限错误
```
❌ Permission denied writing to hacknews-export/2024-12-11-daily.md
```

**解决方案**:
1. 检查目录权限：`ls -la hacknews-export/`
2. 修改权限：`chmod -R 755 hacknews-export/`
3. 或删除并重新创建：`rm -rf hacknews-export && npm run fetch -- --export-daily`

#### 问题 4: TypeScript 错误
```
TypeError: Unknown file extension ".ts"
```

**解决方案**:
- 这个问题已修复，使用 `tsconfig.node.json` 配置
- 如果仍有问题，运行：`npm install ts-node typescript --save-dev`

### Worker 常见问题

#### 问题 1: wrangler dev 打包错误
```
Could not resolve "fs/promises"
```

**解决方案**:
- 这个问题已修复
- 确保 `compatibility_flags = ["nodejs_compat"]` 在 wrangler.toml 中
- 确保 tsconfig.json 使用 `"module": "ES2020"`

#### 问题 2: Worker 执行超时

**解决方案**:
- 项目使用 Cloudflare Workers 付费计划，无 CPU 时间和 subrequest 限制
- 如果使用免费计划遇到限制，需要升级或减少 `HN_STORY_LIMIT`

## 开发工作流

### 推荐工作流

1. **本地开发和测试**:
   ```bash
   # 修改代码
   npm run build
   
   # 本地测试
   npm run fetch
   
   # 或测试导出模式
   npm run fetch -- --export-daily
   ```

2. **Worker 本地测试**:
   ```bash
   # 构建
   npm run build
   
   # 启动本地 Worker
   npx wrangler dev
   
   # 在另一个终端测试
   curl -X POST http://localhost:8787/trigger-export
   ```

3. **部署到生产**:
   ```bash
   # 构建并部署
   npm run build
   npx wrangler deploy
   
   # 查看日志
   npx wrangler tail --format pretty
   ```

### 代码修改指南

**只修改本地逻辑**:
- 编辑 `src/index.ts`
- 测试：`npm run fetch`

**只修改 Worker 逻辑**:
- 编辑 `src/worker/` 下的文件
- 测试：`npx wrangler dev`

**修改共享逻辑**（API、服务、工具）:
- 编辑 `src/api/`, `src/services/`, `src/utils/`
- 同时测试本地和 Worker：
  ```bash
  npm run fetch
  npx wrangler dev
  ```

## 更多资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Workers KV 文档](https://developers.cloudflare.com/kv/)
- [日志配置](./LOGGING.md)
