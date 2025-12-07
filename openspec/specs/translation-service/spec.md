# Spec: translation-service Specification

## Purpose
Specification for Spec: translation-service functionality.

## Requirements

### Requirement: Configure DeepSeek API Access
The system SHALL read DeepSeek API credentials from environment variables.

#### Scenario: Valid API key is configured
**Given** the environment variable `DEEPSEEK_API_KEY` is set  
**When** the translation service initializes  
**Then** the API key is loaded successfully  
**And** requests include proper authentication headers

#### Scenario: Missing API key
**Given** the environment variable `DEEPSEEK_API_KEY` is not set  
**When** the translation service initializes  
**Then** the system displays error "DEEPSEEK_API_KEY environment variable is required"  
**And** exits with non-zero status code

### Requirement: Translate Titles to Chinese
The system SHALL translate story titles from English to Chinese using DeepSeek LLM.

#### Scenario: Successful translation
**Given** a valid English title and configured API key  
**When** requesting translation  
**Then** the system sends a request to DeepSeek API with prompt "Translate the following title to Chinese: {title}"  
**And** returns the Chinese translation

#### Scenario: Translation API fails
**Given** the DeepSeek API returns an error or times out  
**When** requesting translation  
**Then** the system logs a warning  
**And** returns the original English title as fallback

### Requirement: Process Multiple Translations
The system SHALL translate multiple titles while maintaining order consistency.

#### Scenario: Translate multiple titles efficiently
**Given** multiple story titles need translation  
**When** processing translations  
**Then** the system processes all titles  
**And** maintains order consistency with input  
**And** handles each translation request with appropriate error handling

### Requirement: Handle Special Characters
The system SHALL preserve special characters and formatting in titles.

#### Scenario: Title contains code snippets or special chars
**Given** a title containing backticks, quotes, or special symbols  
**When** translating the title  
**Then** the system preserves the original formatting  
**And** only translates natural language portions

#### Scenario: Title is already in Chinese
**Given** a title that is already in Chinese  
**When** checking for translation  
**Then** the system returns the title as-is without API call
