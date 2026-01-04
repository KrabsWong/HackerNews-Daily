# daily-export Specification Delta

## Overview
修改Daily Export能力以支持分阶段增量处理，替代原有的单次同步导出模式。

## MODIFIED Requirements

### Requirement: Export Command Option
The system SHALL provide export functionality through incremental batch processing stored in D1, replacing the single-pass export mode.

#### Scenario: Incremental Export via Cron
**Given** cron triggers worker at scheduled intervals  
**When** export process executes  
**Then** the system processes articles in batches from D1 task queue  
**And** each batch completes within subrequest limits (<45 subrequests)  
**And** progress is persisted to D1 between batches  
**And** final aggregation occurs after all articles are processed

#### Scenario: Manual Export Trigger
**Given** user calls `POST /trigger-export-sync`  
**When** handler receives the request  
**Then** the system SHALL check current task status in D1  
**And** initiate new task if none exists  
**And** continue processing from current progress if task exists  
**And** return synchronous response with task status and progress

### Requirement: Previous Calendar Day Filtering
The system SHALL filter articles to only include those created during the previous calendar day (00:00:00 to 23:59:59 in UTC timezone), stored in D1 for incremental processing.

#### Scenario: Query on December 7 UTC with D1 Storage
**Given** current UTC time is December 7, 2025 01:00  
**When** export initialization executes  
**Then** the system queries articles from December 6, 2025 00:00:00 to 23:59:59 UTC  
**And** stores filtered article metadata in D1 `articles` table with `pending` status  
**And** subsequent batches process articles from D1 queue

#### Scenario: Query spans midnight in UTC
**Given** cron triggers at December 7, 2025 01:30 AM UTC  
**When** checking for tasks  
**Then** the system queries D1 for December 6 task  
**And** creates new December 7 task if December 6 is published  
**And** archives December 6 task if not yet completed

#### Scenario: Timestamp display in UTC
**Given** an article with Unix timestamp stored in D1  
**When** formatting for final markdown export  
**Then** the system converts timestamp to UTC  
**And** displays time in format "YYYY-MM-DD HH:mm" in UTC  
**And** no timezone conversion is performed

### Requirement: Markdown File Generation
The system SHALL generate a markdown file with Jekyll-compatible YAML front matter using UTC dates, assembled from completed articles stored in D1.

#### Scenario: Jekyll front matter with UTC date from D1
**Given** all articles are processed and marked `completed` in D1  
**When** aggregating results for markdown generation  
**Then** the system SHALL query all `completed` articles from D1  
**And** generate Jekyll front matter with UTC date: `HackerNews Daily - YYYY-MM-DD`  
**And** the `date` field SHALL use UTC date: `YYYY-MM-DD`  
**And** both dates SHALL match the task date

#### Scenario: Article timestamps in UTC from D1 Records
**Given** markdown file is generated from D1 completed articles  
**When** formatting article metadata  
**Then** each article's **发布时间** SHALL display UTC time from `published_time` field  
**And** translated titles SHALL come from `title_zh` field  
**And** summaries SHALL come from `content_summary_zh` and `comment_summary_zh` fields

## ADDED Requirements

### Requirement: Incremental Batch Processing
The system SHALL process articles in fixed-size batches to stay within subrequest limits.

#### Scenario: Initialize Task with Article List
**Given** no task exists for current date  
**When** initialization handler executes  
**Then** the system SHALL fetch HN best stories list (2-3 subrequests)  
**And** create daily_task record in D1 with status `init`  
**And** bulk insert 30 articles to D1 with status `pending`  
**And** update task status to `list_fetched`

#### Scenario: Process Batch of 8 Articles
**Given** task status is `list_fetched` or `processing`  
**When** batch processing handler executes  
**Then** the system SHALL query 8 `pending` articles from D1  
**And** mark them as `processing`  
**And** fetch content, translate titles/summaries (19 subrequests)  
**And** update articles to `completed` status with translation results  
**And** record batch execution metrics in `task_batches` table

#### Scenario: Handle Partial Batch Failure
**Given** 8 articles in processing batch  
**When** 2 articles fail due to LLM timeout  
**Then** the system SHALL mark 6 articles as `completed`  
**And** mark 2 articles as `failed` with error messages  
**And** continue to next batch without blocking

#### Scenario: Complete All Batches
**Given** all 30 articles are `completed` or `failed`  
**When** checking for pending articles  
**Then** the system SHALL find no more `pending` articles  
**And** update task status from `processing` to `aggregating`  
**And** trigger aggregation and publish phase

### Requirement: Result Aggregation from D1
The system SHALL aggregate completed articles from D1 for final markdown generation.

#### Scenario: Aggregate Completed Articles Only
**Given** 28 articles `completed` and 2 articles `failed`  
**When** aggregation handler executes  
**Then** the system SHALL query all `completed` articles from D1  
**And** ignore `failed` articles  
**And** convert to ProcessedStory format  
**And** generate markdown content

#### Scenario: Publish Aggregated Results
**Given** markdown content is generated from D1 results  
**When** publish handler executes  
**Then** the system SHALL push to GitHub (1-2 subrequests)  
**And** push to Telegram if enabled (1-2 subrequests)  
**And** update task status to `published`  
**And** record `published_at` timestamp

### Requirement: Task Progress Tracking
The system SHALL provide visibility into task execution progress.

#### Scenario: Query Task Status
**Given** user calls `GET /task-status`  
**When** handler executes  
**Then** the system SHALL query task from D1  
**And** return JSON response with:  
  - task_date  
  - status (init/processing/aggregating/published)  
  - total_articles, completed_articles, failed_articles  
  - batch execution history  
**And** provide real-time progress percentage

#### Scenario: Retry Failed Articles
**Given** user calls `POST /retry-failed-tasks`  
**When** handler executes  
**Then** the system SHALL query all `failed` articles  
**And** reset status to `pending` if retry_count < 3  
**And** increment retry_count  
**And** return count of articles queued for retry

### Requirement: Cross-day Task Handling
The system SHALL handle task transitions across day boundaries.

#### Scenario: Archive Previous Day Task
**Given** new day begins (UTC midnight)  
**When** cron handler executes  
**Then** the system SHALL check previous day task status  
**And** if status is `published`, mark as `archived`  
**And** create new task for current day with status `init`

#### Scenario: Warn on Incomplete Previous Task
**Given** previous day task status is `processing`  
**When** new day cron handler executes  
**Then** the system SHALL log warning about incomplete task  
**And** create new task for current day anyway  
**And** provide manual recovery endpoint for old task
