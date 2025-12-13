# worker-source-abstraction Specification

## Purpose
TBD - created by archiving change refactor-worker-extensibility. Update Purpose after archive.
## Requirements
### Requirement: ContentSource Interface

The worker SHALL define a `ContentSource` interface that all content sources MUST implement.

#### Scenario: Interface definition

**Given** a content source implementation  
**When** the source is registered with the worker  
**THEN** the source MUST implement the `ContentSource` interface  
**And** the interface SHALL include a `name: string` property  
**And** the interface SHALL include a `fetchContent(date: Date, config: SourceConfig): Promise<SourceContent>` method

#### Scenario: Source content format

**Given** a content source fetches content  
**When** the `fetchContent()` method completes successfully  
**THEN** it SHALL return a `SourceContent` object  
**And** the object SHALL include a `markdown: string` property with generated Markdown content  
**And** the object SHALL include a `dateStr: string` property in YYYY-MM-DD format  
**And** the object SHALL include a `metadata: Record<string, any>` property for source-specific data

### Requirement: HackerNews Source Implementation

The worker SHALL provide a HackerNews content source implementation located at `src/worker/sources/hackernews.ts`.

#### Scenario: HackerNews source module location

**Given** the worker codebase  
**When** importing the HackerNews source  
**THEN** it SHALL be located at `src/worker/sources/hackernews.ts`  
**And** it SHALL export a class implementing `ContentSource` interface

#### Scenario: HackerNews source behavior

**Given** a HackerNews content source  
**When** `fetchContent()` is called with a date and configuration  
**THEN** it SHALL fetch stories from HackerNews API for that date  
**And** it SHALL apply AI content filtering if enabled in config  
**And** it SHALL fetch article content and generate summaries  
**And** it SHALL translate content to Chinese  
**And** it SHALL return formatted Markdown content

### Requirement: Source Directory Organization

The worker SHALL organize all content source implementations in a dedicated `src/worker/sources/` directory.

#### Scenario: Sources directory structure

**Given** the worker codebase  
**When** examining the directory structure  
**THEN** content sources SHALL be located in `src/worker/sources/`  
**And** the directory SHALL contain an `index.ts` file exporting the `ContentSource` interface  
**And** each source implementation SHALL be in its own file (e.g., `hackernews.ts`)

### Requirement: Source Configuration Schema

Each content source SHALL define its own configuration schema via TypeScript interfaces.

#### Scenario: Source-specific configuration

**Given** a content source implementation  
**When** the source is initialized  
**THEN** it SHALL accept a configuration object conforming to its schema  
**And** the configuration SHALL be passed to the `fetchContent()` method  
**And** the configuration SHALL include source-specific options (e.g., story limit, time window)

#### Scenario: HackerNews source configuration

**Given** the HackerNews content source  
**When** initializing the source  
**THEN** the configuration SHALL include `storyLimit: number`  
**And** the configuration SHALL include `summaryMaxLength: number`  
**And** the configuration SHALL include `enableContentFilter: boolean`  
**And** the configuration SHALL include `llmBatchSize: number`

