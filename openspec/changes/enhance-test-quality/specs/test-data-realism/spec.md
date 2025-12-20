# test-data-realism Specification Delta

## Overview

Ensures test data accurately reflects production scenarios and API behaviors, replacing generic mocks with realistic fixtures.

## ADDED Requirements

### Requirement: Realistic LLM Translation Fixtures
The system SHALL provide realistic Chinese translation fixtures based on actual LLM output patterns.

#### Scenario: Translation dictionary contains diverse examples
**Given** tests need realistic translation mocks  
**When** the translation dictionary is reviewed  
**Then** the dictionary SHALL include at least 20 technical article titles  
**And** the dictionary SHALL include examples from different domains (programming, AI, security, etc.)  
**And** the dictionary SHALL include both safe and sensitive content examples  
**And** translations SHALL match actual LLM output style (natural Chinese, not literal word-for-word)  
**And** translations SHALL preserve technical terms appropriately (e.g., "JavaScript" → "JavaScript", not "爪哇脚本")  

#### Scenario: Fallback translation for unknown titles
**Given** a test requests translation for a title not in the dictionary  
**When** the mock provider generates a response  
**Then** the response SHALL use a realistic fallback pattern  
**And** the fallback SHALL extract keywords from the English title  
**And** the fallback SHALL construct natural Chinese like "关于[keywords]的文章"  
**And** the fallback SHALL NOT use generic "翻译：Translated text" pattern  

#### Scenario: Mock LLM response format matches real API
**Given** a mock LLM provider returns a translation  
**When** the response structure is validated  
**Then** the response SHALL include `role: "assistant"`  
**And** the response SHALL include `content` field with translation  
**And** the response SHALL match the `LLMResponse` TypeScript interface  
**And** the response SHALL NOT include extra fields not in real API responses  

### Requirement: Realistic Content Classification Fixtures
The system SHALL provide realistic content filter classification responses for different sensitivity levels.

#### Scenario: Content filter mock classifies safe content
**Given** content filter tests need to verify safe content handling  
**When** mock provider receives safe titles  
**Then** the mock SHALL return "SAFE" classification  
**And** the mock SHALL provide a brief reason (e.g., "Technical article about programming")  
**And** the classification SHALL be deterministic for the same input  
**And** the mock SHALL NOT randomly classify safe content as sensitive  

#### Scenario: Content filter mock classifies sensitive content
**Given** content filter tests need to verify sensitive content handling  
**When** mock provider receives sensitive titles  
**Then** the mock SHALL return "SENSITIVE" classification  
**And** the mock SHALL provide a specific reason (e.g., "Political content about censorship")  
**And** the mock SHALL classify consistently across sensitivity levels (low/medium/high)  
**And** the mock SHALL use realistic sensitive keywords (e.g., "Tibet independence", "Falun Gong", "Chinese censorship")  

#### Scenario: Sensitivity levels affect classification
**Given** content filter uses different sensitivity thresholds  
**When** tests verify low/medium/high sensitivity behavior  
**Then** low sensitivity SHALL filter only extreme content  
**And** medium sensitivity SHALL filter clearly sensitive political/religious content  
**And** high sensitivity SHALL filter borderline topics  
**And** mock SHALL adjust classification based on configured sensitivity level  

### Requirement: Realistic API Response Structures
The system SHALL mock external API responses with structures matching actual API documentation.

#### Scenario: HackerNews Algolia API response structure
**Given** tests mock Algolia API responses  
**When** mock data is created  
**Then** stories SHALL use `points` field (not `score`)  
**And** stories SHALL use `created_at_i` for timestamp (not `time`)  
**And** responses SHALL include pagination metadata (`nbPages`, `page`, `hitsPerPage`)  
**And** responses SHALL include `hits` array with story objects  
**And** field names SHALL match Algolia API documentation exactly  

#### Scenario: GitHub API response structure
**Given** tests mock GitHub API responses  
**When** mock commit creation response is generated  
**Then** response SHALL include `sha` field (commit hash)  
**And** response SHALL include `tree` and `parents` arrays  
**And** response SHALL include `author` and `committer` objects  
**And** response SHALL match GitHub API v3 documentation structure  

#### Scenario: Telegram API response structure
**Given** tests mock Telegram Bot API responses  
**When** mock message send response is generated  
**Then** response SHALL include `ok: true` for success  
**And** response SHALL include `result` object with message details  
**And** error responses SHALL include `ok: false` and `error_code`  
**And** error responses SHALL include realistic `description` messages  

### Requirement: Realistic Error Simulation
The system SHALL simulate realistic error scenarios that match actual API failure modes.

#### Scenario: Rate limiting errors match real API behavior
**Given** tests simulate rate limiting  
**When** a rate limit error is mocked  
**Then** HTTP status SHALL be 429  
**And** response headers SHALL include `x-ratelimit-remaining: 0`  
**And** response headers SHALL include `retry-after` header  
**And** error message SHALL match actual API rate limit message format  

#### Scenario: Timeout errors use appropriate types
**Given** tests simulate network timeouts  
**When** a timeout error is thrown  
**Then** error SHALL be `AbortError` for fetch with AbortSignal  
**And** error SHALL be `TimeoutError` for custom timeout logic  
**And** error message SHALL indicate timeout duration  
**And** error SHALL NOT be generic `Error` type  

#### Scenario: Authentication errors match API responses
**Given** tests simulate auth failures  
**When** an auth error is mocked  
**Then** HTTP status SHALL be 401 for invalid credentials  
**And** HTTP status SHALL be 403 for insufficient permissions  
**And** error message SHALL match actual API unauthorized response  
**And** response body SHALL match API error JSON structure  

### Requirement: Mock Data Maintenance
The system SHALL keep mock data synchronized with evolving TypeScript interfaces and API changes.

#### Scenario: Mock factories use explicit return types
**Given** a mock factory creates test data  
**When** the factory function is defined  
**Then** the function SHALL have explicit return type annotation (e.g., `(): HNStory`)  
**And** TypeScript SHALL validate the mock data matches the interface  
**And** compilation SHALL fail if mock data has missing/extra/mistyped fields  
**And** type errors SHALL be caught before tests run  

#### Scenario: Mock data includes CRITICAL warning comments
**Given** a mock factory provides test data  
**When** the factory code is reviewed  
**Then** the function SHALL have a docstring  
**And** the docstring SHALL include "CRITICAL: Must match [TypeName] interface exactly"  
**And** the docstring SHALL reference the corresponding type file  
**And** the docstring SHALL warn about keeping data synchronized with type changes  

#### Scenario: Type changes trigger mock data updates
**Given** a TypeScript interface is modified  
**When** the change is committed  
**Then** corresponding mock factories SHALL be updated in the same commit  
**And** `npx tsc --noEmit` SHALL pass (no type errors)  
**And** all tests SHALL continue to pass  
**And** code review SHALL verify mock data consistency  
