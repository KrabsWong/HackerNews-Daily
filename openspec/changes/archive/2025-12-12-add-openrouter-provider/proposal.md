# Change: Add OpenRouter as LLM Provider

## Why
Currently the system only supports DeepSeek as the LLM provider for translation and summarization. Users may want to use different LLM providers based on availability, cost, or preference. OpenRouter provides access to hundreds of AI models through a single API, offering flexibility and fallback options.

## What Changes
- **NEW**: Introduce LLM provider abstraction layer to support multiple providers
- **NEW**: Add OpenRouter as a new LLM provider option
- **NEW**: Environment variable `LLM_PROVIDER` to select provider (default: `deepseek`)
- **NEW**: Environment variable `OPENROUTER_API_KEY` for OpenRouter authentication
- **NEW**: Default model for OpenRouter: `deepseek/deepseek-chat-v3-0324` (DeepSeek V3 via OpenRouter)
- **MODIFIED**: Update `translator.ts` to use provider abstraction
- **MODIFIED**: Update `contentFilter.ts` to use provider abstraction
- **MODIFIED**: Update constants.ts with OpenRouter API configuration

## Impact
- Affected specs: 
  - `translation-service` (MODIFIED: use provider abstraction)
  - `content-filtering` (MODIFIED: use provider abstraction)
  - `constants-config` (MODIFIED: add OpenRouter config)
  - NEW capability: `llm-provider-abstraction`
- Affected code:
  - `src/config/constants.ts` - Add OPENROUTER_API config
  - `src/services/translator.ts` - Refactor to use provider abstraction
  - `src/services/contentFilter.ts` - Refactor to use provider abstraction
  - NEW: `src/services/llmProvider.ts` - Provider abstraction layer
  - `.env.example` - Document new environment variables

## Design Notes
- OpenRouter API is OpenAI-compatible, using the same request/response format
- Base URL: `https://openrouter.ai/api/v1`
- Authentication: `Authorization: Bearer <OPENROUTER_API_KEY>`
- Model format: `provider/model-name` (e.g., `deepseek/deepseek-chat-v3-0324`)
- Optional headers: `HTTP-Referer` and `X-Title` for OpenRouter rankings
