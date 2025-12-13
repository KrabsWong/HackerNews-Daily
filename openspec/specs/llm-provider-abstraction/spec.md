# llm-provider-abstraction Specification

## Purpose
TBD - created by archiving change add-openrouter-provider. Update Purpose after archive.
## Requirements
### Requirement: Provider Selection via Environment Variable

The system SHALL allow users to select the LLM provider via the `LLM_PROVIDER` environment variable, with strict type safety.

#### Scenario: DeepSeek provider selected

**Given** the environment variable `LLM_PROVIDER` is set to `"deepseek"`  
**When** the LLM provider is initialized  
**Then** the system SHALL validate the value matches `LLMProviderType`  
**And** the system SHALL use DeepSeek API for all LLM operations  
**And** the system SHALL require `DEEPSEEK_API_KEY` to be set

#### Scenario: OpenRouter provider selected

**Given** the environment variable `LLM_PROVIDER` is set to `"openrouter"`  
**When** the LLM provider is initialized  
**Then** the system SHALL validate the value matches `LLMProviderType`  
**And** the system SHALL use OpenRouter API for all LLM operations  
**And** the system SHALL require `OPENROUTER_API_KEY` to be set

#### Scenario: Invalid provider specified

**Given** the environment variable `LLM_PROVIDER` is set to an unsupported value  
**When** the LLM provider is initialized  
**Then** the system SHALL display an error indicating valid provider options from `LLMProviderType`  
**And** the system SHALL exit with non-zero status code

#### Scenario: Missing provider in worker environment

**Given** the Cloudflare Worker is initializing  
**When** the `LLM_PROVIDER` environment variable is not set  
**Then** the system SHALL throw an error "LLM_PROVIDER is required (set to 'deepseek' or 'openrouter')"  
**And** the system SHALL NOT use a default value  
**And** the worker SHALL NOT proceed with export operations

### Requirement: OpenRouter API Integration
The system SHALL support OpenRouter API as an LLM provider with OpenAI-compatible request format.

#### Scenario: Successful API request to OpenRouter
**Given** `LLM_PROVIDER` is set to `openrouter`  
**And** `OPENROUTER_API_KEY` is configured  
**When** sending a chat completion request  
**Then** the request is sent to `https://openrouter.ai/api/v1/chat/completions`  
**And** includes `Authorization: Bearer <OPENROUTER_API_KEY>` header  
**And** uses the configured model (default: `deepseek/deepseek-chat-v3-0324`)

#### Scenario: OpenRouter with optional attribution headers
**Given** `LLM_PROVIDER` is set to `openrouter`  
**And** `OPENROUTER_SITE_URL` is configured  
**And** `OPENROUTER_SITE_NAME` is configured  
**When** sending a request to OpenRouter  
**Then** the request includes `HTTP-Referer` header with the site URL  
**And** the request includes `X-Title` header with the site name

#### Scenario: Custom model selection for OpenRouter
**Given** `LLM_PROVIDER` is set to `openrouter`  
**And** `OPENROUTER_MODEL` is set to a custom model identifier  
**When** sending a chat completion request  
**Then** the request uses the specified model instead of the default

### Requirement: Unified Provider Interface
The system SHALL provide a unified interface for LLM operations that abstracts provider-specific details.

#### Scenario: Chat completion through provider interface
**Given** an LLM provider is initialized  
**When** calling the chat completion method with messages and temperature  
**Then** the provider sends the request to the appropriate API endpoint  
**And** returns the response content in a consistent format

#### Scenario: Error handling across providers
**Given** any LLM provider is in use  
**When** an API request fails due to rate limiting (HTTP 429)  
**Then** the system retries after the configured delay  
**And** returns the original content as fallback if retry fails

### Requirement: Backward Compatibility
The system SHALL maintain backward compatibility with existing DeepSeek-only configurations.

#### Scenario: Existing deployment without LLM_PROVIDER
**Given** an existing deployment with only `DEEPSEEK_API_KEY` configured  
**And** no `LLM_PROVIDER` environment variable is set  
**When** the application starts  
**Then** the system uses DeepSeek as the default provider  
**And** all existing functionality works without changes

### Requirement: Zhipu AI Provider Integration
The system SHALL support Zhipu AI API as an LLM provider with OpenAI-compatible request format.

#### Scenario: Successful API request to Zhipu
**Given** `LLM_PROVIDER` is set to `zhipu`  
**And** `LLM_ZHIPU_API_KEY` is configured  
**When** sending a chat completion request  
**Then** the request is sent to `https://open.bigmodel.cn/api/paas/v4/chat/completions`  
**And** includes `Authorization: Bearer <LLM_ZHIPU_API_KEY>` header  
**And** uses the configured model (default: `glm-4.5-flash`)

#### Scenario: Custom model selection for Zhipu
**Given** `LLM_PROVIDER` is set to `zhipu`  
**And** `LLM_ZHIPU_MODEL` is set to a custom model identifier  
**When** sending a chat completion request  
**Then** the request uses the specified model instead of the default

#### Scenario: Zhipu concurrency limit handling
**Given** `LLM_PROVIDER` is set to `zhipu`  
**And** the API returns HTTP 429 due to concurrency limit  
**When** the system handles the rate limit error  
**Then** the system retries after a 2000ms delay (longer than other providers)  
**And** returns the original content as fallback if retry fails

### Requirement: Exported LLM Provider Type

The system SHALL export `LLMProviderType` as a public type from `src/config/constants.ts`.

#### Scenario: Type import

**Given** a module needs to reference LLM provider types  
**When** importing from `src/config/constants.ts`  
**Then** the module SHALL be able to import `LLMProviderType`  
**And** the type SHALL be a union of valid provider strings: `'deepseek' | 'openrouter'`

#### Scenario: Type usage in function signatures

**Given** a function accepts an LLM provider parameter  
**When** defining the function signature  
**Then** the parameter SHALL use the imported `LLMProviderType` instead of inline string literals  
**And** TypeScript SHALL enforce type safety on the parameter

#### Scenario: Type consistency across codebase

**Given** multiple files reference LLM provider types  
**When** searching for inline type definitions (e.g., `'deepseek' | 'openrouter'`)  
**Then** all occurrences SHALL be replaced with the imported `LLMProviderType`  
**And** there SHALL be a single source of truth for valid provider values

