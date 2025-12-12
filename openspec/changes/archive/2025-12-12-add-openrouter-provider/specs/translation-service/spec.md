# translation-service Specification Delta

## Overview
Modifies the translation service to use the LLM provider abstraction layer instead of direct DeepSeek API calls, enabling support for multiple LLM providers.

## MODIFIED Requirements

### Requirement: Configure DeepSeek API Access
The system SHALL read LLM API credentials from environment variables based on the selected provider.

#### Scenario: Valid API key is configured
**Given** the environment variable for the selected provider's API key is set  
**When** the translation service initializes  
**Then** the API key is loaded successfully  
**And** requests include proper authentication headers for the provider

#### Scenario: Missing API key
**Given** the API key for the selected provider is not set  
**When** the translation service initializes  
**Then** the system displays an error indicating which API key is required  
**And** exits with non-zero status code

#### Scenario: DeepSeek provider selected
**Given** `LLM_PROVIDER` is `deepseek` or not set  
**When** the translation service initializes  
**Then** the system requires `DEEPSEEK_API_KEY`  
**And** uses DeepSeek API endpoint

#### Scenario: OpenRouter provider selected
**Given** `LLM_PROVIDER` is `openrouter`  
**When** the translation service initializes  
**Then** the system requires `OPENROUTER_API_KEY`  
**And** uses OpenRouter API endpoint

## ADDED Requirements

### Requirement: Use Provider Abstraction for API Calls
The system SHALL use the LLM provider abstraction layer for all API calls.

#### Scenario: Translation via provider abstraction
**Given** a valid LLM provider is initialized  
**When** translating a title  
**Then** the system sends the request through the provider's chat completion interface  
**And** receives the response in a consistent format regardless of provider

#### Scenario: Summarization via provider abstraction
**Given** a valid LLM provider is initialized  
**When** summarizing article content  
**Then** the system sends the request through the provider's chat completion interface  
**And** receives the response in a consistent format regardless of provider

#### Scenario: Provider initialization in TranslationService
**Given** the TranslationService is created  
**When** calling `init()` method  
**Then** the system creates an LLM provider based on configuration  
**And** stores the provider instance for subsequent API calls
