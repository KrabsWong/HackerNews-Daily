# test-quality-standards Specification Delta

## Overview

Establishes comprehensive standards for test quality, including mock data realism, assertion strength, and safety guardrails to prevent tests from affecting production data.

## ADDED Requirements

### Requirement: Realistic Mock Data
The system SHALL ensure all mock data accurately reflects real API responses and production data structures.

#### Scenario: LLM mock responses use realistic translations
**Given** tests use mock LLM providers  
**When** a translation request is mocked  
**Then** the response SHALL use realistic Chinese translations from a curated dictionary  
**And** the response SHALL NOT use generic patterns like "翻译：Translated text"  
**And** the response format SHALL match actual LLM API response structure  
**And** the dictionary SHALL include at least 20 common technical article titles  

#### Scenario: Mock data matches TypeScript interface exactly
**Given** a mock factory creates test data  
**When** the factory returns an object  
**Then** the object SHALL match the corresponding TypeScript interface exactly  
**And** all required fields SHALL be present  
**And** all field types SHALL match the interface definition  
**And** NO fields SHALL exist that are not in the interface  
**And** the factory function SHALL have explicit return type annotation  

#### Scenario: Realistic API error responses
**Given** tests simulate API failures  
**When** error responses are mocked  
**Then** HTTP status codes SHALL match actual API behavior  
**And** error messages SHALL match actual API error formats  
**And** rate limit responses SHALL include realistic headers (e.g., `x-ratelimit-remaining`)  
**And** timeout errors SHALL use appropriate error types (AbortError, TimeoutError)  

### Requirement: Test Safety Guardrails
The system SHALL prevent tests from accidentally affecting production data through explicit environment checks.

#### Scenario: Production credentials trigger safety guard
**Given** production API credentials are present in environment variables  
**When** tests attempt to initialize mock environment  
**Then** the system SHALL detect real credentials (e.g., keys starting with "sk-", "ghp_")  
**And** the system SHALL throw an error if `ALLOW_INTEGRATION_TESTS` is not set  
**And** the error message SHALL explain how to enable integration tests safely  
**And** the error message SHALL suggest removing production credentials  

#### Scenario: Integration tests require explicit opt-in
**Given** a test needs to call real external APIs  
**When** the test file uses actual API credentials  
**Then** the test SHALL be skipped unless `ALLOW_INTEGRATION_TESTS=true`  
**And** the test file SHALL be named `*.integration.test.ts`  
**And** the test SHALL include a warning comment about using real APIs  
**And** the test SHALL NOT run in CI without explicit approval  

#### Scenario: Mock environment uses safe defaults
**Given** tests use the mock environment helper  
**When** no custom options are provided  
**Then** all API keys SHALL use "test-" prefix  
**And** all tokens SHALL be clearly fake (e.g., "test-github-token-12345")  
**And** `LOCAL_TEST_MODE` SHALL default to "true"  
**And** no real external services SHALL be contacted  

### Requirement: Strong Test Assertions
The system SHALL use explicit, non-permissive assertions that fail when behavior is incorrect.

#### Scenario: No optional checks that hide failures
**Given** a test verifies a feature that should always work  
**When** the test writes assertions  
**Then** the assertion SHALL NOT use optional checks like `if (result) { expect(...) }`  
**And** the assertion SHALL explicitly check for expected presence or absence  
**And** conditional assertions SHALL only be used when the condition is the actual test subject  
**And** tests SHALL fail loudly when unexpected null/undefined values appear  

#### Scenario: Property-based assertions for filtering logic
**Given** a test verifies content filtering  
**When** the test asserts on filtered results  
**Then** the test SHALL verify properties (e.g., "no sensitive keywords in output")  
**And** the test SHALL check specific examples (e.g., "Python article included")  
**And** the test SHALL verify exclusions (e.g., "Tibet article excluded")  
**And** the test SHALL NOT merely check `result.length > 0`  

#### Scenario: Error message verification
**Given** a test expects an error to be thrown  
**When** the error is asserted  
**Then** the assertion SHALL verify the error message content using regex  
**And** the assertion SHALL check error type or class  
**And** the assertion SHALL NOT merely verify that some error was thrown  
**And** key diagnostic information SHALL be validated  

### Requirement: Test Scenario Documentation
The system SHALL clearly document whether each test uses real or mocked behavior.

#### Scenario: Test files include scenario type comments
**Given** a test file contains multiple test cases  
**When** the file is reviewed  
**Then** each `describe` block SHALL have a comment indicating "Unit Test" or "Integration Test"  
**And** integration tests SHALL document which external services are used  
**And** mocked tests SHALL document which APIs are mocked  
**And** any partial mocking SHALL be explicitly documented  

#### Scenario: Mock helpers document realism level
**Given** a mock factory provides test data  
**When** the factory is implemented  
**Then** the docstring SHALL indicate realism level (e.g., "Realistic fixtures", "Simplified mock")  
**And** the docstring SHALL note if the mock differs from real API behavior  
**And** the docstring SHALL reference the actual API/interface being mocked  
**And** the docstring SHALL include "CRITICAL: Must match [Type] interface exactly"  

### Requirement: Malformed Data Testing
The system SHALL include tests for handling malformed API responses and invalid data.

#### Scenario: API returns malformed JSON
**Given** a service fetches data from an external API  
**When** tests simulate malformed responses  
**Then** tests SHALL include cases with invalid JSON  
**And** tests SHALL include cases with missing required fields  
**And** tests SHALL include cases with wrong field types  
**And** the service SHALL handle these gracefully without crashing  

#### Scenario: Mock factories provide malformed data helpers
**Given** tests need to simulate bad data  
**When** mock helper functions are available  
**Then** factories SHALL include `createMalformedX()` variants  
**And** malformed factories SHALL return `any` type (intentionally untyped)  
**And** malformed factories SHALL document what is wrong with the data  
**And** tests using malformed data SHALL verify error handling  
