/**
 * Task-related type definitions
 * 
 * Note: TaskExecutionStatus, BatchTask, BatchResult, TaskMetadata have been removed
 * as they were never used in the codebase. Task state is managed via database types
 * in types/database.ts (DailyTaskStatus, ArticleStatus, BatchStatus).
 */

// Re-export database types that are actually used for task management
export { DailyTaskStatus, ArticleStatus, BatchStatus } from './database';
