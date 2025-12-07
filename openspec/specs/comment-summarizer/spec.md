# comment-summarizer Specification

## Purpose
Specification for comment-summarizer functionality.

## Requirements

### Requirement: Generate AI Summary of Comments
The system SHALL use DeepSeek API to generate concise Chinese summaries of HackerNews comments.

**Related to:** comment-fetcher (consumes fetched comments)

#### Scenario: Summarize 10 comments successfully
**Given** 10 valid comments from a technical discussion  
**And** comments contain technical terms like "React", "TypeScript", "performance"  
**When** generating comment summary  
**Then** the system sends comments to DeepSeek API with summarization prompt  
**And** specifies target length (~100 characters)  
**And** instructs to preserve technical terms  
**And** receives a Chinese summary of key discussion points  
**And** summary is approximately 80-120 characters long

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
**And** mentions if there's consensus or controversy  
**And** remains neutral and balanced

#### Scenario: Too few comments to summarize
**Given** a story has only 2 valid comments  
**When** attempting to generate summary  
**Then** the system returns null (not enough for meaningful summary)  
**And** the story will not display a comment line

#### Scenario: AI summarization fails
**Given** DeepSeek API returns an error or times out  
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
The system SHALL use carefully crafted prompts to guide AI summary generation.

#### Scenario: Prompt structure for comment summary
**Given** comments ready for summarization  
**When** constructing the API request  
**Then** the prompt includes:  
- Clear instruction to summarize in Chinese  
- Target length specification (~100 characters)  
- Instruction to preserve technical terms, library names, tool names  
- Instruction to capture main viewpoints and consensus  
- Instruction to mention controversial opinions if present  
- The concatenated comment texts

#### Scenario: Use appropriate API parameters
**Given** requesting comment summarization  
**When** constructing API request  
**Then** the system uses temperature 0.5 for balanced output  
**And** uses the same DeepSeek model as other translations  
**And** reuses existing API key configuration

### Requirement: Batch Process Comment Summaries
The system SHALL summarize comments for multiple stories efficiently.

#### Scenario: Summarize comments for 30 stories sequentially
**Given** 30 stories with fetched comments  
**When** batch processing comment summaries  
**Then** the system processes summaries sequentially (respects rate limits)  
**And** shows progress like "Summarized 5/30 comment threads..."  
**And** updates progress every 5 stories or on completion  
**And** returns array of summaries matching input order

#### Scenario: Handle mixed valid and empty comment arrays
**Given** 10 stories where 7 have comments and 3 don't  
**When** batch processing summaries  
**Then** the system skips stories with <3 comments  
**And** returns null for those stories  
**And** generates summaries for the 7 stories with sufficient comments  
**And** maintains correct story-to-summary mapping

#### Scenario: One summarization fails in batch
**Given** batch processing 10 stories where 1 summarization fails  
**When** the failure occurs  
**Then** the system logs a warning  
**And** returns null for that story  
**And** successfully generates summaries for the other 9 stories  
**And** does not halt batch processing

### Requirement: Display Comment Summary in Output
The system SHALL display comment summaries in the story card format when available.

#### Scenario: Display story with comment summary
**Given** a story has a valid comment summary  
**When** rendering the story card  
**Then** the system displays comment summary on a new line  
**And** labels it with "评论要点："  
**And** shows the summary text after the label  
**And** places it after the article description and before the separator

#### Scenario: Display story without comment summary
**Given** a story has no comment summary (null)  
**When** rendering the story card  
**Then** the system does not display a comment line  
**And** proceeds directly from description to separator  
**And** maintains consistent spacing

#### Scenario: Enhanced story card format
**Given** a complete story with all fields including comment summary  
**When** displaying the card  
**Then** the format is:  
```
#1 【中文标题】
English Title
发布时间：YYYY-MM-DD HH:mm
链接：https://...
描述：文章摘要...
评论要点：评论总结...
━━━━━━━━━━━━━━━━━━
```

### Requirement: Progress Indicators for Comment Processing
The system SHALL provide clear feedback during comment summarization.

#### Scenario: Show summarization progress
**Given** comment summarization is in progress  
**When** processing comment summaries  
**Then** the system displays "Summarizing comments..." message  
**And** shows progress like "Summarized 5/30 comment threads..."  
**And** updates every 5 stories or on completion

#### Scenario: Indicate skip reasons
**Given** a story is skipped because it has <3 comments  
**When** processing that story  
**Then** the system logs a debug message indicating insufficient comments  
**And** does not show this to the user in progress output  
**And** continues processing silently
