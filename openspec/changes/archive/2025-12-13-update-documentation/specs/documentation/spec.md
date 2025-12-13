# Documentation Specification Delta

## Overview

定义项目文档的组织结构、内容要求、命名规范、语言风格和自动更新机制。确保文档始终与代码保持同步，并保持专业、统一的风格。

## ADDED Requirements

### Requirement: README Structure
The README.md SHALL contain accurate feature descriptions and only essential project information: features, deployment overview, usage instructions, configuration table, and API references.

#### Scenario: Accurate Feature Description
**Given** the project README.md Features section  
**When** describing LLM capabilities  
**THEN** it SHALL accurately reflect all supported LLM providers (DeepSeek and OpenRouter)  
**And** NOT limit description to only one provider  
**And** all feature descriptions SHALL match actual code capabilities

#### Scenario: Simplified README
**Given** the project README.md  
**When** a user opens the file  
**THEN** they see a concise overview without detailed troubleshooting or development guides  
**And** detailed guides are linked via the Documentation section  
**And** the file is reasonably sized (approximately 150-180 lines if simplified)

### Requirement: Project Documentation Accuracy
The project.md SHALL accurately reflect the current source code directory structure.

#### Scenario: Directory Structure Sync
**Given** the project has evolved through multiple iterations  
**When** the directory structure in project.md is checked  
**THEN** it matches the actual `src/` directory layout  
**And** includes all current directories: api/, config/, services/, types/, utils/, worker/

### Requirement: Documentation Naming Consistency
All documentation files in the docs/ directory SHALL follow a consistent naming convention (lowercase with hyphens, kebab-case) to maintain professionalism.

#### Scenario: Unified File Naming
**Given** the docs/ directory contains multiple documentation files  
**When** checking file names  
**THEN** all guide files SHALL use lowercase-with-hyphens format  
**And** files SHALL NOT mix uppercase underscores with lowercase hyphens  
**And** README.md MAY use uppercase (conventional exception)  
**Examples**: `quick-reference.md`, `local-development.md`, `logging.md`

### Requirement: Documentation Language Style Consistency
All documentation SHALL maintain consistent language style, avoiding unnecessary mixed Chinese-English within the same context, to enhance professionalism and readability.

#### Scenario: Consistent Language Usage
**Given** a documentation file in docs/ or root directory  
**When** reviewing the content  
**THEN** technical documentation SHALL primarily use English (for code, configuration, commands)  
**And** explanatory descriptions MAY use Chinese when necessary  
**And** the same document SHALL maintain consistent language style  
**And** SHALL avoid frequent language switching within a single sentence or paragraph  
**And** SHALL prioritize readability and professionalism

### Requirement: Documentation Auto-Update Mechanism
The OpenSpec workflow SHALL enforce documentation updates for every code change that affects user-facing features, configuration, architecture, or deployment procedures.

#### Scenario: Documentation Update Enforcement in Implementation
**Given** an AI assistant is implementing an OpenSpec change  
**When** the assistant reads AGENTS.md Stage 2 instructions  
**THEN** step 5 MUST be "Update documentation"  
**And** a "Documentation Update Checklist" section MUST be present  
**And** the checklist covers README.md, project.md, and docs/ directory

#### Scenario: Documentation Update Template in tasks.md
**Given** an AI assistant creates a new tasks.md for a proposal  
**When** following the template convention in project.md  
**THEN** the tasks.md MUST include a final "Documentation Update (REQUIRED)" section  
**And** the section MUST contain at least 6 verification tasks  
**And** the section covers README.md, project.md, docs/, code examples, and link validation

### Requirement: Documentation Maintenance Convention
The project.md SHALL document the documentation maintenance rules and verification procedures.

#### Scenario: Documentation Maintenance Rules
**Given** an AI assistant reads openspec/project.md  
**When** reviewing "Project Conventions"  
**THEN** a "Documentation Maintenance" section MUST exist  
**And** it defines when documentation updates are required  
**And** it lists update targets (README.md, project.md, docs/)  
**And** it specifies verification procedures  
**And** it states that documentation updates are part of Definition of Done

### Requirement: Documentation Content Accuracy
All documentation in README.md, project.md, and docs/ directory SHALL accurately reflect the current codebase without references to removed features or outdated architectures.

#### Scenario: No Outdated References
**Given** the codebase has evolved and removed certain features  
**When** searching documentation for references to removed features  
**THEN** no references to distributed architecture SHALL exist  
**And** no references to non-existent API endpoints SHALL exist  
**And** no references to GitHub Actions migration SHALL exist  
**And** all code examples SHALL be valid and tested

#### Scenario: Documentation Link Validity After Renaming
**Given** the project documentation  
**When** checking all internal links after file renaming  
**THEN** all relative paths SHALL resolve to existing files  
**And** README.md links to docs/ SHALL use new lowercase-hyphen filenames  
**And** docs/README.md SHALL list all available guides with correct filenames  
**And** no broken links SHALL exist after renaming

### Requirement: Documentation Consistency Check
Every OpenSpec change implementation and archive operation SHALL include a documentation consistency verification step.

#### Scenario: Documentation Check Before Archive
**Given** an OpenSpec change is ready to be archived  
**When** running the archive process  
**THEN** the AI assistant MUST verify documentation is updated  
**And** MUST search for outdated references using `rg`  
**And** MUST verify code examples match current implementation  
**And** MUST confirm no broken links exist  
**And** only proceed with archive if documentation is consistent

## Implementation Notes

- This specification establishes immediate documentation fixes (naming, language style, accuracy) and long-term automation mechanisms
- File renaming improves professionalism: QUICK_REFERENCE.md → quick-reference.md, LOCAL_DEVELOPMENT.md → local-development.md, LOGGING.md → logging.md
- Language style consistency eliminates unnecessary Chinese-English mixing for better readability
- The auto-update mechanism works by embedding requirements in AGENTS.md and project.md that AI assistants read
- Every future proposal will inherit these documentation update requirements
- The verification steps are intentionally detailed to ensure thorough coverage
