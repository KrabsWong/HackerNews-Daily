/**
 * State Machine Module
 * Manages distributed task processing with state machine transitions
 * State transitions: init → list_fetched → processing → aggregating → published
 */

import { createTaskExecutor } from '../../services/task';
import { formatDateForDisplay } from '../../utils/date';
import { logInfo, logError } from '../logger';
import type { Env } from '../../types/worker';
import { DailyTaskStatus } from '../../types/database';

/**
 * State transition handlers
 */
interface StateHandlers {
  [DailyTaskStatus.INIT]: () => Promise<void>;
  [DailyTaskStatus.LIST_FETCHED]: () => Promise<void>;
  [DailyTaskStatus.PROCESSING]: () => Promise<void>;
  [DailyTaskStatus.AGGREGATING]: () => Promise<void>;
  [DailyTaskStatus.PUBLISHED]: () => Promise<void>;
  [DailyTaskStatus.ARCHIVED]: () => Promise<void>;
}

/**
 * State machine context
 */
interface StateMachineContext {
  env: Env;
  taskDate: string;
  executor: ReturnType<typeof createTaskExecutor>;
  storage: any;
}

/**
 * Handle INIT state
 * Initialize task: fetch article list and store in D1
 */
async function handleInitState(context: StateMachineContext): Promise<void> {
  logInfo('State: init -> Fetching article list');

  const result = await context.executor.initializeTask(context.taskDate);
  logInfo('Task initialized', result);
}

/**
 * Handle LIST_FETCHED state
 * Process next batch of articles
 */
async function handleListFetchedState(context: StateMachineContext): Promise<void> {
  return handleProcessingState(context);
}

/**
 * Handle PROCESSING state
 * Process next batch of articles
 */
async function handleProcessingState(context: StateMachineContext): Promise<void> {
  logInfo(`State: processing -> Processing next batch`);

  const batchSize = parseInt(context.env.TASK_BATCH_SIZE || '6', 10);
  const result = await context.executor.processNextBatch(context.taskDate, batchSize);

  logInfo('Batch processed', result);

  // Check if all articles are processed (no pending or processing articles)
  if (result.pending === 0 && result.processing === 0) {
    logInfo('All articles processed, transitioning to aggregating');
    await context.storage.updateTaskStatus(context.taskDate, DailyTaskStatus.AGGREGATING);
  }
}

/**
 * Handle AGGREGATING state
 * Aggregate results and publish
 */
async function handleAggregatingState(context: StateMachineContext): Promise<void> {
  logInfo('State: aggregating -> Aggregating and publishing');

  const aggregateResult = await context.executor.aggregateResults(context.taskDate);

  logInfo('Results aggregated', {
    storyCount: aggregateResult.stories.length,
    markdownLength: aggregateResult.markdown.length
  });

  // Publish results
  const publishResult = await context.executor.publishResults(context.taskDate, aggregateResult.markdown);
  logInfo('Results published', publishResult);
}

/**
 * Handle PUBLISHED state
 * Task already completed
 */
async function handlePublishedState(context: StateMachineContext): Promise<void> {
  logInfo('Task already published for today');
}

/**
 * Handle ARCHIVED state
 * Task is archived, should have been reinitialized
 */
async function handleArchivedState(context: StateMachineContext): Promise<void> {
  logInfo('Task is archived, should have been reinitialized');
}

/**
 * Create state machine handlers
 */
function createStateHandlers(context: StateMachineContext): StateHandlers {
  return {
    [DailyTaskStatus.INIT]: () => handleInitState(context),
    [DailyTaskStatus.LIST_FETCHED]: () => handleListFetchedState(context),
    [DailyTaskStatus.PROCESSING]: () => handleProcessingState(context),
    [DailyTaskStatus.AGGREGATING]: () => handleAggregatingState(context),
    [DailyTaskStatus.PUBLISHED]: () => handlePublishedState(context),
    [DailyTaskStatus.ARCHIVED]: () => handleArchivedState(context),
  };
}

/**
 * Execute state machine for distributed task processing
 */
export async function executeStateMachine(env: Env): Promise<void> {
  try {
    logInfo('=== Distributed Task Processing (Scheduled) ===');

    // Debug: Log environment configuration
    console.log('🔍 Environment Check:');
    console.log(`   CRAWLER_API_URL: ${env.CRAWLER_API_URL ? env.CRAWLER_API_URL.substring(0, 50) + '...' : 'NOT SET'}`);
    console.log(`   CRAWLER_API_TOKEN: ${env.CRAWLER_API_TOKEN ? 'SET (' + env.CRAWLER_API_TOKEN.substring(0, 10) + '...)' : 'NOT SET'}`);

    // Get today's date
    const today = new Date();
    const taskDate = formatDateForDisplay(today);

    logInfo('Task date', { taskDate });

    // Initialize task executor
    const executor = createTaskExecutor(env);

    // Get or create task
    const storage = executor['storage']; // Access private field for task status check
    const task = await storage.getOrCreateTask(taskDate);

    logInfo('Current task status', {
      taskDate: task.task_date,
      status: task.status,
      totalArticles: task.total_articles,
      completedArticles: task.completed_articles,
      failedArticles: task.failed_articles
    });

    // Create state machine context
    const context: StateMachineContext = {
      env,
      taskDate,
      executor,
      storage,
    };

    // Create state handlers
    const handlers = createStateHandlers(context);

    // Execute state handler based on current state
    const handler = handlers[task.status];
    if (handler) {
      await handler();
    } else {
      throw new Error(`Unknown task status: ${task.status}`);
    }

    logInfo('=== Distributed Task Processing Completed ===');
  } catch (error) {
    logError('Distributed task processing failed', error);
    throw error;
  }
}
