# type-organization Specification

## Purpose
TBD - created by archiving change refactor-type-organization. Update Purpose after archive.
## Requirements
### Requirement: Centralized Type Directory Structure
The system SHALL organize all TypeScript types and interfaces in the `src/types/` directory with domain-specific file separation.

#### Scenario: Developer looks for type definitions
**Given** a developer needs to find or add a type definition  
**When** they navigate to src/types/  
**Then** they find organized files by domain (api.ts, cache.ts, content.ts, llm.ts, etc.)  
**And** each file contains related types with clear documentation

### Requirement: Type Export Centralization
The system SHALL provide a single entry point (`src/types/index.ts`) for importing commonly used types across the codebase.

#### Scenario: Module imports shared types
**Given** a module needs to use shared type definitions  
**When** the module imports types  
**Then** it can import from 'types' or 'types/specific-file'  
**And** all public types are accessible without deep path imports

### Requirement: No Inline Interface Definitions in Business Code
The system SHALL NOT define exportable interfaces or types directly in business logic files (services/, worker/, utils/).

#### Scenario: New interface needed for a service
**Given** a developer needs to add a new interface for a service  
**When** they define the interface  
**Then** the interface MUST be placed in src/types/ directory  
**And** the service file imports the interface from types/  

#### Scenario: Internal-only type for implementation detail
**Given** a developer needs a type only used within a single file  
**When** the type is purely internal implementation detail  
**Then** it MAY be defined inline as non-exported type  
**And** it MUST NOT be exported for use by other modules

### Requirement: Domain-Based Type File Organization
The system SHALL organize types into files based on their functional domain.

#### Scenario: Cache-related types organization
**Given** types related to caching functionality  
**When** organized in src/types/  
**Then** they are placed in types/cache.ts  
**And** include CacheConfig, CachedStory, CacheData, CacheResult  

#### Scenario: Worker-related types organization
**Given** types related to Worker runtime  
**When** organized in src/types/  
**Then** they are placed in types/worker.ts  
**And** include Env, LogContext, ExportMetrics  

#### Scenario: Publisher-related types organization
**Given** types related to content publishing  
**When** organized in src/types/  
**Then** they are placed in types/publisher.ts  
**And** include PublisherConfig, PublishContent, Publisher  

#### Scenario: Source-related types organization
**Given** types related to content sources  
**When** organized in src/types/  
**Then** they are placed in types/source.ts  
**And** include SourceConfig, SourceContent, ContentSource

### Requirement: Project Convention Documentation
The system SHALL document the type organization constraint in openspec/project.md under Project Conventions.

#### Scenario: New developer reads project conventions
**Given** a new developer reads openspec/project.md  
**When** they look at the Code Style or Architecture Patterns section  
**Then** they find clear rules about type/interface organization  
**And** the rules specify src/types/ as the only valid location for exported types

