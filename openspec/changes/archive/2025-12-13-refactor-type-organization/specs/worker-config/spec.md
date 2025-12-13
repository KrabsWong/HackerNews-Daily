# worker-config Specification Delta

## Overview

修复 Worker 配置中 OpenRouter API Key 缺失的问题，确保所有 LLM provider 的配置都有完整的文档说明。

## ADDED Requirements

### Requirement: OpenRouter Secret Configuration Documentation
The system SHALL document OpenRouter API key configuration in wrangler.toml with clear comments explaining how to set the secret via `wrangler secret put OPENROUTER_API_KEY`.

#### Scenario: User configures OpenRouter as LLM provider
**Given** a user wants to deploy Worker with OpenRouter provider  
**When** they read wrangler.toml configuration  
**Then** they find clear comments explaining OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter  
**And** they find instructions to set the secret using `wrangler secret put`  

### Requirement: Provider-Specific Secret Validation
The system SHALL validate that the corresponding API key secret is configured when a specific LLM_PROVIDER is selected.

#### Scenario: OpenRouter selected but API key missing
**Given** LLM_PROVIDER is set to "openrouter"  
**When** the Worker starts  
**Then** configuration validation fails with clear error message  
**And** the error message specifies OPENROUTER_API_KEY is required  

#### Scenario: DeepSeek selected but API key missing
**Given** LLM_PROVIDER is set to "deepseek"  
**When** the Worker starts  
**Then** configuration validation fails with clear error message  
**And** the error message specifies DEEPSEEK_API_KEY is required  
