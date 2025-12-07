# translation-service-ext Specification

## Purpose
Specification for translation-service-ext functionality.

## Requirements

### Requirement: Translate Multiple Content Types
The system SHALL translate both titles and descriptions while maintaining order consistency.

#### Scenario: Translate descriptions alongside titles
**Given** multiple story titles and corresponding descriptions  
**When** requesting batch translation  
**Then** the system translates all titles first  
**And** translates all descriptions that are not null  
**And** maintains order consistency with input arrays

#### Scenario: Handle null or empty descriptions
**Given** a description that is null or empty string  
**When** processing translations  
**Then** the system skips translation for that description  
**And** returns null or empty without making API call  
**And** continues with remaining descriptions

#### Scenario: Differentiate title and description translation prompts
**Given** a description to translate  
**When** sending to DeepSeek API  
**Then** the system uses prompt: "Translate this article description to Chinese. Only output the translation: {description}"  
**And** uses same temperature and model settings as title translation

### Requirement: Progress Indication for Extended Translation
The system SHALL provide clear progress updates when translating both titles and descriptions.

#### Scenario: Show combined translation progress
**Given** 20 titles and 20 descriptions to translate  
**When** processing translations  
**Then** the system displays progress like "Translating titles... (10/20)"  
**And** displays "Translating descriptions... (5/20)"  
**And** updates progress every 5 items or at completion

### Requirement: Handle Translation Failures Gracefully
The system SHALL handle description translation failures without affecting title translations.

#### Scenario: Description translation fails but title succeeds
**Given** a story with successful title translation but failed description translation  
**When** processing the story  
**Then** the system uses the translated title  
**And** returns null for description  
**And** allows the system to display "暂无描述" as fallback  
**And** continues processing remaining stories

#### Scenario: Rate limiting during description translation
**Given** rate limit is hit during description translation  
**When** the error occurs  
**Then** the system retries after delay (consistent with existing retry logic)  
**And** logs warning about rate limiting  
**And** continues with fallback if retry fails

## ADDED Requirements

### Requirement: Optimize API Usage for Descriptions
The system SHALL optimize translation API calls to minimize costs and latency.

#### Scenario: Skip translation for already-Chinese descriptions
**Given** a description containing primarily Chinese characters  
**When** checking if translation is needed  
**Then** the system detects Chinese content using regex `/[一-龥]/`  
**And** skips the API call  
**And** returns the original description

#### Scenario: Skip translation for very short descriptions
**Given** a description with fewer than 10 characters  
**When** checking if translation is needed  
**Then** the system may optionally skip translation  
**And** returns the original text  
**And** reduces unnecessary API costs

#### Scenario: Truncate overly long descriptions
**Given** a description exceeding 500 characters  
**When** preparing for translation  
**Then** the system truncates to 500 characters  
**And** appends "..." to indicate truncation  
**And** translates the truncated version  
**And** prevents excessive token usage
