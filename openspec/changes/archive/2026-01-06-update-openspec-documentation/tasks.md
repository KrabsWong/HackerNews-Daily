## 1. Update AGENTS.md

- [x] 1.1 Review current AGENTS.md and identify outdated sections
- [x] 1.2 Update OpenSpec workflow references to match current CLI behavior
- [x] 1.3 Add/update documentation maintenance guidelines
- [x] 1.4 Update code examples to reflect current project patterns
- [x] 1.5 Ensure consistency with project.md conventions
- [x] 1.6 Add emphasis on reading project.md first for project context
- [x] 1.7 Add compilation verification requirements to Stage 2

## 2. Update project.md

- [x] 2.1 Update "Directory Structure" section with current `src/` layout
  - Add `types/errors.ts` documentation
  - Add `utils/errorHandler.ts` and `utils/d1.ts` documentation
  - Update `services/` subdirectories (task/, articleFetcher/, contentFilter/, translator/)
  - Update `worker/` subdirectories (routes/, statemachine/, sources/, publishers/)
  - Add `worker/config/` directory
- [x] 2.2 Update "Architecture Patterns" section
  - Document distributed task processing (executor, storage, D1 database)
  - Add error handling architecture documentation
  - Document type safety enhancements (discriminated unions, enums)
  - Update configuration management pattern
- [x] 2.3 Update "Tech Stack" section with current dependencies
- [x] 2.4 Update "External Dependencies" section
- [x] 2.5 Update "Testing Strategy" section
  - Reflect current coverage: 55% (Phase 0)
  - Update test organization to match `src/__tests__/` structure
- [x] 2.6 Update "Data Processing Flow" to include distributed task stages
- [x] 2.7 Remove obsolete sections (if any)
- [x] 2.8 Add missing conventions for error handling and type safety

## 3. Validation

- [x] 3.1 Run `openspec validate update-openspec-documentation --strict`
- [x] 3.2 Cross-check AGENTS.md and project.md for consistency
- [x] 3.3 Verify all file paths and code references are accurate
- [x] 3.4 Test that examples in documentation are valid

## 4. Documentation Update (REQUIRED)

- [x] 4.1 Check README.md for references to AGENTS.md or project.md
- [x] 4.2 Verify docs/ files don't duplicate or conflict with updated content
- [x] 4.3 Update or remove references to changed conventions
- [x] 4.4 Test code examples in documentation
- [x] 4.5 Verify no broken links or outdated information
