/**
 * Mock Cloudflare Worker environment and utilities for testing
 * 
 * Provides fixtures for Worker Env, Request, Response, and ExecutionContext
 */

import type { Env } from '../../types/worker';

/**
 * Create a mock D1 database binding
 * This is a minimal mock that satisfies TypeScript but won't execute queries
 */
function createMockD1Database(): D1Database {
  const mockMeta = {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: 0,
    last_row_id: 0,
    changed_db: false,
    changes: 0,
  };

  const mockPreparedStatement: any = {
    bind: (..._args: any[]) => mockPreparedStatement,
    all: async () => ({ results: [], success: true, meta: mockMeta }),
    first: async () => null,
    run: async () => ({ results: [], success: true, meta: mockMeta }),
    raw: async () => [],
  };

  return {
    prepare: () => mockPreparedStatement,
    dump: async () => new ArrayBuffer(0),
    batch: async (_statements: any[]) => [],
    exec: async (_query: string) => ({ count: 0, duration: 0 }),
    withSession: async (callback: any) => await callback({}),
  } as unknown as D1Database;
}

/**
 * Detect if real production credentials are present in environment
 * 
 * @returns true if real credentials detected, false otherwise
 */
function detectRealCredentials(): boolean {
  return (
    (!!process.env.LLM_DEEPSEEK_API_KEY && process.env.LLM_DEEPSEEK_API_KEY.startsWith('sk-')) ||
    (!!process.env.GITHUB_TOKEN && (
      process.env.GITHUB_TOKEN.startsWith('ghp_') || 
      process.env.GITHUB_TOKEN.startsWith('github_pat_')
    )) ||
    (!!process.env.TELEGRAM_BOT_TOKEN && /^\d+:/.test(process.env.TELEGRAM_BOT_TOKEN)) ||
    false
  );
}

/**
 * Get list of detected real credentials for error messaging
 * 
 * @returns Array of credential names that appear to be real
 */
function getDetectedCredentials(): string[] {
  const detected: string[] = [];
  
  if (process.env.LLM_DEEPSEEK_API_KEY?.startsWith('sk-')) {
    detected.push('LLM_DEEPSEEK_API_KEY');
  }
  if (process.env.GITHUB_TOKEN?.startsWith('ghp_') || process.env.GITHUB_TOKEN?.startsWith('github_pat_')) {
    detected.push('GITHUB_TOKEN');
  }
  if (process.env.TELEGRAM_BOT_TOKEN?.match(/^\d+:/)) {
    detected.push('TELEGRAM_BOT_TOKEN');
  }
  
  return detected;
}

/**
 * Options for creating a mock Worker environment
 */
export interface MockEnvOptions {
  llmProvider?: 'deepseek' | 'openrouter' | 'zhipu';
  llmDeepseekModel?: string;
  llmOpenrouterModel?: string;
  llmZhipuModel?: string;
  githubEnabled?: boolean;
  telegramEnabled?: boolean;
  enableContentFilter?: boolean;
  contentFilterSensitivity?: 'low' | 'medium' | 'high';
  hnStoryLimit?: number;
  hnTimeWindowHours?: number;
  summaryMaxLength?: number;
  llmBatchSize?: number;
}

/**
 * Create a complete mock Worker Env object with all required properties
 * 
 * SAFETY: This function checks for real production credentials in the environment
 * and throws an error if found (unless ALLOW_INTEGRATION_TESTS is explicitly set).
 * This prevents accidentally running tests against production services.
 * 
 * @param options Configuration options for the environment
 * @returns A fully configured Env object suitable for testing
 * @throws Error if real credentials detected without ALLOW_INTEGRATION_TESTS=true
 */
export function createMockEnv(options?: MockEnvOptions): Env & Record<string, any> {
  // Safety Guard: Detect and prevent use of real production credentials
  if (detectRealCredentials() && !process.env.ALLOW_INTEGRATION_TESTS) {
    const detectedCreds = getDetectedCredentials();
    throw new Error(
      '🚨 Real API credentials detected in environment!\n\n' +
      `Detected credentials: ${detectedCreds.join(', ')}\n\n` +
      'This is a safety measure to prevent tests from accidentally affecting production data.\n\n' +
      'Options:\n' +
      '1. If you intend to run integration tests with real APIs:\n' +
      '   Set ALLOW_INTEGRATION_TESTS=true in your environment\n' +
      '   Example: ALLOW_INTEGRATION_TESTS=true npm test\n\n' +
      '2. If you want to run unit tests only:\n' +
      '   Remove production credentials from your environment\n' +
      `   Example: unset ${detectedCreds.join(' ')}\n`
    );
  }

  const {
    llmProvider = 'deepseek',
    llmDeepseekModel = 'deepseek-chat',
    llmOpenrouterModel = 'openai/gpt-4o-mini',
    llmZhipuModel = 'glm-4.5-flash',
    githubEnabled = true,
    telegramEnabled = false,
    enableContentFilter = false,
    contentFilterSensitivity = 'medium',
    hnStoryLimit = 30,
    hnTimeWindowHours = 24,
    summaryMaxLength = 500,
    llmBatchSize = 10,
  } = options || {};

  const env: Env & Record<string, any> = {
    // D1 Database binding (required)
    DB: createMockD1Database(),
    
    // Distributed task processing configuration
    TASK_BATCH_SIZE: '6',
    MAX_RETRY_COUNT: '3',
    
    // LLM Provider Configuration (Required)
    LLM_PROVIDER: llmProvider,
    LLM_DEEPSEEK_API_KEY: 'test-deepseek-key-12345',
    LLM_DEEPSEEK_MODEL: llmDeepseekModel,
    LLM_OPENROUTER_API_KEY: 'test-openrouter-key-12345',
    LLM_OPENROUTER_MODEL: llmOpenrouterModel,
    LLM_OPENROUTER_SITE_URL: 'https://example.com',
    LLM_OPENROUTER_SITE_NAME: 'Test App',
    
    // Zhipu configuration (added for comprehensive provider support)
    LLM_ZHIPU_API_KEY: 'test-zhipu-key-12345',
    LLM_ZHIPU_MODEL: llmZhipuModel,

    // GitHub Publisher Configuration (Optional, enabled by default)
    GITHUB_ENABLED: githubEnabled ? 'true' : 'false',
    GITHUB_TOKEN: 'test-github-token-12345',
    TARGET_REPO: 'test-user/test-repo',
    TARGET_BRANCH: 'main',

    // Telegram Publisher Configuration (Optional)
    TELEGRAM_ENABLED: telegramEnabled ? 'true' : 'false',
    TELEGRAM_BOT_TOKEN: 'test-telegram-bot-token-12345',
    TELEGRAM_CHANNEL_ID: '@test_channel',

    // Crawler Configuration (Optional)
    CRAWLER_API_URL: 'https://crawler.example.com/api',

    // Feature Flags and Configuration
    HN_STORY_LIMIT: String(hnStoryLimit),
    HN_TIME_WINDOW_HOURS: String(hnTimeWindowHours),
    SUMMARY_MAX_LENGTH: String(summaryMaxLength),
    ENABLE_CONTENT_FILTER: enableContentFilter ? 'true' : 'false',
    CONTENT_FILTER_SENSITIVITY: contentFilterSensitivity,
    CACHE_ENABLED: 'true',
    LLM_BATCH_SIZE: String(llmBatchSize),
  };

  return env;
}

/**
 * Mock Request object options
 */
export interface MockRequestOptions {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Create a mock HTTP Request object
 */
export function createMockRequest(options?: MockRequestOptions): Request {
  const {
    method = 'GET',
    url = 'https://example.com/api/',
    body = undefined,
    headers = {},
  } = options || {};

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return new Request(url, requestInit);
}

/**
 * Mock ExecutionContext options
 */
export interface MockExecutionContextOptions {
  waitUntilCallbacks?: ((promise: Promise<void>) => void)[];
  passThroughOnException?: () => void;
}

/**
 * Create a mock ExecutionContext object
 * 
 * This mock records all waitUntil() calls for verification in tests
 */
export function createMockExecutionContext(
  options?: MockExecutionContextOptions
): any {
  const waitUntilPromises: Promise<any>[] = [];
  const { waitUntilCallbacks = [], passThroughOnException } = options || {};

  return {
    waitUntil(promise: Promise<any>): void {
      waitUntilPromises.push(promise);
      waitUntilCallbacks.forEach(cb => cb(promise));
    },
    passThroughOnException,
    // These are required but not used in our tests
    request: new Request('https://example.com'),
    waitUntilPromises, // Store for testing
  };
}

/**
 * Helper to extract waitUntil promises from a mock ExecutionContext
 * Useful for assertions in tests
 */
export function getWaitUntilPromises(ctx: any): Promise<any>[] {
  return ctx.waitUntilPromises || [];
}

/**
 * Create a mock response object
 */
export function createMockResponse(
  body?: any,
  options?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  }
): Response {
  const { status = 200, statusText = 'OK', headers = {} } = options || {};

  const responseInit: ResponseInit = {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  const responseBody = body ? JSON.stringify(body) : undefined;

  return new Response(responseBody, responseInit);
}

/**
 * Helper to create a JSON response
 */
export function createMockJsonResponse<T>(data: T, status: number = 200): Response {
  return createMockResponse(data, { status });
}

/**
 * Helper to create an error response
 */
export function createMockErrorResponse(
  message: string,
  status: number = 500
): Response {
  return createMockResponse({ error: message }, { status });
}
