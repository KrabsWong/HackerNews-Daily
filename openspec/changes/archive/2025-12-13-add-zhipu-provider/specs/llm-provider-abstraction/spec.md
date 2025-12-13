# llm-provider-abstraction Specification Delta

## Overview

扩展 LLM Provider 抽象以支持智普AI (Zhipu AI) 作为第三个 provider 选项。

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Provider Selection via Environment Variable
The system SHALL allow users to select the LLM provider via the `LLM_PROVIDER` environment variable.

#### Scenario: DeepSeek provider selected (default)
**Given** the environment variable `LLM_PROVIDER` is not set or is set to `deepseek`  
**When** the LLM provider is initialized  
**Then** the system uses DeepSeek API for all LLM operations  
**And** requires `LLM_DEEPSEEK_API_KEY` to be set

#### Scenario: OpenRouter provider selected
**Given** the environment variable `LLM_PROVIDER` is set to `openrouter`  
**When** the LLM provider is initialized  
**Then** the system uses OpenRouter API for all LLM operations  
**And** requires `LLM_OPENROUTER_API_KEY` to be set

#### Scenario: Zhipu provider selected
**Given** the environment variable `LLM_PROVIDER` is set to `zhipu`  
**When** the LLM provider is initialized  
**Then** the system uses Zhipu AI API for all LLM operations  
**And** requires `LLM_ZHIPU_API_KEY` to be set

#### Scenario: Invalid provider specified
**Given** the environment variable `LLM_PROVIDER` is set to an unsupported value  
**When** the LLM provider is initialized  
**Then** the system displays an error indicating valid provider options (deepseek, openrouter, zhipu)  
**And** exits with non-zero status code
