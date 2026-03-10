# API Endpoints

This document describes all HTTP endpoints exposed by the HackerNews Daily Cloudflare Worker.

## Base URL

```
https://your-worker.workers.dev
```

For local development:
```
http://localhost:8787
```

## Available Endpoints

### Health Check

**Endpoint**: `GET /`

**Description**: Basic health check to verify the worker is running.

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: text/plain
X-Worker-Version: 5.0.0

HackerNews Daily Export Worker (Distributed Mode)
```

---

### Trigger Export (Async)

**Endpoint**: `POST /trigger-export`

**Description**: Manually trigger a new distributed export. This runs in the background.

**Request**:
```bash
curl -X POST https://your-worker.workers.dev/trigger-export
```

**Response**:
```json
{
  "success": true,
  "message": "Distributed export started in background"
}
```

**Behavior**:
- Checks current task status
- Creates new task if needed for today's date
- Initiates distributed processing
- Returns immediately (async execution)

---

### Trigger Export Sync (Sync)

**Endpoint**: `POST /trigger-export-sync`

**Description**: Trigger export and wait for completion (synchronous mode).

**Request**:
```bash
curl -X POST https://your-worker.workers.dev/trigger-export-sync
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Distributed export completed"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Export failed: Error message"
}
```

**Behavior**:
- Waits for full export to complete
- Returns final status
- Use for testing or manual execution
- May timeout for large exports

---

### Task Status

**Endpoint**: `GET /task-status`

**Description**: Query the current task status and progress.

**Request**:
```bash
curl https://your-worker.workers.dev/task-status
```

**Response**:
```json
{
  "success": true,
  "taskDate": "2026-01-04",
  "status": "processing",
  "totalArticles": 30,
  "completedArticles": 18,
  "failedArticles": 2,
  "progress": {
    "pendingCount": 8,
    "processingCount": 2
  },
  "createdAt": "2026-01-04T00:00:00.000Z",
  "updatedAt": "2026-01-04T00:50:23.456Z",
  "publishedAt": null
}
```

**Status Values**:
- `init` - Task created, not started
- `list_fetched` - Article list fetched, stored in D1
- `processing` - Processing batches of articles
- `aggregating` - All articles completed, aggregating results
- `published` - Content published to GitHub/Telegram
- `archived` - Task archived (old task)

**Use Cases**:
- Monitor export progress from dashboard
- Debug stuck tasks
- Verify batch processing is working

---

### Retry Failed Tasks

**Endpoint**: `POST /retry-failed-tasks`

**Description**: Reset all failed articles to `pending` status for retry.

**Request**:
```bash
curl -X POST https://your-worker.workers.dev/retry-failed-tasks
```

**Response**:
```json
{
  "success": true,
  "message": "2 failed articles reset to pending",
  "taskDate": "2026-01-04",
  "retryCount": 2
}
```

**Behavior**:
- Queries all articles with `failed` status
- Resets status to `pending`
- Increments `retry_count` for each article
- Articles will be picked up in next batch

**Use Cases**:
- Recover from transient failures
- Retry after fixing configuration issues
- Manual intervention for stuck tasks

---

### Force Publish

**Endpoint**: `POST /force-publish`

**Description**: Force publication of completed articles, skipping failed ones.

**Request**:
```bash
curl -X POST https://your-worker.workers.dev/force-publish
```

**Response**:
```json
{
  "success": true,
  "message": "Force publish completed",
  "taskDate": "2026-01-04",
  "published": 28
}
```

**Behavior**:
- Aggregates all `completed` status articles
- Skips `failed` and `pending` articles
- Generates markdown content
- Publishes to GitHub/Telegram
- Marks task as `published`

**Use Cases**:
- Publish partial results when some articles fail
- Force completion of stuck tasks
- Manual control over publishing

---

## Error Responses

All endpoints may return error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common Errors**:
- `D1 database binding (DB) is required` - D1 database not configured
- `D1_ENABLED is required for distributed task processing` - Configuration missing
- `No stories found for {taskDate}` - No articles to process
- `Export failed: {details}` - Processing error occurred

---

## Rate Limiting

- **Scheduled triggers**: Every 10 minutes (configured in `wrangler.toml`)
- **Manual triggers**: No rate limiting (use responsibly)
- **Subrequest limits**: Free tier limit of 50 per execution

Each batch processes 6 articles (≈25 subrequests), so manual triggers are safe.

---

## Authentication

No authentication required for public endpoints.

**Note**: Secrets (LLM API keys, GitHub token, Telegram credentials) are configured via Cloudflare Workers secrets and are not exposed through these endpoints.

---

## CORS

The worker allows CORS for all origins. This enables:
- Browser-based API calls
- Postman/curl testing
- Integration with frontend applications

---

## Monitoring and Debugging

### View Real-Time Logs

```bash
# Cloudflare dashboard
https://dash.cloudflare.com/→ Workers → hackernews-daily → Logs

# Or use wrangler CLI
wrangler tail
```

### Check Task Progress

```bash
# Use the task-status endpoint
curl https://your-worker.workers.dev/task-status | jq
```

### Debug Stuck Tasks

1. Check task status: `curl /task-status`
2. View stuck articles in D1
3. Use `/retry-failed-tasks` to reset failed articles
4. Use `/force-publish` to publish partial results

---

## Development Notes

### Local Testing

```bash
# Start local worker
npm run dev:worker

# In another terminal, test endpoints
curl -X POST http://localhost:8787/trigger-export
curl http://localhost:8787/task-status
```

### Database Isolation

Local development uses the development D1 database (`hackernews-daily-db-dev`), ensuring you never modify production data during testing.

See [D1 Database Management](./d1-database-management.md) for details.

---

## Related Documentation

- [D1 Database Management](./d1-database-management.md) - Database setup and operations
- [Cloudflare Worker Deployment](./cloudflare-worker-deployment.md) - Deployment guide
- [Local Development](./local-development.md) - Local testing guide
- [System Architecture](../README.md#system-architecture) - Overall system design
