# documentation Specification Delta

## Overview

This delta updates the documentation specification to ensure AGENTS.md and project.md accurately reflect the current project state after multiple iterations. The changes add requirements for keeping OpenSpec meta-documentation synchronized with the codebase.

## MODIFIED Requirements

### Requirement: Project Documentation Accuracy
The project.md SHALL accurately reflect the current source code directory structure, architecture patterns, and conventions.

#### Scenario: Directory Structure Sync
**Given** the project has evolved through multiple iterations  
**When** the directory structure in project.md is checked  
**Then** it SHALL match the actual `src/` directory layout  
**And** SHALL include all current directories: api/, config/, services/, types/, utils/, worker/  
**And** SHALL document subdirectories: services/task/, services/articleFetcher/, services/contentFilter/, services/translator/, services/llm/  
**And** SHALL document worker subdirectories: worker/routes/, worker/statemachine/, worker/sources/, worker/publishers/  
**And** SHALL include new files: types/errors.ts, utils/errorHandler.ts, utils/d1.ts

#### Scenario: Architecture Documentation Sync
**Given** the project has implemented distributed task processing  
**When** checking the "Architecture Patterns" section in project.md  
**Then** it SHALL document the task executor and storage architecture  
**And** SHALL document error handling patterns (AppError, APIError, ServiceError, ValidationError)  
**And** SHALL document type safety enhancements (discriminated unions, enums)  
**And** SHALL document the D1 database integration  
**And** SHALL accurately describe the configuration management system

#### Scenario: Testing Strategy Documentation Sync
**Given** the project has achieved Phase 0 test coverage (55%)  
**When** checking the "Testing Strategy" section in project.md  
**Then** it SHALL reflect the current coverage status  
**And** SHALL document the phased improvement plan (Phase 0 → Phase 1 → Phase 2)  
**And** SHALL list current test organization in `src/__tests__/`  
**And** SHALL document mock infrastructure in `src/__tests__/helpers/`

## ADDED Requirements

### Requirement: AGENTS.md Accuracy
The AGENTS.md file SHALL accurately document the OpenSpec workflow and conventions for AI assistants working with this project.

#### Scenario: Workflow Documentation
**Given** an AI assistant reads AGENTS.md  
**When** following the three-stage workflow instructions  
**Then** the instructions SHALL match the current OpenSpec CLI behavior  
**And** the examples SHALL use current project patterns  
**And** the documentation maintenance guidelines SHALL be clear and actionable

#### Scenario: Consistency with project.md
**Given** AGENTS.md and project.md both exist  
**When** comparing conventions and patterns  
**Then** AGENTS.md SHALL NOT contradict project.md  
**And** cross-references between files SHALL be accurate  
**And** examples SHALL reflect the same coding standards

### Requirement: OpenSpec Documentation Maintenance
When the codebase undergoes significant architectural changes, the OpenSpec meta-documentation (AGENTS.md and project.md) SHALL be updated to maintain alignment.

#### Scenario: Architectural Change Detection
**Given** a significant architectural change has been implemented (e.g., distributed task processing)  
**When** the change is archived  
**Then** the archiver SHALL verify if AGENTS.md or project.md need updates  
**And** SHALL create a follow-up proposal if meta-documentation is outdated  
**And** SHALL document what aspects need updating

#### Scenario: Regular Documentation Review
**Given** multiple changes have been archived over time  
**When** conducting a documentation review  
**Then** AGENTS.md SHALL accurately reflect current OpenSpec practices  
**And** project.md SHALL accurately reflect current architecture  
**And** all code examples SHALL be valid  
**And** all file paths SHALL be correct

### Requirement: Documentation Synchronization Validation
Before archiving any OpenSpec change, the system SHALL validate that AGENTS.md and project.md remain synchronized with the codebase.

#### Scenario: Pre-Archive Documentation Check
**Given** an OpenSpec change is ready to archive  
**When** running the archive validation  
**Then** the validation SHALL check if the change affects directory structure  
**And** SHALL check if the change affects architecture patterns  
**And** SHALL check if the change affects conventions documented in project.md  
**And** SHALL warn if AGENTS.md or project.md may be outdated

#### Scenario: Documentation Drift Detection
**Given** the project codebase has evolved significantly  
**When** comparing project.md with actual source code  
**Then** automated checks SHALL identify missing directories  
**And** SHALL identify outdated architecture descriptions  
**And** SHALL identify obsolete configuration patterns  
**And** SHALL generate a report of discrepancies
