/**
 * Worker Configuration Validation
 * Validates required environment variables on worker startup
 */

import { parseProvider, getApiKeyForProvider } from '../../services/llm';
import type { Env } from '../index';

/**
 * Validate worker configuration
 * Throws an error with clear messages if any required configuration is missing
 * 
 * @param env - Worker environment variables
 * @throws Error if validation fails
 */
export function validateWorkerConfig(env: Env): void {
  const errors: string[] = [];
  
  // Validate LLM_PROVIDER and corresponding API key
  try {
    const provider = parseProvider(env.LLM_PROVIDER);
    // This will throw if the API key is missing
    getApiKeyForProvider(provider, env);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  
  // Validate TARGET_REPO
  if (!env.TARGET_REPO) {
    errors.push('TARGET_REPO is required (format: "owner/repo")');
  }
  
  // Validate GITHUB_TOKEN
  if (!env.GITHUB_TOKEN) {
    errors.push('GITHUB_TOKEN is required');
  }
  
  // If there are errors, throw with all messages
  if (errors.length > 0) {
    throw new Error(
      `Worker configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}
