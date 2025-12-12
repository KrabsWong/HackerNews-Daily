## 1. Add OpenRouter Configuration Constants

- [x] 1.1 Add `OPENROUTER_API` config block to `src/config/constants.ts`
  - Base URL: `https://openrouter.ai/api/v1`
  - Request timeout: 30000ms (same as DeepSeek)
  - Retry delay: 1000ms
  - Default model: `deepseek/deepseek-chat-v3-0324`
- [x] 1.2 Add `LLM_PROVIDER` type and config to constants
  - Type: `'deepseek' | 'openrouter'`
  - Read from `process.env.LLM_PROVIDER`
  - Default: `'deepseek'`

## 2. Create LLM Provider Abstraction

- [x] 2.1 Create `src/services/llmProvider.ts` with provider interface
  - Define `LLMProvider` interface
  - Define `ChatCompletionRequest` and `ChatCompletionResponse` types
- [x] 2.2 Implement `DeepSeekProvider` class
  - Wrap existing DeepSeek API calls
  - Use `DEEPSEEK_API` config from constants
- [x] 2.3 Implement `OpenRouterProvider` class
  - Use `OPENROUTER_API` config
  - Support optional `HTTP-Referer` and `X-Title` headers
  - Use configured model from `OPENROUTER_MODEL` or default
- [x] 2.4 Create `createLLMProvider()` factory function
  - Read `LLM_PROVIDER` environment variable
  - Return appropriate provider instance
  - Validate API key presence

## 3. Refactor Translator Service

- [x] 3.1 Update `TranslationService.init()` to use provider abstraction
  - Accept provider instance or create default
  - Remove hardcoded DeepSeek references
- [x] 3.2 Refactor `translateTitle()` to use provider
  - Replace direct DeepSeek API calls with provider.chatCompletion()
- [x] 3.3 Refactor `summarizeContent()` to use provider
- [x] 3.4 Refactor `summarizeComments()` to use provider
- [x] 3.5 Refactor batch methods to use provider
  - `translateTitlesBatch()`
  - `summarizeContentBatch()`
  - `summarizeCommentsBatch()`

## 4. Refactor Content Filter

- [x] 4.1 Update `AIContentFilter` constructor to accept provider
- [x] 4.2 Refactor `sendClassificationRequest()` to use provider

## 5. Update Environment Configuration

- [x] 5.1 Update `.env.example` with new environment variables
  - `LLM_PROVIDER` (optional, default: deepseek)
  - `OPENROUTER_API_KEY` (required if LLM_PROVIDER=openrouter)
  - `OPENROUTER_MODEL` (optional, default: deepseek/deepseek-chat-v3-0324)
  - `OPENROUTER_SITE_URL` (optional, for HTTP-Referer header)
  - `OPENROUTER_SITE_NAME` (optional, for X-Title header)

## 6. Update Worker Environment

- [x] 6.1 Update `src/worker/index.ts` to support provider selection
- [x] 6.2 Update `src/worker/exportHandler.ts` to use provider options

## 7. Manual Testing

- [x] 7.1 TypeScript compilation passes (`npm run build`)
- [ ] 7.2 Test with DeepSeek provider (default behavior)
  - Run `npm run fetch` and verify translations work
- [ ] 7.3 Test with OpenRouter provider
  - Set `LLM_PROVIDER=openrouter` and `OPENROUTER_API_KEY`
  - Run `npm run fetch` and verify translations work
- [ ] 7.4 Test error handling
  - Missing API key scenarios
  - Invalid provider name
  - API timeout/retry behavior

## 8. Documentation

- [ ] 8.1 Update openspec/project.md with new LLM provider info (optional, can be done after deployment)
