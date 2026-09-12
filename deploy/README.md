# 部署指南

本项目不是常驻服务。`npm start` 和 Docker 容器都会执行一次每日导出，然后退出；定时运行交给 `cron`。

推荐配置：2 核 2GB 以上服务器。下面示例统一使用 `/opt/hackernews-daily` 作为项目目录，如使用其他目录，请同步替换命令里的路径。

## 部署方式

- 原生 Node.js + cron：适合不使用 Docker 的服务器。
- Docker + cron：适合希望隔离运行环境的服务器。

## 1. 准备环境变量

在项目根目录创建 `.env`：

```bash
cd /opt/hackernews-daily
cp deploy/.env.example .env
vi .env
```

先手动执行一次，确认 API Key 和目标仓库配置正确，再配置定时任务。

## 2. 原生 Node.js 部署

服务器需要 Node.js 20+ 和 npm。

```bash
cd /opt/hackernews-daily
npm ci
npm run build
npm start
```

如果本地开发机和服务器不是同一台机器，可以把仓库上传或 `git clone` 到 `/opt/hackernews-daily` 后再执行上述命令。

## 3. Docker 部署

Dockerfile 只复制已经编译好的 `dist/`，所以构建镜像前必须先编译。

```bash
cd /opt/hackernews-daily
npm ci
npm run build
docker build -f deploy/Dockerfile -t hackernews-daily:latest .

# 测试执行
docker run --rm --env-file .env hackernews-daily:latest
```

也可以使用 Docker Compose 执行一次任务：

```bash
docker compose -f deploy/docker-compose.yml run --rm hackernews-daily
```

## 4. 配置 cron 定时任务

先创建日志目录。cron 的重定向目标目录不存在时，shell 会在启动任务前失败，脚本本身不会执行。

```bash
mkdir -p /opt/hackernews-daily/logs
touch /opt/hackernews-daily/logs/hackernews-daily.log
```

确认命令路径，cron 不一定加载交互式 shell 的 `PATH`：

```bash
command -v npm
command -v node
command -v docker
```

编辑当前用户的 crontab：

```bash
crontab -e
```

如果 Node.js 通过 nvs、nvm 等用户级工具安装，建议在 crontab 顶部显式设置包含 `node` 和 `npm` 的 `PATH`，否则 cron 里可能找不到 `node`：

```cron
PATH=/path/to/node-bin:/usr/local/bin:/usr/bin:/bin
```

也可以直接使用 `command -v npm` 输出的绝对路径，例如 `/home/ubuntu/.nvs/default/bin/npm`。

原生 Node.js 示例，每天早晨 8 点执行：

```cron
0 8 * * * mkdir -p /opt/hackernews-daily/logs && cd /opt/hackernews-daily && /usr/local/bin/npm start >> /opt/hackernews-daily/logs/hackernews-daily.log 2>&1
```

Docker 示例：

```cron
0 8 * * * mkdir -p /opt/hackernews-daily/logs && cd /opt/hackernews-daily && /usr/bin/docker run --rm --env-file .env hackernews-daily:latest >> /opt/hackernews-daily/logs/hackernews-daily.log 2>&1
```

如果 `command -v npm` 或 `command -v docker` 输出的路径不同，请使用实际路径替换示例里的 `/usr/local/bin/npm` 或 `/usr/bin/docker`。

查看已安装任务：

```bash
crontab -l
```

## 5. 手动验证 cron 命令

验证时直接手动执行 crontab 里的同一条命令，并查看同一个日志文件。

原生 Node.js：

```bash
mkdir -p /opt/hackernews-daily/logs && cd /opt/hackernews-daily && /usr/local/bin/npm start >> /opt/hackernews-daily/logs/hackernews-daily.log 2>&1
tail -f /opt/hackernews-daily/logs/hackernews-daily.log
```

Docker：

```bash
mkdir -p /opt/hackernews-daily/logs && cd /opt/hackernews-daily && /usr/bin/docker run --rm --env-file .env hackernews-daily:latest >> /opt/hackernews-daily/logs/hackernews-daily.log 2>&1
tail -f /opt/hackernews-daily/logs/hackernews-daily.log
```

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `LLM_DEEPSEEK_API_KEY` | ✅ | DeepSeek API Key（外链读取、翻译和摘要） |
| `TINYFISH_API_KEY` | ❌ | Tinyfish Search / Fetch 共用 Key；非空自动启用失败补偿，留空禁用 |
| `GITHUB_TOKEN` | ✅ | GitHub Personal Access Token |
| `TARGET_REPO` | ✅ | 目标仓库 (owner/repo) |
| `TARGET_BRANCH` | ❌ | 分支 (默认 main) |
| `HN_TARGET_DATE` | ❌ | 补跑日期，格式为 YYYY-MM-DD；日常任务不要长期设置 |
| `TELEGRAM_ENABLED` | ❌ | 是否启用 Telegram |
| `TELEGRAM_BOT_TOKEN` | ❌ | Telegram Bot Token |
| `TELEGRAM_CHANNEL_ID` | ❌ | Telegram Channel ID |

## 获取 API Key

- **DeepSeek**: https://platform.deepseek.com/
- **GitHub Token**: https://github.com/settings/tokens (repo 权限)

## 故障排查

```bash
# 查看日志
tail -f /opt/hackernews-daily/logs/hackernews-daily.log

# 手动执行测试（原生 Node.js）
npm start

# 手动执行测试（Docker）
docker run --rm --env-file .env hackernews-daily:latest

# 检查 cron 是否写入
crontab -l
```

## 更新服务

### 原生 Node.js

```bash
cd /opt/hackernews-daily
git pull
npm ci
npm run build
npm start
```

### Docker

```bash
cd /opt/hackernews-daily
git pull
npm ci
npm run build
docker build -f deploy/Dockerfile -t hackernews-daily:latest .
docker run --rm --env-file .env hackernews-daily:latest
```

## Tinyfish 补偿配置与历史重跑

### 配置位置

在**运行任务的服务器项目根目录** `/opt/hackernews-daily/.env` 添加一行（本地运行则修改本地项目根目录 `.env`）：

```dotenv
TINYFISH_API_KEY=你的实际TinyfishKey
```

Key 在 [Tinyfish 控制台](https://agent.tinyfish.ai/api-keys) 创建，Search 与 Fetch 共用。之前调研脚本目录里的 `.env` 不会被本项目读取，需要把 Key 填入上述文件。已有 `.env` 时只添加这一项，不要用示例文件覆盖现有配置。也可以通过进程环境变量注入，优先于 `.env`；禁用时清空该变量，并检查进程环境中没有旧值。

`LLM_DEEPSEEK_API_KEY` 仍为必填：Tinyfish 获取正文后依然交给 DeepSeek 生成摘要。GitHub、Telegram 的配置位置保持为同一份 `.env`。无需额外 npm 依赖、端口或后台服务，也无需修改 cron；服务器需能通过 HTTPS 访问 `api.fetch.tinyfish.ai`、`api.search.tinyfish.ai` 和原有 API。Docker 的 `--env-file .env` 和 Compose 的 `env_file: ../.env` 已自动传入新配置，无需在 Dockerfile 写 Key。

链路：DeepSeek 现有流程 → 失败时 Fetch 原文 → 正文不足时 Search 标题、Fetch 最多 3 个备选页面 → DeepSeek 判断相关性并摘要 → 仍失败则 `unavailable`。原文 Fetch 超时、5xx 或响应解析失败时继续搜索备选；401/403/429、后续搜索或摘要异常会结束该篇补偿，不阻断其他文章。未配置 Key 时保持原有行为。补偿会增加请求耗时以及 Search / LLM 用量；Fetch 的逐页成功与错误按 [官方接口格式](https://docs.tinyfish.ai/fetch-api) 分别处理。

### 更新部署

将本次代码同步到服务器并填写 Key 后，原生 Node.js 执行：

```bash
cd /opt/hackernews-daily
npm ci
npm run build
```

Docker 还需要重建镜像（只修改 `.env` 无法让旧镜像获得新代码）：

```bash
docker build -f deploy/Dockerfile -t hackernews-daily:latest .
```

如果通过 Compose 运行，则执行 `docker compose -f deploy/docker-compose.yml build hackernews-daily`。任务每次启动都会读取配置，无需重启常驻服务。

### 重跑 2026-09-11

日期范围为 **UTC 2026-09-11 00:00:00 至 2026-09-12 00:00:00（不含）**。命令会重新获取当天热门文章并生成完整日报，不是只修补失败条目；当前分数和评论可能与首次执行时不同。

可先预览，验证输出而不调用 GitHub / Telegram：

```bash
HN_TARGET_DATE=2026-09-11 npm run preview
```

原生 Node.js 正式重跑（在已编译的项目根目录执行）：

```bash
HN_TARGET_DATE=2026-09-11 TELEGRAM_ENABLED=false npm start
```

Docker：

```bash
docker run --rm --env-file .env \
  -e HN_TARGET_DATE=2026-09-11 -e TELEGRAM_ENABLED=false \
  hackernews-daily:latest
```

Docker Compose：

```bash
docker compose -f deploy/docker-compose.yml run --rm \
  -e HN_TARGET_DATE=2026-09-11 -e TELEGRAM_ENABLED=false hackernews-daily
```

正式重跑会更新 `TARGET_REPO` / `TARGET_BRANCH` 下该日期的 Markdown 文件。上述命令临时关闭 Telegram，避免重复推送；如需同时重新推送频道，将 `TELEGRAM_ENABLED=false` 改为 `TELEGRAM_ENABLED=true`，这会发送新消息，不会编辑旧消息。不要把 `HN_TARGET_DATE` 长期写入 `.env` 或 cron。

日志出现 `Tinyfish 补偿` 表示进入补偿，出现 `补偿成功：original/alternative` 表示恢复成功；已有 DeepSeek 摘要时不会触发 Tinyfish，未出现补偿日志不代表配置错误。
