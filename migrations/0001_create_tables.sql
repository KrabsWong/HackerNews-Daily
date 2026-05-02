-- Migration: Create tables for distributed task processing
-- Description: Initial schema for daily_tasks, articles, and task_batches

-- Daily tasks table: tracks overall task status per day
CREATE TABLE IF NOT EXISTS daily_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_date TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'init',
    total_articles INTEGER NOT NULL DEFAULT 0,
    completed_articles INTEGER NOT NULL DEFAULT 0,
    failed_articles INTEGER NOT NULL DEFAULT 0,
    published_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Articles table: stores individual article processing status
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_date TEXT NOT NULL,
    story_id INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    url TEXT NOT NULL,
    title_en TEXT NOT NULL,
    title_zh TEXT,
    score INTEGER NOT NULL,
    published_time INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    content_summary_zh TEXT,
    comment_summary_zh TEXT,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (task_date) REFERENCES daily_tasks(task_date)
);

-- Task batches table: records batch execution metrics
CREATE TABLE IF NOT EXISTS task_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_date TEXT NOT NULL,
    batch_index INTEGER NOT NULL,
    article_count INTEGER NOT NULL,
    subrequest_count INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (task_date) REFERENCES daily_tasks(task_date),
    UNIQUE(task_date, batch_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_task_date ON articles(task_date);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_task_date_status ON articles(task_date, status);
CREATE INDEX IF NOT EXISTS idx_task_batches_task_date ON task_batches(task_date);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_status ON daily_tasks(status);
