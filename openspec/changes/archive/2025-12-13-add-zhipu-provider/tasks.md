# Tasks: Add Zhipu AI Provider

## 1. Core Implementation

- [x] 1.1 Add `ZHIPU` to `LLMProviderType` enum in `src/config/constants.ts`
- [x] 1.2 Add `ZHIPU_API` configuration constant in `src/config/constants.ts`
  - BASE_URL: `https://open.bigmodel.cn/api/paas/v4`
  - DEFAULT_MODEL: `glm-4.5-flash`
  - REQUEST_TIMEOUT: 30000
  - RETRY_DELAY: 2000 (longer due to concurrency limit of 2)
- [x] 1.3 Extend `ProviderEnv` interface in `src/types/llm.ts`
  - Add `LLM_ZHIPU_API_KEY?: string`
  - Add `LLM_ZHIPU_MODEL?: string`

## 2. Provider Implementation

- [x] 2.1 Create `ZhipuProvider` class in `src/services/llm/providers.ts`
  - Implement `LLMProvider` interface
  - Use OpenAI-compatible request format
  - Set longer retry delay for concurrency handling
- [x] 2.2 Update `parseProvider()` in `src/services/llm/utils.ts`
  - Add case for `LLMProviderType.ZHIPU`
  - Update error message to include "zhipu" as valid option
- [x] 2.3 Update `getApiKeyForProvider()` in `src/services/llm/utils.ts`
  - Add case for `LLMProviderType.ZHIPU`
  - Return `LLM_ZHIPU_API_KEY`
- [x] 2.4 Update `getModelForProvider()` in `src/services/llm/utils.ts`
  - Add case for `LLMProviderType.ZHIPU`
  - Return `LLM_ZHIPU_MODEL`
- [x] 2.5 Update `createLLMProvider()` in `src/services/llm/index.ts`
  - Add case for `LLMProviderType.ZHIPU`
  - Create `ZhipuProvider` instance
- [x] 2.6 Export `ZhipuProvider` from `src/services/llm/index.ts`

## 3. CLI Integration

- [x] 3.1 Update `buildCliProviderOptions()` in `src/services/llm/utils.ts`
  - Add `LLM_ZHIPU_API_KEY: process.env.LLM_ZHIPU_API_KEY`
  - Add `LLM_ZHIPU_MODEL: process.env.LLM_ZHIPU_MODEL`

## 4. Testing & Verification

- [x] 4.1 Build project to verify no TypeScript errors
  - Run `npm run build`
- [x] 4.2 Manual test with Zhipu API key
  - Set `LLM_PROVIDER=zhipu` and `LLM_ZHIPU_API_KEY=<key>`
  - Run `npm run fetch` and verify translation/summary works
  - User verified basic functionality works (timeout on some requests due to concurrency limit)
- [x] 4.3 Verify error handling
  - Error messages include zhipu as valid provider option

## 5. Documentation Update (REQUIRED)

- [x] 5.1 Update `.env.example`
  - Add `LLM_ZHIPU_API_KEY` example
  - Add `LLM_ZHIPU_MODEL` example with default value comment
  - Add note about concurrency limit of 2
- [x] 5.2 Update `README.md`
  - Add Zhipu to LLM provider options
  - Document environment variables
  - Add note about concurrency limit
- [x] 5.3 Update `openspec/project.md`
  - Update Tech Stack section to include Zhipu
  - Update Configuration section with Zhipu variables
  - Add concurrency limit documentation
- [x] 5.4 Verify no broken links or outdated information
