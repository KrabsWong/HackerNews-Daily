# test-infrastructure Specification

## Purpose
TBD - created by archiving change add-comprehensive-test-coverage. Update Purpose after archive.
## Requirements
### Requirement: Test Framework Configuration
The system SHALL use Vitest as the testing framework with TypeScript and Cloudflare Workers support.

#### Scenario: Vitest is properly configured
**Given** the project requires testing TypeScript and Workers runtime code  
**When** tests are executed  
**Then** Vitest SHALL run with TypeScript support  
**And** Cloudflare Workers runtime SHALL be available via @cloudflare/vitest-pool-workers  
**And** coverage reporting SHALL be enabled via v8 provider  
**And** tests SHALL execute in under 5 seconds for the Utils module  

#### Scenario: Test scripts are available
**Given** developers need to run tests in different modes  
**When** package.json scripts are invoked  
**Then** `npm test` SHALL run all tests once  
**And** `npm run test:watch` SHALL run tests in watch mode  
**And** `npm run test:ui` SHALL launch Vitest UI  
**And** `npm run test:coverage` SHALL generate coverage reports

### Requirement: Test Organization (CRITICAL)
The system SHALL organize all test files in a centralized `src/__tests__/` directory.

#### Scenario: Test files are in the correct location
**Given** the project has test files  
**When** the codebase is inspected  
**Then** all test files SHALL be located in `src/__tests__/` directory  
**And** tests SHALL be organized by module (utils/, api/, services/, worker/)  
**And** test helpers SHALL be in `src/__tests__/helpers/`  
**And** integration tests SHALL be in `src/__tests__/integration/`  
**And** NO test files SHALL exist in any other directory  

#### Scenario: Test file naming convention
**Given** a test file is created  
**When** the file is saved  
**Then** the file SHALL use `.test.ts` extension  
**And** the file SHALL mirror the source file name (e.g., `array.ts` → `array.test.ts`)  
**And** the file SHALL be in the corresponding subdirectory under `src/__tests__/`

### Requirement: Test Helper Infrastructure
The system SHALL provide reusable test helpers and mock factories.

#### Scenario: Mock factories are available
**Given** tests need to mock external dependencies  
**When** test helpers are imported  
**Then** `mockHNApi.ts` SHALL provide HackerNews API mocks  
**And** `mockLLMProvider.ts` SHALL provide LLM provider mocks  
**And** `fixtures.ts` SHALL provide test data factories  
**And** all mocks SHALL return type-safe, realistic data  

#### Scenario: Mock factories are customizable
**Given** a test needs specific mock data  
**When** a mock factory is called with overrides  
**Then** the factory SHALL merge overrides with defaults  
**And** the result SHALL be type-safe  
**And** the result SHALL be valid for the corresponding type

### Requirement: Utils Module Test Coverage
The system SHALL have comprehensive test coverage for all utility modules.

#### Scenario: Utils module coverage targets met
**Given** tests for utility modules exist  
**When** coverage report is generated  
**Then** `array.ts` SHALL have at least 95% coverage  
**And** `date.ts` SHALL have 100% coverage  
**And** `fetch.ts` SHALL have at least 95% coverage  
**And** `html.ts` SHALL have at least 75% coverage  
**And** `result.ts` SHALL have 100% coverage  
**And** the Utils module average SHALL be at least 95%  

#### Scenario: Comprehensive test scenarios for fetch utilities
**Given** `fetch.ts` implements HTTP request wrapper  
**When** tests in `src/__tests__/utils/fetch.test.ts` are executed  
**Then** successful requests SHALL be tested  
**And** timeout scenarios SHALL be tested  
**And** retry logic SHALL be tested (network errors, 5xx errors)  
**And** exponential backoff SHALL be verified  
**And** error handling SHALL be tested (4xx, 5xx, network errors)  
**And** FetchError class SHALL be tested  

#### Scenario: Array utilities edge cases covered
**Given** `array.ts` implements chunk and JSON parsing  
**When** tests in `src/__tests__/utils/array.test.ts` are executed  
**Then** chunk() with various sizes SHALL be tested  
**And** parseJsonArray() with markdown cleanup SHALL be tested  
**And** parseJsonArray() with malformed JSON SHALL be tested  
**And** parseJsonArray() error handling SHALL be tested  

#### Scenario: Date utilities cover UTC and formatting
**Given** `date.ts` implements date manipulation  
**When** tests in `src/__tests__/utils/date.test.ts` are executed  
**Then** getPreviousDayBoundaries() SHALL be tested  
**And** date formatting functions SHALL be tested  
**And** filterByDateRange() SHALL be tested  
**And** UTC timezone handling SHALL be verified  

#### Scenario: Result type utilities are fully tested
**Given** `result.ts` implements functional error handling  
**When** tests in `src/__tests__/utils/result.test.ts` are executed  
**Then** Ok() and Err() constructors SHALL be tested  
**And** fromPromise() SHALL be tested  
**And** collectResults() batch handling SHALL be tested  
**And** mapResult() transformations SHALL be tested  
**And** all helper functions SHALL be tested

### Requirement: Coverage Reporting
The system SHALL generate and track code coverage metrics.

#### Scenario: Coverage report is generated
**Given** tests have been executed  
**When** coverage report is requested  
**Then** a detailed coverage report SHALL be generated  
**And** the report SHALL show statement, branch, function, and line coverage  
**And** the report SHALL identify uncovered lines  
**And** the report SHALL be available in HTML, JSON, and text formats  

#### Scenario: Coverage thresholds are enforced (soft enforcement)
**Given** coverage targets are defined for different modules  
**When** coverage report is generated  
**Then** Utils module target SHALL be 100% (achieved: 98.48%)  
**And** future API module target SHALL be 90%+  
**And** future Services module target SHALL be 85%+  
**And** coverage SHALL NOT block builds but SHALL report warnings

### Requirement: Test Execution Performance
The system SHALL ensure tests execute quickly to support developer workflow.

#### Scenario: Fast test execution
**Given** tests need to run frequently during development  
**When** full test suite is executed  
**Then** all tests SHALL complete in under 5 seconds  
**And** individual test files SHALL complete in under 1 second  
**And** no external network calls SHALL be made during tests  
**And** all external dependencies SHALL be mocked

