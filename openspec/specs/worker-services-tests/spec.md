# worker-services-tests Specification

## Purpose
TBD - created by archiving change enhance-test-coverage. Update Purpose after archive.
## Requirements
### Requirement: Worker HTTP Handler Testing
The system SHALL provide comprehensive test coverage for all HTTP endpoint handlers in `src/worker/index.ts` (GET /, POST /trigger-export, POST /trigger-export-sync).

#### Scenario: GET health check endpoint
**Given** a running Worker  
**When** a GET request is made to `/`  
**Then** the handler SHALL return HTTP 200 OK with a health status message  
**And** the response time SHALL be minimal (< 100ms)

#### Scenario: POST trigger-export endpoint with valid config
**Given** Worker has valid LLM_PROVIDER configured  
**When** POST request is made to `/trigger-export`  
**Then** the handler SHALL return HTTP 202 Accepted  
**And** the export SHALL be triggered asynchronously

#### Scenario: POST trigger-export endpoint with invalid config
**Given** Worker is missing LLM_PROVIDER configuration  
**When** POST request is made to `/trigger-export`  
**Then** the handler SHALL return HTTP 400 Bad Request  
**And** the response SHALL include a descriptive error message

#### Scenario: POST trigger-export-sync endpoint
**Given** Worker has valid configuration  
**When** POST request is made to `/trigger-export-sync`  
**Then** the handler SHALL return HTTP 200 OK  
**And** the response SHALL contain the export result or status

### Requirement: Scheduled Event Handler Testing
The system SHALL provide test coverage for scheduled (Cron) event handling in Worker.

#### Scenario: Cron trigger successfully initiates export
**Given** a scheduled event fires with valid Worker configuration  
**When** the scheduled event handler executes  
**Then** the export pipeline SHALL be initiated  
**And** execution metrics SHALL be logged

#### Scenario: Cron trigger with missing configuration
**Given** a scheduled event fires but required configuration is missing  
**When** the scheduled event handler executes  
**Then** the handler SHALL log an error  
**And** no export SHALL be attempted

### Requirement: Worker Configuration Validation Testing
The system SHALL provide comprehensive test coverage for configuration validation in `src/worker/config/validation.ts`.

#### Scenario: Valid configuration with GitHub publisher
**Given** LLM_PROVIDER and GitHub configuration are set  
**When** validateWorkerConfig() is called  
**Then** validation SHALL pass without errors

#### Scenario: Valid configuration with Telegram publisher
**Given** LLM_PROVIDER and Telegram configuration are set  
**When** validateWorkerConfig() is called  
**Then** validation SHALL pass without errors

#### Scenario: Valid configuration with local test mode
**Given** LOCAL_TEST_MODE=true and LLM_PROVIDER configured  
**When** validateWorkerConfig() is called  
**Then** validation SHALL pass without errors

#### Scenario: Missing LLM_PROVIDER
**Given** LLM_PROVIDER is not set  
**When** validateWorkerConfig() is called  
**Then** validation SHALL fail with error message "LLM_PROVIDER is required"

#### Scenario: No publisher enabled
**Given** GITHUB_ENABLED=false, TELEGRAM_ENABLED=false, LOCAL_TEST_MODE=false  
**When** validateWorkerConfig() is called  
**Then** validation SHALL fail with error message indicating at least one publisher must be enabled

#### Scenario: GitHub enabled but missing token
**Given** GITHUB_ENABLED=true but GITHUB_TOKEN is not set  
**When** validateWorkerConfig() is called  
**Then** validation SHALL fail with error message about missing GITHUB_TOKEN

### Requirement: Error Handling in Daily Export
The system SHALL provide test coverage for error scenarios in the daily export pipeline.

#### Scenario: Article fetcher failure for single story
**Given** one story's article fetch fails but others succeed  
**When** daily export runs  
**Then** the failed story SHALL still be included (graceful degradation)  
**And** its description SHALL fall back to meta description  
**And** other stories SHALL process normally

#### Scenario: LLM translation failure
**Given** translation service fails  
**When** daily export runs  
**Then** the original English text SHALL be used as fallback  
**And** export SHALL continue successfully

#### Scenario: GitHub publisher failure
**Given** GitHub API returns error  
**When** daily export tries to publish to GitHub  
**Then** the error SHALL be thrown (hard failure)  
**And** export SHALL stop with error message

#### Scenario: Telegram publisher failure
**Given** Telegram API returns error  
**When** daily export tries to publish to Telegram  
**Then** the error SHALL be logged as warning (soft failure)  
**And** export SHALL continue with other publishers  
**And** Terminal publisher SHALL still publish if enabled

#### Scenario: Content filter failure
**Given** AI content filter LLM fails  
**When** daily export runs with ENABLE_CONTENT_FILTER=true  
**Then** no filtering SHALL be applied (fail-open)  
**And** all stories SHALL be included  
**And** export SHALL continue successfully

### Requirement: Article Fetcher Service Testing
The system SHALL provide test coverage for `src/services/articleFetcher.ts`.

#### Scenario: Fetch single article successfully
**Given** a valid URL pointing to an article  
**When** fetchArticleMetadata(url) is called  
**Then** the result SHALL contain `url`, `description`, and `fullContent`  
**And** fullContent SHALL contain the main article text

#### Scenario: Batch fetch multiple articles
**Given** an array of 5 valid article URLs  
**When** fetchArticlesBatch(urls) is called  
**Then** all 5 articles SHALL be fetched  
**And** results SHALL be returned as an array of ArticleMetadata

#### Scenario: Article content exceeds maximum length
**Given** an article with content > MAX_CONTENT_LENGTH  
**When** fetchArticleMetadata(url) is called  
**Then** fullContent SHALL be truncated to MAX_CONTENT_LENGTH  
**And** a truncation marker SHALL be appended (e.g., "...")

#### Scenario: Invalid or unreachable URL
**Given** an invalid or unreachable URL  
**When** fetchArticleMetadata(url) is called  
**Then** the result SHALL have `description` and `fullContent` as null  
**And** error SHALL be logged but not thrown

#### Scenario: Extract description from article
**Given** an article with content  
**When** fetchArticleMetadata(url) is called  
**Then** description SHALL be extracted from the first paragraph  
**And** description length SHALL be reasonable (50-200 chars)

### Requirement: Content Filter Service Testing
The system SHALL provide test coverage for `src/services/contentFilter.ts`.

#### Scenario: Filter with low sensitivity setting
**Given** CONTENT_FILTER_SENSITIVITY=low  
**When** filterStories() is called  
**Then** only stories violating Chinese law or with obvious adult/violence SHALL be filtered  
**And** political topics SHALL pass through

#### Scenario: Filter with medium sensitivity setting
**Given** CONTENT_FILTER_SENSITIVITY=medium  
**When** filterStories() is called  
**Then** stories about Chinese politics or sensitive topics SHALL be filtered  
**And** international politics or general programming SHALL pass through

#### Scenario: Filter with high sensitivity setting
**Given** CONTENT_FILTER_SENSITIVITY=high  
**When** filterStories() is called  
**Then** any story mentioning China politics SHALL be filtered  
**And** stories about free speech/censorship SHALL be filtered

#### Scenario: Batch filtering multiple stories
**Given** an array of 10 stories  
**When** filterStories(stories) is called  
**Then** each story SHALL be classified as SAFE or SENSITIVE  
**And** batch SHALL complete in reasonable time (< 10 seconds per batch)

#### Scenario: Content filter LLM failure
**Given** LLM provider returns error  
**When** filterStories() is called  
**Then** no stories SHALL be filtered (fail-open)  
**And** all stories SHALL be returned  
**And** error SHALL be logged but not thrown

### Requirement: Markdown Exporter Service Testing
The system SHALL provide test coverage for `src/services/markdownExporter.ts`.

#### Scenario: Generate valid Jekyll front-matter
**Given** a date 2024-12-20  
**When** generateJekyllFrontMatter(date) is called  
**Then** output SHALL include YAML front-matter with layout, title, and date

#### Scenario: Generate correct filename format
**Given** a date 2024-12-20  
**When** generateFilename(date) is called  
**Then** output SHALL be "2024-12-20-daily.md"

#### Scenario: Generate markdown with multiple stories
**Given** an array of 3 ProcessedStory objects  
**When** generateMarkdownContent(stories, date) is called  
**Then** each story SHALL have rank (1, 2, 3, ...)  
**And** stories SHALL be separated by `---` dividers  
**And** Chinese and English titles SHALL be included

#### Scenario: Include HN discussion link
**Given** a ProcessedStory with storyId=12345  
**When** generateMarkdownContent() is called  
**Then** markdown SHALL include link to `https://news.ycombinator.com/item?id=12345`

#### Scenario: Include comment summary when available
**Given** a ProcessedStory with commentSummary  
**When** generateMarkdownContent() is called  
**Then** markdown SHALL include "评论要点:" section with the summary

#### Scenario: Omit comment summary when null
**Given** a ProcessedStory with commentSummary = null  
**When** generateMarkdownContent() is called  
**Then** markdown SHALL NOT include "评论要点:" section

### Requirement: Title Translator Service Testing
The system SHALL provide test coverage for `src/services/translator/title.ts`.

#### Scenario: Translate English title to Chinese
**Given** a title in English  
**When** translateTitle(provider, title) is called  
**Then** output SHALL be Chinese translation  
**And** technical terms SHALL be preserved (e.g., "TypeScript", "React", "GitHub")

#### Scenario: Detect and skip already-Chinese titles
**Given** a title already in Chinese  
**When** translateTitle(provider, title) is called  
**Then** output SHALL remain unchanged

#### Scenario: Batch translate multiple titles
**Given** an array of 10 English titles  
**When** translateTitlesBatch(provider, titles, batchSize=5) is called  
**Then** all 10 titles SHALL be translated  
**And** API calls SHALL be batched (≤2 API calls for 10 titles)

#### Scenario: Retry on rate limit error
**Given** LLM provider returns HTTP 429 (rate limit)  
**When** translateTitle(provider, title) is called  
**Then** translation SHALL retry automatically  
**And** retry delay SHALL follow provider-specific delay (e.g., 1000ms for DeepSeek)

#### Scenario: Translation failure falls back to original
**Given** LLM provider fails after max retries  
**When** translateTitle(provider, title) is called  
**Then** original English title SHALL be returned  
**And** error SHALL be logged

### Requirement: Content Summarization Service Testing
The system SHALL provide test coverage for `src/services/translator/summary.ts`.

#### Scenario: Summarize long article content
**Given** article content with 3000+ characters  
**When** summarizeContent(provider, content, maxLength=300) is called  
**Then** output SHALL be a Chinese summary  
**And** summary length SHALL NOT exceed maxLength (300 chars)

#### Scenario: Batch summarize multiple articles
**Given** an array of 5 articles  
**When** summarizeContentBatch(provider, articles, batchSize=3) is called  
**Then** all 5 articles SHALL be summarized  
**And** API calls SHALL be batched for efficiency

#### Scenario: Summarize comments
**Given** an array of HNComment objects  
**When** summarizeComments(provider, comments) is called  
**Then** output SHALL be a Chinese summary of key points from comments  
**And** summary SHALL be concise (≤100 chars for comments)

#### Scenario: Empty content handling
**Given** an empty string as content  
**When** summarizeContent(provider, content, maxLength) is called  
**Then** output SHALL be null or a default message

#### Scenario: Batch summarization graceful degradation
**Given** batch summarization fails  
**When** summarizeContentBatch(provider, articles, batchSize) is called  
**Then** system SHALL fall back to individual article summarization  
**And** all articles SHALL eventually be summarized

### Requirement: LLM Provider Implementation Testing
The system SHALL provide test coverage for LLM provider implementations in `src/services/llm/providers.ts`.

#### Scenario: DeepSeek successful chat completion
**Given** a valid DeepSeekProvider  
**When** chatCompletion(request) is called  
**Then** response SHALL contain the model's output  
**And** API endpoint SHALL be "https://api.deepseek.com/chat/completions"  
**And** model name SHALL be "deepseek-chat" (or configured override)

#### Scenario: OpenRouter successful chat completion with headers
**Given** a valid OpenRouterProvider with siteUrl and siteName  
**When** chatCompletion(request) is called  
**Then** request SHALL include HTTP-Referer header (siteUrl)  
**And** request SHALL include X-Title header (siteName)  
**And** API endpoint SHALL be "https://openrouter.ai/api/v1/chat/completions"

#### Scenario: Zhipu concurrent request limiting
**Given** a ZhipuProvider  
**When** 5 concurrent chatCompletion(request) calls are made  
**Then** only 2 SHALL execute concurrently (respecting ZHIPU_MAX_CONCURRENT=2)  
**And** remaining calls SHALL queue and execute sequentially

#### Scenario: Provider rate limit retry
**Given** LLM provider returns HTTP 429  
**When** chatCompletion(request) is called with retries  
**Then** automatic retry SHALL occur  
**And** retry delay for Zhipu SHALL be 2000ms (longer than DeepSeek/OpenRouter 1000ms)  
**And** max retries SHALL be enforced (typically 3)

#### Scenario: Max retries exceeded
**Given** LLM provider continues returning HTTP 429 after max retries  
**When** chatCompletion(request) is called  
**Then** error SHALL be thrown  
**And** error message SHALL indicate "max retries exceeded"

### Requirement: LLM Provider Factory Testing
The system SHALL provide test coverage for LLM provider creation in `src/services/llm/index.ts`.

#### Scenario: Create DeepSeek provider from environment
**Given** LLM_PROVIDER=deepseek and LLM_DEEPSEEK_API_KEY set  
**When** createLLMProviderFromEnv(env) is called  
**Then** returned provider SHALL be DeepSeekProvider instance  
**And** getName() SHALL return "deepseek"

#### Scenario: Create OpenRouter provider from environment
**Given** LLM_PROVIDER=openrouter and LLM_OPENROUTER_API_KEY set  
**When** createLLMProviderFromEnv(env) is called  
**Then** returned provider SHALL be OpenRouterProvider instance  
**And** siteUrl and siteName SHALL be set if provided

#### Scenario: Create Zhipu provider from environment
**Given** LLM_PROVIDER=zhipu and LLM_ZHIPU_API_KEY set  
**When** createLLMProviderFromEnv(env) is called  
**Then** returned provider SHALL be ZhipuProvider instance  
**And** model SHALL be "glm-4.5-flash" or LLM_ZHIPU_MODEL override

#### Scenario: Invalid provider string
**Given** LLM_PROVIDER="invalid_provider"  
**When** createLLMProviderFromEnv(env) is called  
**Then** error SHALL be thrown with message indicating unsupported provider

#### Scenario: Missing API key
**Given** LLM_PROVIDER=deepseek but LLM_DEEPSEEK_API_KEY not set  
**When** createLLMProviderFromEnv(env) is called  
**Then** error SHALL be thrown indicating missing API key

### Requirement: End-to-End Daily Export Integration Testing
The system SHALL provide test coverage for the complete daily export workflow from Firebase through Publishers.

#### Scenario: Complete happy-path daily export
**Given** mocked Firebase API, Algolia API, Crawler API, and LLM  
**When** runDailyExport(env) is executed  
**Then** the following sequence SHALL occur:
  1. Top stories fetched from Firebase
  2. Story details fetched from Algolia
  3. Stories filtered by date range (previous 24 hours UTC)
  4. Article content fetched from URLs
  5. Comments fetched from Algolia
  6. Story titles translated to Chinese
  7. Article summaries generated in Chinese
  8. Comment summaries generated in Chinese
  9. Markdown content generated
  10. Final ProcessedStory array returned
**And** export result SHALL contain 30 stories (default limit)  
**And** execution metrics SHALL be logged

#### Scenario: Daily export with content filtering
**Given** ENABLE_CONTENT_FILTER=true  
**When** runDailyExport(env) is executed  
**Then** stories SHALL be filtered for sensitive content  
**And** only SAFE stories SHALL be included in final result  
**And** filtering SHALL not break export pipeline

#### Scenario: Partial story failure doesn't block export
**Given** one story's article fetch fails  
**When** runDailyExport(env) is executed  
**Then** failed story SHALL still be in result with fallback description  
**And** other 29 stories SHALL process successfully  
**And** export SHALL complete without error

### Requirement: Multi-Publisher Coordination Testing
The system SHALL provide test coverage for coordination between multiple publishers.

#### Scenario: GitHub and Terminal publishers both publish
**Given** GITHUB_ENABLED=true, LOCAL_TEST_MODE=true  
**When** handleDailyExport() executes  
**Then** both GitHubPublisher and TerminalPublisher SHALL publish the same content  
**And** GitHub publisher output verified  
**And** Terminal publisher output verified

#### Scenario: GitHub and Telegram publishers both publish
**Given** GITHUB_ENABLED=true, TELEGRAM_ENABLED=true  
**When** handleDailyExport() executes  
**Then** both publishers SHALL receive identical content  
**And** both SHALL publish without interference

#### Scenario: GitHub publisher failure stops export
**Given** GITHUB_ENABLED=true, GitHubPublisher throws error  
**When** handleDailyExport() executes  
**Then** error SHALL be propagated (hard failure)  
**And** export SHALL stop

#### Scenario: Telegram publisher failure continues export
**Given** TELEGRAM_ENABLED=true, TelegramPublisher throws error  
**When** handleDailyExport() executes  
**Then** error SHALL be logged as warning (soft failure)  
**And** other publishers SHALL continue  
**And** export SHALL succeed if Terminal/GitHub succeeded

