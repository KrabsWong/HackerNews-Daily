# 本地开发指南

## 概述

本项目使用 Cloudflare Worker 模式进行开发和部署。本地开发使用 `wrangler dev` 命令启动本地开发服务器。

## 环境配置

### 安装依赖

```bash
npm install
```

### 配置环境变量

本地开发使用 `.dev.vars` 文件配置环境变量：

```bash
# 复制示例配置
cp .env.example .dev.vars

# 编辑 .dev.vars 添加你的 API keys
nano .dev.vars
```

`.dev.vars` 文件格式（每行一个变量）：
```
LLM_PROVIDER=zhipu
LLM_ZHIPU_API_KEY=your_api_key_here
GITHUB_ENABLED=true
GITHUB_TOKEN=your_github_token
TARGET_REPO=owner/repo
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@your_channel
```

**注意**：`.dev.vars` 仅用于本地开发，生产环境使用 `wrangler secret put` 设置。

### 必需的环境变量

**LLM 配置（必需）**:
- `LLM_PROVIDER` - LLM 提供商: "deepseek", "openrouter", 或 "zhipu"
- 对应的 API Key:
  - `LLM_DEEPSEEK_API_KEY` (如果 LLM_PROVIDER=deepseek)
  - `LLM_OPENROUTER_API_KEY` (如果 LLM_PROVIDER=openrouter)
  - `LLM_ZHIPU_API_KEY` (如果 LLM_PROVIDER=zhipu)

**发布配置（至少启用一个）**:
- `GITHUB_ENABLED` - 是否启用 GitHub 发布（默认 "true"）
- `GITHUB_TOKEN` - GitHub Personal Access Token（如果启用 GitHub）
- `TARGET_REPO` - 目标仓库 "owner/repo"（如果启用 GitHub）
- `TELEGRAM_ENABLED` - 是否启用 Telegram 发布（默认 "false"）
- `TELEGRAM_BOT_TOKEN` - Telegram Bot Token（如果启用 Telegram）
- `TELEGRAM_CHANNEL_ID` - Telegram 频道 ID（如果启用 Telegram）

**可选配置**:
- `HN_STORY_LIMIT` - 获取的故事数量（默认 30）
- `HN_TIME_WINDOW_HOURS` - 时间窗口（默认 24 小时）
- `SUMMARY_MAX_LENGTH` - 摘要最大长度（默认 300 字符）
- `ENABLE_CONTENT_FILTER` - 是否启用内容过滤（默认 false）
- `CONTENT_FILTER_SENSITIVITY` - 过滤敏感度（默认 medium）

## 本地开发

### 启动开发服务器

```bash
# 启动本地 Worker 开发服务器
npm run dev:worker
```

这会启动本地服务器在 `http://localhost:8787`。

### 测试端点

在另一个终端窗口测试：

```bash
# 健康检查
curl http://localhost:8787/

# 触发导出（异步）
curl -X POST http://localhost:8787/trigger-export

# 触发导出（同步，等待完成）
curl -X POST http://localhost:8787/trigger-export-sync
```

### 查看日志

Worker 的所有 `console.log` 输出会显示在启动 `npm run dev:worker` 的终端中。

## 构建和部署

### 构建 Worker

```bash
# 构建 Worker bundle
npm run build:worker

# 监视模式（自动重新构建）
npm run build:worker:watch
```

### 部署到 Cloudflare

```bash
# 部署到生产环境
npm run deploy:worker

# 部署到 staging 环境
npm run deploy:worker:staging

# 查看实时日志
npm run logs:worker
```

### 设置生产环境 Secrets

```bash
# 设置 API Keys
npx wrangler secret put LLM_ZHIPU_API_KEY
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHANNEL_ID
```

## 故障排查

### 问题 1: 环境变量未加载

```
LLM_ZHIPU_API_KEY is required when LLM_PROVIDER=zhipu
```

**解决方案**:
1. 确认 `.dev.vars` 文件存在且格式正确
2. 确认变量名拼写正确
3. 重启 `npm run dev:worker`

### 问题 2: 网络错误

```
Failed to fetch stories from Algolia HN API
```

**解决方案**:
1. 检查网络连接
2. 确认可以访问 `https://hn.algolia.com`
3. 检查代理设置
4. 稍后重试

### 问题 3: Worker 构建错误

```
Could not resolve "fs/promises"
```

**解决方案**:
- 确保 `wrangler.toml` 中有 `compatibility_flags = ["nodejs_compat"]`
- 运行 `npm run build:worker` 检查构建

### 问题 4: TypeScript 错误

**解决方案**:
- 运行 `npm run build:worker` 查看详细错误
- 确保 `tsconfig.json` 配置正确

## 开发工作流

### 推荐工作流

1. **启动本地开发服务器**:
   ```bash
   npm run dev:worker
   ```

2. **在另一个终端测试**:
   ```bash
   # 测试完整导出流程
   curl -X POST http://localhost:8787/trigger-export-sync
   ```

3. **修改代码后**:
   - `wrangler dev` 会自动重新加载
   - 或手动重启 `npm run dev:worker`

4. **部署到生产**:
   ```bash
   npm run deploy:worker
   
   # 查看日志
   npm run logs:worker
   ```

### 代码修改指南

**修改 Worker 逻辑**:
- 编辑 `src/worker/` 下的文件
- 测试：`npm run dev:worker` + `curl -X POST http://localhost:8787/trigger-export-sync`

**修改共享逻辑**（API、服务、工具）:
- 编辑 `src/api/`, `src/services/`, `src/utils/`
- 测试：`npm run dev:worker` + `curl -X POST http://localhost:8787/trigger-export-sync`

**修改类型定义**:
- 编辑 `src/types/` 下的文件
- 运行 `npm run build:worker` 确认无编译错误

## 更多资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [日志配置](./logging.md)
- [部署指南](./cloudflare-worker-deployment.md)
