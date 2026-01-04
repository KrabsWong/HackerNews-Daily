# D1 Database Management

This guide covers setup, maintenance, and best practices for managing Cloudflare D1 databases used by HackerNews Daily.

## Overview

HackerNews Daily uses Cloudflare D1 (SQL database) for distributed task processing. The system maintains task state, article processing status, and enables incremental processing across multiple cron triggers.

## Database Architecture

### Two-Database Strategy

We recommend creating **two separate databases** for production and development:

1. **Production Database** (`hackernews-daily-db`)
   - Used by deployed worker on Cloudflare
   - Contains real task data and article processing state
   - Should never be accessed directly during development

2. **Development Database** (`hackernews-daily-db-dev`)
   - Used by `wrangler dev` for local testing
   - Isolated from production data
   - Can be safely reset or experimented with

### Benefits of Database Isolation

- **Safety**: Local development cannot corrupt production data
- **Testing**: Freely test edge cases without affecting live tasks
- **Debugging**: Inspect development database without risk
- **Experimentation**: Try schema changes in dev before applying to production

## Initial Setup

### 1. Create Databases

```bash
# Create production database
wrangler d1 create hackernews-daily-db

# Expected output:
# ✅ Successfully created DB 'hackernews-daily-db' in region APAC
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "hackernews-daily-db"
# database_id = "abc-123-456-prod"

# Create development database
wrangler d1 create hackernews-daily-db-dev

# Expected output:
# ✅ Successfully created DB 'hackernews-daily-db-dev' in region APAC
# 
# [[d1_databases]]
# binding = "DB"
# database_name = "hackernews-daily-db-dev"
# database_id = "xyz-789-012-dev"
```

**Important**: Save both database IDs - you'll need them for wrangler.toml configuration.

### 2. Configure wrangler.toml

Edit `wrangler.toml` and add both database bindings:

```toml
# Production database binding
[[d1_databases]]
binding = "DB"
database_name = "hackernews-daily-db"
database_id = "abc-123-456-prod"  # Replace with your actual production ID

# Development database binding
[[env.dev.d1_databases]]
binding = "DB"
database_name = "hackernews-daily-db-dev"
database_id = "xyz-789-012-dev"  # Replace with your actual dev ID
```

### 3. Initialize Schemas

```bash
# Initialize production database
wrangler d1 execute hackernews-daily-db --file=./schema/d1-schema.sql

# Initialize development database
wrangler d1 execute hackernews-daily-db-dev --file=./schema/d1-schema.sql
```

## Database Schema

The system uses two main tables:

### `daily_tasks` Table
Tracks overall task status for each day:

| Column | Type | Description |
|--------|------|-------------|
| `task_date` | TEXT PRIMARY KEY | Date in YYYY-MM-DD format |
| `status` | TEXT | Task status: init, list_fetched, processing, aggregating, published, archived |
| `total_articles` | INTEGER | Total number of articles to process |
| `completed_articles` | INTEGER | Number of successfully processed articles |
| `failed_articles` | INTEGER | Number of failed articles |
| `created_at` | TEXT | ISO8601 timestamp of task creation |
| `updated_at` | TEXT | ISO8601 timestamp of last update |
| `published_at` | TEXT | ISO8601 timestamp when published (nullable) |

### `task_articles` Table
Tracks individual article processing:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PRIMARY KEY | Auto-increment ID |
| `task_date` | TEXT | Reference to daily_tasks.task_date |
| `hn_id` | INTEGER | HackerNews story ID |
| `status` | TEXT | Article status: pending, processing, completed, failed |
| `retry_count` | INTEGER | Number of retry attempts |
| `title` | TEXT | Original article title (nullable) |
| `translated_title` | TEXT | Chinese translated title (nullable) |
| `url` | TEXT | Article URL (nullable) |
| `points` | INTEGER | HackerNews points (nullable) |
| `comment_count` | INTEGER | Number of comments (nullable) |
| `content` | TEXT | Article content (nullable) |
| `summary` | TEXT | AI-generated summary (nullable) |
| `translated_summary` | TEXT | Chinese translated summary (nullable) |
| `comment_summary` | TEXT | Comment summary (nullable) |
| `translated_comment_summary` | TEXT | Chinese translated comment summary (nullable) |
| `error_message` | TEXT | Error message if failed (nullable) |
| `created_at` | TEXT | ISO8601 timestamp of creation |
| `updated_at` | TEXT | ISO8601 timestamp of last update |

## Common Operations

### Development Database

#### Query Current Task Status
```bash
wrangler d1 execute hackernews-daily-db-dev \
  --command="SELECT * FROM daily_tasks ORDER BY created_at DESC LIMIT 5"
```

#### View Recent Articles
```bash
wrangler d1 execute hackernews-daily-db-dev \
  --command="SELECT task_date, hn_id, status, title FROM task_articles ORDER BY created_at DESC LIMIT 10"
```

#### Count Articles by Status
```bash
wrangler d1 execute hackernews-daily-db-dev \
  --command="SELECT task_date, status, COUNT(*) as count FROM task_articles GROUP BY task_date, status ORDER BY task_date DESC"
```

#### View Failed Articles
```bash
wrangler d1 execute hackernews-daily-db-dev \
  --command="SELECT task_date, hn_id, title, error_message FROM task_articles WHERE status='failed' ORDER BY updated_at DESC"
```

#### Reset Development Database
```bash
# Drop all tables and recreate schema (clean slate)
wrangler d1 execute hackernews-daily-db-dev --file=./schema/d1-schema.sql
```

#### Delete Today's Test Data
```bash
wrangler d1 execute hackernews-daily-db-dev \
  --command="DELETE FROM task_articles WHERE task_date='2026-01-04'; DELETE FROM daily_tasks WHERE task_date='2026-01-04';"
```

### Production Database

**⚠️ Warning**: Only run queries on production database when necessary. Always test in development first.

#### View Task Status (Read-Only)
```bash
wrangler d1 execute hackernews-daily-db \
  --command="SELECT * FROM daily_tasks WHERE task_date >= date('now', '-7 days') ORDER BY task_date DESC"
```

#### Export Production Data (Backup)
```bash
# Export to local file for backup
wrangler d1 export hackernews-daily-db --output=backup-$(date +%Y%m%d).sql
```

#### View Task Progress
```bash
wrangler d1 execute hackernews-daily-db \
  --command="SELECT task_date, status, total_articles, completed_articles, failed_articles, 
    ROUND(100.0 * completed_articles / NULLIF(total_articles, 0), 2) as completion_pct 
    FROM daily_tasks WHERE task_date >= date('now', '-7 days') ORDER BY task_date DESC"
```

## Troubleshooting

### Problem: Task Stuck in "processing" Status

**Symptom**: A task shows status "processing" for hours with no progress.

**Diagnosis**:
```bash
# Check article statuses
wrangler d1 execute hackernews-daily-db \
  --command="SELECT status, COUNT(*) FROM task_articles WHERE task_date='2026-01-04' GROUP BY status"

# View failed articles
wrangler d1 execute hackernews-daily-db \
  --command="SELECT hn_id, retry_count, error_message FROM task_articles WHERE task_date='2026-01-04' AND status='failed'"
```

**Solution**: Use the retry endpoint to reset failed articles:
```bash
curl -X POST https://your-worker.workers.dev/retry-failed-tasks
```

### Problem: Duplicate Articles

**Symptom**: Same article appears multiple times for a date.

**Diagnosis**:
```bash
wrangler d1 execute hackernews-daily-db \
  --command="SELECT task_date, hn_id, COUNT(*) as count FROM task_articles GROUP BY task_date, hn_id HAVING count > 1"
```

**Solution**: This shouldn't happen with current schema (unique constraint on task_date + hn_id). Contact support if it occurs.

### Problem: Development Database Out of Sync

**Symptom**: Schema errors when running locally.

**Solution**: Reset development database to match production schema:
```bash
# Re-apply schema (drops and recreates tables)
wrangler d1 execute hackernews-daily-db-dev --file=./schema/d1-schema.sql
```

## Schema Migrations

When updating the database schema:

1. **Create Migration File**: Add new SQL file to `schema/migrations/`
2. **Test in Development**: Apply to dev database first
   ```bash
   wrangler d1 execute hackernews-daily-db-dev --file=./schema/migrations/001_add_column.sql
   ```
3. **Verify Locally**: Test with `wrangler dev`
4. **Apply to Production**: After verification, apply to production
   ```bash
   wrangler d1 execute hackernews-daily-db --file=./schema/migrations/001_add_column.sql
   ```

## Free Tier Limits

Cloudflare D1 free tier provides:

| Resource | Free Tier Limit | Daily Usage (Estimated) |
|----------|----------------|------------------------|
| Storage | 5 GB | ~10 MB (30 articles/day × 365 days) |
| Reads | 5,000,000/day | ~100 reads/day |
| Writes | 100,000/day | ~200 writes/day |

**Retention Policy**: Consider archiving tasks older than 90 days to manage storage.

## Best Practices

1. **Always Use Dev Database Locally**: Never point local development to production
2. **Test Queries First**: Test all queries on dev database before running on production
3. **Regular Backups**: Export production database weekly
4. **Monitor Free Tier Usage**: Check Cloudflare dashboard for quota usage
5. **Clean Up Old Data**: Periodically archive tasks older than 90 days
6. **Schema Changes**: Always test migrations in dev environment first

## Monitoring

### Check Database Size
```bash
# View database info
wrangler d1 info hackernews-daily-db
```

### View Recent Activity
```bash
# Last 24 hours of tasks
wrangler d1 execute hackernews-daily-db \
  --command="SELECT task_date, status, total_articles, completed_articles 
    FROM daily_tasks 
    WHERE created_at >= datetime('now', '-1 day') 
    ORDER BY created_at DESC"
```

## Cleanup and Maintenance

### Archive Old Tasks (90+ days)

```bash
# Export old data first
wrangler d1 execute hackernews-daily-db \
  --command="SELECT * FROM daily_tasks WHERE task_date < date('now', '-90 days')" \
  --output=archived-tasks-$(date +%Y%m%d).json

# Delete old articles
wrangler d1 execute hackernews-daily-db \
  --command="DELETE FROM task_articles WHERE task_date < date('now', '-90 days')"

# Delete old tasks
wrangler d1 execute hackernews-daily-db \
  --command="DELETE FROM daily_tasks WHERE task_date < date('now', '-90 days')"
```

## Further Reading

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Local Development Guide](./local-development.md)
