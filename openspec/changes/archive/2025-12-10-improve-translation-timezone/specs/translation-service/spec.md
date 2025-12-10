# Translation Service Specification Delta

## Overview
Enhance translation service to preserve technical terms, acronyms, and proper nouns during Chinese translation while maintaining accurate translation of natural language content.

## ADDED Requirements

### Requirement: Preserve Technical Terms in Translation
The system SHALL preserve common technical terms, acronyms, and proper nouns in their original form or standard Chinese abbreviations during translation.

#### Scenario: Translate title with technical terms
**Given** a title "Donating the Model Context Protocol and establishing the Agentic AI Foundation"  
**When** translating to Chinese  
**Then** technical terms like "Model Context Protocol" are preserved or abbreviated as "MCP" or "MCP协议"  
**And** natural language portions are translated to Chinese  
**And** the result maintains readability for technical audiences

#### Scenario: Preserve programming language names
**Given** a title containing "TypeScript", "Python", "Rust", or other programming language names  
**When** translating to Chinese  
**Then** the programming language names are preserved in English  
**And** surrounding text is translated to Chinese

#### Scenario: Preserve company and product names
**Given** a title containing "AWS", "Google", "OpenAI", "GitHub" or similar well-known names  
**When** translating to Chinese  
**Then** company and product names are preserved in English  
**And** surrounding text is translated to Chinese

#### Scenario: Preserve common technical acronyms
**Given** a title containing common acronyms like "API", "HTTP", "AI", "ML", "GPU"  
**When** translating to Chinese  
**Then** the acronyms are preserved in uppercase English  
**And** surrounding text is translated to Chinese

#### Scenario: Instruction to LLM for term preservation
**Given** translation request is sent to DeepSeek API  
**When** constructing the prompt  
**Then** the prompt SHALL include explicit instructions to preserve technical terms  
**And** provide examples of terms to preserve (programming languages, cloud services, technical acronyms)  
**And** request standard Chinese abbreviations where appropriate (e.g., "MCP协议" for "Model Context Protocol")

## MODIFIED Requirements

### Requirement: Translate Titles to Chinese
The system SHALL translate story titles from English to Chinese using DeepSeek LLM while preserving technical terminology.

#### Scenario: Successful translation with term preservation
**Given** a valid English title and configured API key  
**When** requesting translation  
**Then** the system sends a request to DeepSeek API with enhanced prompt including term preservation instructions  
**And** returns the Chinese translation with technical terms preserved  
**And** ensures natural language portions are accurately translated

#### Scenario: Translation API fails
**Given** the DeepSeek API returns an error or times out  
**When** requesting translation  
**Then** the system logs a warning  
**And** returns the original English title as fallback
