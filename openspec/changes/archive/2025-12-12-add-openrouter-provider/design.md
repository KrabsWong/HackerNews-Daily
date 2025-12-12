## Context

The HackerNews Daily application currently uses DeepSeek as the sole LLM provider for:
- Title translation (English to Chinese)
- Article content summarization
- Comment summarization
- Content filtering (classification)

Users have requested the ability to use alternative providers like OpenRouter, which aggregates access to hundreds of AI models through a single API endpoint.

### Stakeholders
- End users who want provider flexibility
- Developers maintaining the codebase
- Operations teams managing API keys and costs

## Goals / Non-Goals

### Goals
1. Allow users to choose between DeepSeek and OpenRouter via environment variable
2. Maintain backward compatibility - existing DeepSeek users should not need to change anything
3. Keep the codebase simple with minimal abstraction overhead
4. Support future provider additions with minimal code changes

### Non-Goals
- Do not implement automatic provider fallback (out of scope for this change)
- Do not implement model selection UI (CLI flag only)
- Do not change prompts or temperature settings per provider

## Decisions

### Decision 1: Provider Abstraction Pattern
**What**: Create a simple provider interface in `src/services/llmProvider.ts`

**Why**: 
- Centralizes API communication logic
- Makes it easy to add new providers
- Keeps translator.ts and contentFilter.ts focused on business logic

**Alternatives considered**:
1. **Inline conditionals**: Add if/else in translator.ts - rejected as it would scatter provider logic
2. **Factory pattern with classes**: More complex than needed for 2 providers
3. **Dependency injection**: Over-engineered for this use case

**Chosen approach**: Simple factory function that returns a configured client object.

### Decision 2: Environment Variable Naming
**What**: Use `LLM_PROVIDER` (values: `deepseek`, `openrouter`) and `OPENROUTER_API_KEY`

**Why**:
- Consistent with existing `DEEPSEEK_API_KEY` naming
- Clear separation between provider selection and credentials
- `LLM_PROVIDER` is generic enough for future providers

### Decision 3: Default Model for OpenRouter
**What**: Default to `deepseek/deepseek-chat-v3-0324`

**Why**:
- User specifically requested DeepSeek V3.2 via OpenRouter
- Maintains consistency with current DeepSeek behavior
- Can be overridden via `OPENROUTER_MODEL` environment variable

### Decision 4: Optional OpenRouter Headers
**What**: Support optional `HTTP-Referer` and `X-Title` headers via environment variables

**Why**:
- OpenRouter uses these for leaderboard rankings
- Not required for functionality
- Users who want attribution can opt-in

## Architecture

```
┌─────────────────────┐
│   translator.ts     │
│   contentFilter.ts  │
└──────────┬──────────┘
           │ uses
           ▼
┌─────────────────────┐
│   llmProvider.ts    │
│   ┌───────────────┐ │
│   │ LLMProvider   │ │
│   │ interface     │ │
│   └───────────────┘ │
│   ┌───────────────┐ │
│   │ DeepSeekProv  │ │
│   └───────────────┘ │
│   ┌───────────────┐ │
│   │ OpenRouterProv│ │
│   └───────────────┘ │
└─────────────────────┘
```

## Interface Design

```typescript
interface LLMProvider {
  /** Send a chat completion request */
  chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  
  /** Get the provider name for logging */
  getName(): string;
}

interface ChatCompletionRequest {
  messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>;
  temperature?: number;
}

interface ChatCompletionResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| OpenRouter API differences | Both use OpenAI-compatible format; tested with docs |
| Rate limit handling differs | Keep existing retry logic, works for both |
| Model availability on OpenRouter | Default model is popular; allow override |
| Breaking existing DeepSeek users | Default provider remains `deepseek` |

## Migration Plan

1. **No migration needed** - This is additive
2. Existing users continue using DeepSeek by default
3. Users wanting OpenRouter set two new env vars:
   - `LLM_PROVIDER=openrouter`
   - `OPENROUTER_API_KEY=<key>`

## Rollback

If issues arise:
1. Remove/unset `LLM_PROVIDER` or set to `deepseek`
2. System reverts to DeepSeek-only behavior

## Open Questions

1. ~~Should we support model override for DeepSeek too?~~ → Out of scope, can be added later
2. ~~Should we add a health check endpoint?~~ → Out of scope
