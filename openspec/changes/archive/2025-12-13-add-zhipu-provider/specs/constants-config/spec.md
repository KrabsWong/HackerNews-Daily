# constants-config Specification Delta

## Overview

扩展配置常量以支持智普AI (Zhipu AI) Provider 的配置。

## ADDED Requirements

### Requirement: Zhipu API Configuration Constants
The system SHALL define configuration constants for the Zhipu AI API in a dedicated constants group.

#### Scenario: Define Zhipu API constants group
**Given** the constants file at `src/config/constants.ts`  
**When** defining Zhipu API configuration  
**Then** a `ZHIPU_API` constant object SHALL be created  
**And** it SHALL include `BASE_URL`, `DEFAULT_MODEL`, `REQUEST_TIMEOUT`, `RETRY_DELAY` properties

#### Scenario: Zhipu API base URL
**Given** the `ZHIPU_API` configuration object  
**When** accessing the `BASE_URL` property  
**Then** it SHALL return `https://open.bigmodel.cn/api/paas/v4`

#### Scenario: Zhipu default model
**Given** the `ZHIPU_API` configuration object  
**When** accessing the `DEFAULT_MODEL` property  
**Then** it SHALL return `glm-4.5-flash`

#### Scenario: Zhipu retry delay for concurrency limit
**Given** the `ZHIPU_API` configuration object  
**When** accessing the `RETRY_DELAY` property  
**Then** it SHALL return `2000` milliseconds  
**And** this is longer than other providers to handle concurrency limit of 2

#### Scenario: Read Zhipu model from environment
**Given** the `ZHIPU_API` configuration object  
**When** the environment variable `LLM_ZHIPU_MODEL` is set  
**Then** the `MODEL` getter SHALL return the environment variable value  
**And** if not set, it SHALL return the `DEFAULT_MODEL` value

### Requirement: Document Zhipu Environment Variables
The system SHALL document Zhipu-related environment variables in `.env.example`.

#### Scenario: Document provider selection for Zhipu
**Given** the `.env.example` file  
**When** documenting `LLM_PROVIDER`  
**Then** the example SHALL show `zhipu` as a valid option alongside `deepseek` and `openrouter`

#### Scenario: Document Zhipu credentials
**Given** the `.env.example` file  
**When** documenting Zhipu configuration  
**Then** the file SHALL include `LLM_ZHIPU_API_KEY` with a description  
**And** note that it is required when `LLM_PROVIDER=zhipu`

#### Scenario: Document Zhipu model selection
**Given** the `.env.example` file  
**When** documenting Zhipu model configuration  
**Then** the file SHALL include `LLM_ZHIPU_MODEL` with default value `glm-4.5-flash`  
**And** note the concurrency limit of 2 for this model

#### Scenario: Document Zhipu concurrency limit
**Given** the `.env.example` file  
**When** documenting Zhipu configuration  
**Then** the file SHALL include a note that glm-4.5-flash has a concurrency limit of 2  
**And** recommend users be aware of this limitation for high-throughput scenarios

## MODIFIED Requirements

### Requirement: LLM Provider Selection Configuration
The system SHALL define an enumeration for supported LLM provider types.

#### Scenario: Define LLM provider type
**Given** the constants file at `src/config/constants.ts`  
**When** defining LLM provider types  
**Then** an `LLMProviderType` enum SHALL be created  
**And** it SHALL include `DEEPSEEK`, `OPENROUTER`, and `ZHIPU` values

#### Scenario: Validate provider value
**Given** the `LLM_CONFIG.PROVIDER` getter  
**When** accessing the configured provider  
**Then** valid values SHALL be `deepseek`, `openrouter`, or `zhipu` (case-insensitive)  
**And** invalid values SHALL log a warning and default to `deepseek`
