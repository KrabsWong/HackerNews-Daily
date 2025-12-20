# documentation Specification Delta

## Overview

This delta extends the documentation specification to include comprehensive testing guidelines, test coverage requirements, and mandates that all proposals include corresponding test updates.

## ADDED Requirements

### Requirement: Testing Documentation
The project documentation SHALL provide comprehensive testing guidelines covering test execution, writing tests, coverage requirements, and best practices.

#### Scenario: README includes testing section
**Given** the project README.md  
**When** a developer looks for testing information  
**Then** a "Testing" section SHALL exist  
**And** the section SHALL explain how to run tests  
**And** the section SHALL explain how to write new tests  
**And** the section SHALL specify coverage requirements  
**And** the section SHALL link to detailed testing guide in docs/  

#### Scenario: Testing guide in docs directory
**Given** the docs/ directory  
**When** a developer needs detailed testing information  
**Then** a `docs/testing-guide.md` file SHALL exist  
**And** the guide SHALL include test framework overview  
**And** the guide SHALL include examples for unit tests  
**And** the guide SHALL include examples for integration tests  
**And** the guide SHALL document mocking patterns  
**And** the guide SHALL explain coverage targets  

#### Scenario: Project conventions include testing strategy
**Given** the openspec/project.md file  
**When** reviewing "Project Conventions"  
**Then** a "Testing Strategy" section SHALL exist  
**And** the section SHALL describe test file organization  
**And** the section SHALL document coverage targets per module  
**And** the section SHALL provide mocking guidelines  
**And** the section SHALL explain test execution commands  

### Requirement: Test Coverage in Proposals
The OpenSpec workflow SHALL require test coverage specifications in all proposals that include code changes.

#### Scenario: Proposal includes testing impact
**Given** an AI assistant creates a new proposal with code changes  
**When** writing the proposal.md "What Changes" section  
**Then** testing changes SHALL be listed explicitly  
**And** affected test files SHALL be identified  
**And** coverage impact SHALL be described  

#### Scenario: Tasks include testing checklist
**Given** an AI assistant creates tasks.md for a proposal  
**When** the tasks are structured  
**Then** a dedicated "Testing" section SHALL exist  
**And** the section SHALL include tasks for writing unit tests  
**And** the section SHALL include tasks for writing integration tests (if applicable)  
**And** the section SHALL include coverage verification tasks  
**And** the section SHALL come before the "Documentation Update (REQUIRED)" section  

#### Scenario: Spec deltas include test scenarios
**Given** a spec delta that adds or modifies requirements  
**When** scenarios are written  
**Then** scenarios SHALL be testable  
**And** the scenarios SHALL guide test implementation  
**And** test files SHALL verify each scenario is met  

### Requirement: Test Update Enforcement
All OpenSpec proposals that add, modify, or remove features SHALL include corresponding test updates.

#### Scenario: New feature requires new tests
**Given** a proposal that adds a new feature  
**When** the proposal is validated  
**Then** the tasks.md SHALL include creating tests for the new feature  
**And** the tests SHALL achieve minimum coverage targets  
**And** the tests SHALL verify all scenarios in the spec delta  

#### Scenario: Modified feature requires test updates
**Given** a proposal that modifies existing behavior  
**When** the proposal is implemented  
**Then** existing tests SHALL be updated to reflect new behavior  
**And** new tests SHALL be added for new scenarios  
**And** coverage SHALL not decrease  

#### Scenario: Removed feature requires test removal
**Given** a proposal that removes a feature  
**When** the proposal is implemented  
**Then** tests for the removed feature SHALL be deleted  
**And** no orphaned test files SHALL remain  
**And** test helpers/mocks related to removed feature SHALL be cleaned up  

## MODIFIED Requirements

### Requirement: Documentation Auto-Update Mechanism
The OpenSpec workflow SHALL enforce documentation updates AND test coverage for every code change that affects user-facing features, configuration, architecture, or deployment procedures.

#### Scenario: Documentation Update Enforcement in Implementation
**Given** an AI assistant is implementing an OpenSpec change  
**When** the assistant reads AGENTS.md Stage 2 instructions  
**Then** step 5 MUST be "Update documentation"  
**And** a previous step MUST cover "Implement tests"  
**And** a "Documentation Update Checklist" section MUST be present  
**And** the checklist covers README.md, project.md, docs/ directory, and test files  

#### Scenario: Documentation Update Template in tasks.md
**Given** an AI assistant creates a new tasks.md for a proposal  
**When** following the template convention in project.md  
**Then** the tasks.md MUST include a "Testing" section before the final section  
**And** the tasks.md MUST include a final "Documentation Update (REQUIRED)" section  
**And** the testing section MUST list all test files to create/update  
**And** the documentation section MUST include verifying test examples  

### Requirement: Documentation Consistency Check
Every OpenSpec change implementation and archive operation SHALL include a documentation consistency AND test coverage verification step.

#### Scenario: Documentation and Test Check Before Archive
**Given** an OpenSpec change is ready to be archived  
**When** running the archive process  
**Then** the AI assistant MUST verify documentation is updated  
**And** MUST verify all required tests are implemented  
**And** MUST verify coverage targets are met  
**And** MUST search for outdated references using `rg`  
**And** MUST verify code examples match current implementation  
**And** MUST verify test examples are valid and passing  
**And** MUST confirm no broken links exist  
**And** only proceed with archive if both documentation and tests are consistent  

## REMOVED Requirements

None. This delta only adds and modifies requirements.
