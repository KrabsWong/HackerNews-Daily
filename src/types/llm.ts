/**
 * LLM-related type definitions
 * 
 * Centralized types for LLM providers, configurations, and responses
 */

import { LLMProviderType } from '../config/constants';

// =============================================================================
// Chat Completion Types
// =============================================================================

/**
 * Chat message structure for LLM API requests
 */
export interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

/**
 * Request structure for chat completion API
 */
export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
}

/**
 * Response structure from chat completion API
 */
export interface ChatCompletionResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// Provider Configuration Types
// =============================================================================

/**
 * Environment-like object containing provider configuration
 * Used for both Worker and CLI environments
 */
export interface ProviderEnv {
  LLM_PROVIDER?: string;
  DEEPSEEK_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_SITE_URL?: string;
  OPENROUTER_SITE_NAME?: string;
}

/**
 * Resolved provider configuration after validation
 */
export interface ResolvedProviderConfig {
  provider: LLMProviderType;
  apiKey: string;
  model?: string;
  siteUrl?: string;
  siteName?: string;
}

/**
 * Provider-specific configuration passed to factory function
 */
export interface ProviderConfig {
  /** API key for the provider */
  apiKey: string;
  /** Optional model override */
  model?: string;
  /** OpenRouter site URL for attribution */
  siteUrl?: string;
  /** OpenRouter site name for attribution */
  siteName?: string;
}

/**
 * Options for creating an LLM provider instance
 */
export interface CreateProviderOptions {
  /** Provider type to use */
  provider?: LLMProviderType;
  /** Provider-specific configuration */
  config: ProviderConfig;
}

// =============================================================================
// Provider Interface
// =============================================================================

/**
 * LLM Provider interface
 * All providers must implement this interface
 */
export interface LLMProvider {
  /** Send a chat completion request */
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  
  /** Get the provider name for logging */
  getName(): string;
  
  /** Get the model being used */
  getModel(): string;
  
  /** Get retry delay for rate limiting */
  getRetryDelay(): number;
}

// =============================================================================
// Internal API Response Types
// =============================================================================

/**
 * OpenAI-style API response structure
 * Used internally by provider implementations
 */
export interface OpenAIStyleResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
