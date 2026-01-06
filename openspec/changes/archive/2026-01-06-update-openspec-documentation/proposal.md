# Change: Update OpenSpec Documentation (AGENTS.md and project.md)

## Why

After multiple iterations of the project, the OpenSpec documentation files (`openspec/AGENTS.md` and `openspec/project.md`) have become outdated and no longer accurately reflect the current project state. Key changes like:
- Distributed task processing with D1 database
- Error handling architecture (types/errors.ts, utils/errorHandler.ts)
- Type safety enhancements with enums (DailyTaskStatus, ArticleStatus, etc.)
- Service directory restructuring (articleFetcher, contentFilter, translator, task)
- Worker architecture evolution (routes, statemachine, publishers)
- Test infrastructure improvements

These changes need to be documented so that AI assistants and developers have accurate context.

## What Changes

### AGENTS.md Updates
- Update references to match current OpenSpec conventions
- Clarify the three-stage workflow (proposal → apply → archive)
- Add missing guidelines for documentation maintenance
- Update examples to reflect current project patterns
- Ensure consistency with the CLI tool behavior

### project.md Updates
- **Directory Structure**: Update to reflect current `src/` layout with all subdirectories
- **Architecture Patterns**: 
  - Document distributed task processing architecture (executor, storage, D1)
  - Add error handling patterns (AppError, APIError, ServiceError, ValidationError)
  - Document type safety enhancements (discriminated unions, enums)
- **Type Organization**: Add documentation for `types/errors.ts`
- **Configuration Management**: Update to reflect current config module structure
- **Testing Strategy**: Update coverage targets and test organization to match current state
- **Tech Stack**: Add missing dependencies and tools
- **External Dependencies**: Update with current services and their constraints

## Impact

- Affected specs: `documentation` (will create MODIFIED delta)
- Affected files: 
  - `openspec/AGENTS.md` - OpenSpec workflow instructions for AI assistants
  - `openspec/project.md` - Project conventions and architecture reference
- No breaking changes - this is purely documentation update
- Improves AI assistant effectiveness by providing accurate project context
