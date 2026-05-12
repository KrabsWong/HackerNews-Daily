<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Commands

```bash
npm run build:worker      # Build worker bundle (required before deploy)
npm run dev:worker        # Local dev server (http://localhost:8787)
npm test                  # Run tests (Vitest)
npm run test:coverage     # Coverage report
npx tsc --noEmit          # Type check (run after code changes)
npm run deploy:worker     # Deploy to production
```

## Architecture

- **Entry**: `src/worker/index.ts` - Cloudflare Worker with scheduled (cron) and HTTP handlers
- **State Machine**: `src/worker/statemachine/index.ts` - Distributed task orchestration
- **D1 Database**: Task persistence (`daily_tasks`, `articles`, `task_batches`)
- **LLM Services**: `src/services/llm/` - Provider abstraction (DeepSeek, OpenRouter, Zhipu)
- **Publishers**: `src/worker/publishers/` - GitHub, Telegram, Terminal (local test)

## Key Patterns

- **Tests location**: All tests MUST be in `src/__tests__/` (mirrors src structure)
- **Types location**: All exported types MUST be in `src/types/`
- **Mocks**: `src/__tests__/helpers/` - factories, LLM mocks, worker env mocks
- **Error handling**: Use typed errors from `src/types/errors.ts`, graceful degradation

## Development Flow

1. For new features: read `openspec/project.md` first, then create proposal
2. After code changes: run `npx tsc --noEmit` to verify types
3. Before commit: `npm test` must pass
4. Deploy: `npm run build:worker && npm run deploy:worker`

## Local Testing

Set in `.dev.vars`:
```
LOCAL_TEST_MODE=true
GITHUB_ENABLED=false
TELEGRAM_ENABLED=false
LLM_PROVIDER=openrouter
LLM_OPENROUTER_API_KEY=<key>
```

This outputs Markdown to terminal instead of publishing externally.
