# comment-summarizer Specification Delta

## Overview

This change adds a dedicated `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH` constant (300 characters) to provide independent control over comment summary length, enabling richer information capture from HackerNews discussions while maintaining flexibility to adjust independently from article summaries.

## MODIFIED Requirements

### Requirement: Generate AI Summary of Comments
The system SHALL use LLM API to generate detailed Chinese summaries of HackerNews comments using `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH`.

**Related to:** comment-fetcher (consumes fetched comments)

**Changes:**
- Added dedicated `COMMENT_SUMMARY_LENGTH` configuration constant (300 characters)
- Target length increased from hardcoded ~100 to configurable ~300 characters
- Enhanced prompt guidance for richer, more detailed summaries
- Improved capturing of implementation details, performance data, alternatives
- Separated comment config from article config for independent tuning

#### Scenario: Summarize 10 comments successfully
**Given** 10 valid comments from a technical discussion  
**And** comments contain technical terms like "React", "TypeScript", "performance"  
**When** generating comment summary  
**Then** the system sends comments to LLM API with summarization prompt  
**And** specifies target length using `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH` (~300 characters)  
**And** instructs to preserve technical terms  
**And** instructs to capture different viewpoints and arguments if controversial  
**And** instructs to include implementation details, performance data, or alternatives if discussed  
**And** receives a Chinese summary of key discussion points  
**And** summary is approximately 250-350 characters long

#### Scenario: Capture detailed technical discussions
**Given** comments discussing specific optimization techniques and performance benchmarks  
**And** comments mention alternative approaches with pros/cons  
**When** generating summary  
**Then** the summary includes key optimization techniques mentioned  
**And** captures performance improvements or benchmarks if specified  
**And** mentions alternative approaches and trade-offs  
**And** provides sufficient context for readers to understand the discussion  
**And** remains within ~300 character target

#### Scenario: Preserve technical terms in summary
**Given** comments discussing "React 18", "Concurrent Rendering", and "Suspense"  
**When** generating summary  
**Then** the summary preserves exact terms: "React 18", "Concurrent Rendering", "Suspense"  
**And** does not translate technical terms to Chinese  
**And** uses Chinese only for explanatory text

#### Scenario: Handle comments with diverse opinions
**Given** comments with both positive and negative opinions about a topic  
**When** generating summary  
**Then** the summary captures the range of opinions  
**And** mentions different viewpoints with their key arguments  
**And** indicates if there's consensus or controversy  
**And** remains neutral and balanced

#### Scenario: Too few comments to summarize
**Given** a story has only 2 valid comments  
**When** attempting to generate summary  
**Then** the system returns null (not enough for meaningful summary)  
**And** the story will not display a comment line

#### Scenario: AI summarization fails
**Given** LLM API returns an error or times out  
**When** requesting comment summarization  
**Then** the system logs a warning with error details  
**And** returns null to indicate failure  
**And** continues processing other stories without crashing

#### Scenario: Comments exceed token limits
**Given** 10 comments with very long text (>5000 characters total)  
**When** preparing for summarization  
**Then** the system truncates the combined comment text to 5000 characters  
**And** still generates a summary from the truncated text  
**And** logs a debug message about truncation

### Requirement: Summarization Prompt Engineering
The system SHALL use carefully crafted prompts to guide AI summary generation with enhanced detail.

#### Scenario: Prompt structure for comment summary
**Given** comments ready for summarization  
**When** constructing the API request  
**Then** the prompt includes:  
- Clear instruction to summarize in Chinese  
- Target length specification using `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH` (~300 characters)  
- Instruction to preserve technical terms, library names, tool names  
- Instruction to capture main viewpoints and consensus  
- Instruction to mention controversial opinions with different viewpoints and arguments  
- Instruction to include implementation details, performance data, or alternatives if discussed  
- Instruction for clear and accurate (not just concise) Chinese expression  
- The concatenated comment texts

#### Scenario: Use appropriate API parameters
**Given** requesting comment summarization  
**When** constructing API request  
**Then** the system uses temperature 0.5 for balanced output  
**And** uses the configured LLM model  
**And** reuses existing API key configuration

### Requirement: Batch Process Comment Summaries
The system SHALL summarize comments for multiple stories efficiently using consistent configuration.

#### Scenario: Summarize comments for 30 stories in batches
**Given** 30 stories with fetched comments  
**When** batch processing comment summaries  
**Then** the system processes summaries in batches of 10 stories  
**And** uses `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH` for target length  
**And** shows progress like "Processing batch 1/3: 10 stories | Provider: openrouter/deepseek-chat-v3-0324"  
**And** updates progress every 5 stories or on completion  
**And** returns array of summaries matching input order  
**And** preserves indices with empty strings for insufficient comments

#### Scenario: Handle mixed valid and empty comment arrays
**Given** 10 stories where 7 have comments and 3 don't  
**When** batch processing summaries  
**Then** the system skips stories with <3 comments  
**And** returns empty string for those stories  
**And** generates summaries for the 7 stories with sufficient comments  
**And** maintains correct story-to-summary mapping with preserved indices

#### Scenario: One summarization fails in batch
**Given** batch processing 10 stories where 1 summarization fails  
**When** the failure occurs  
**Then** the system logs a warning with detailed error information  
**And** returns empty string for that story  
**And** successfully generates summaries for the other 9 stories  
**And** does not halt batch processing

## REMOVED Requirements

None. All existing requirements are preserved with enhancements to support longer, more detailed summaries.

## ADDED Requirements

None. This change enhances existing requirements rather than adding new functionality.
