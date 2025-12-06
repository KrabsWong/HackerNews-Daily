# ai-summary-generation Specification Delta

## ADDED Requirements

### Requirement: Configure Summary Length
The system SHALL allow users to configure the target length for AI-generated summaries via environment variable.

**Related to:** article-content-extraction (consumes extracted content)

#### Scenario: Use default summary length
**Given** `SUMMARY_MAX_LENGTH` is not set in environment  
**When** the system initializes  
**Then** the default summary length is 300 characters

#### Scenario: Use custom summary length
**Given** `SUMMARY_MAX_LENGTH=200` in environment  
**When** the system initializes  
**Then** the target summary length is 200 characters  
**And** AI summarization uses this length as guidance

#### Scenario: Invalid summary length (too short)
**Given** `SUMMARY_MAX_LENGTH=50` in environment  
**When** validating configuration  
**Then** the system displays warning "Invalid SUMMARY_MAX_LENGTH, using 300"  
**And** falls back to default 300 characters

#### Scenario: Invalid summary length (too long)
**Given** `SUMMARY_MAX_LENGTH=1000` in environment  
**When** validating configuration  
**Then** the system displays warning "SUMMARY_MAX_LENGTH too large, capping at 500"  
**And** caps the limit at 500 characters

### Requirement: Generate AI-Powered Summaries
The system SHALL use DeepSeek API to generate concise summaries from full article content.

#### Scenario: Summarize article with full content
**Given** extracted article content is available  
**And** content is 2000 characters  
**When** generating summary  
**Then** the system sends content to DeepSeek API with summarization prompt  
**And** specifies target length in prompt (e.g., "approximately 300 characters")  
**And** requests summary in Chinese  
**And** returns the generated summary

#### Scenario: Summarization prompt structure
**Given** article content and target length of 300  
**When** constructing API request  
**Then** the prompt includes:  
- Clear instruction to summarize in Chinese  
- Target length specification (~300 characters)  
- Instructions to capture main points  
- Instructions to focus on key insights  
- The full article content

#### Scenario: AI summarization succeeds
**Given** DeepSeek API is available  
**And** article content is provided  
**When** requesting summarization  
**Then** the system receives Chinese summary  
**And** summary length is approximately the target length (±50 chars)  
**And** summary is in Chinese language  
**And** summary captures article's main points

#### Scenario: AI summarization fails (API error)
**Given** DeepSeek API returns an error  
**When** requesting summarization  
**Then** the system logs warning with error details  
**And** falls back to meta description translation  
**And** continues processing without crashing

#### Scenario: AI summarization rate limited
**Given** DeepSeek API returns 429 rate limit error  
**When** first summarization attempt fails  
**Then** the system waits 1 second  
**And** retries the request once  
**And** if retry fails, falls back to meta description

### Requirement: Display Summarization Progress
The system SHALL provide clear console feedback during the summarization process.

#### Scenario: Show extraction progress
**Given** fetching articles is in progress  
**When** extracting content from HTML  
**Then** the system displays "Extracting article content..." message  
**And** shows progress like "Extracted 10/30 articles..."

#### Scenario: Show summarization progress
**Given** content extraction is complete  
**When** generating AI summaries  
**Then** the system displays "Generating AI summaries..." message  
**And** shows progress like "Summarized 5/30 articles..."  
**And** updates progress every 5 articles or on completion

#### Scenario: Indicate fallback usage
**Given** content extraction or summarization fails for an article  
**When** falling back to meta description  
**Then** the system logs debug message indicating fallback  
**And** includes URL in the log for troubleshooting

### Requirement: Optimize API Usage
The system SHALL use efficient API parameters and handle errors gracefully to minimize costs and latency.

#### Scenario: Use appropriate temperature setting
**Given** requesting AI summarization  
**When** constructing API request  
**Then** the system uses temperature 0.5  
**And** balances consistency with natural language generation

#### Scenario: Reuse existing DeepSeek client
**Given** DeepSeek API is already configured for translation  
**When** adding summarization feature  
**Then** the system reuses the same TranslationService instance  
**And** shares API key configuration  
**And** shares retry logic and error handling

#### Scenario: Handle token limits
**Given** article content is very long  
**When** preparing for summarization  
**Then** content is pre-truncated to 4000 characters  
**And** prevents API token limit errors  
**And** still provides enough context for quality summary

### Requirement: Handle AI-Generated Summaries in Translation Pipeline
The system SHALL handle AI-generated Chinese summaries in the translation pipeline without redundant translation.

#### Scenario: Skip translation for AI-generated Chinese summary
**Given** an AI-generated summary in Chinese from summarization step  
**And** summary already in Chinese  
**When** processing for translation  
**Then** the system detects Chinese characters  
**And** returns summary as-is without additional API call  
**And** avoids redundant translation

#### Scenario: Translate meta description fallback
**Given** meta description is in English  
**And** content extraction or summarization failed  
**When** processing meta description  
**Then** the system translates to Chinese  
**And** uses existing translation logic
