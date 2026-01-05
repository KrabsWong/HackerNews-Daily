# constants-config Specification Delta

## Overview

This delta adds the `CRAWLER_API_TOKEN` environment variable to support Bearer token authentication for private crawler services.

## ADDED Requirements

### Requirement: System SHALL provide crawler API token configuration

The system MUST provide an environment variable for storing the crawler API authentication token securely.

#### Scenario: Define CRAWLER_API_TOKEN environment variable

**Given** the Worker environment type definitions  
**When** configuring crawler authentication  
**Then** the system SHALL define `CRAWLER_API_TOKEN` as an optional string field  
**And** the field SHALL be marked as optional (may be undefined)  
**And** the field SHALL be documented as "Authentication token for crawler API"

#### Scenario: Position token field logically

**Given** `CRAWLER_API_TOKEN` is defined in `Env` interface  
**When** organizing environment variables  
**Then** the field SHALL be positioned after `CRAWLER_API_URL`  
**And** SHALL be grouped with other crawler-related configuration

### Requirement: Token SHALL be stored as Cloudflare secret

The authentication token MUST be stored securely as a Cloudflare Worker secret, never in code or configuration files.

#### Scenario: Document token as secret

**Given** `.dev.vars.example` file  
**When** documenting crawler configuration  
**Then** the file SHALL include `# CRAWLER_API_TOKEN=your_hf_token_here`  
**And** SHALL include comment explaining it's for authentication  
**And** SHALL note that it must be set via `wrangler secret put` in production

#### Scenario: Exclude token from wrangler.toml

**Given** `wrangler.toml` configuration  
**When** documenting secrets  
**Then** the system SHALL NOT store `CRAWLER_API_TOKEN` in wrangler.toml  
**And** SHALL document that it must be set as a secret  
**And** SHALL provide command: `npx wrangler secret put CRAWLER_API_TOKEN`

## MODIFIED Requirements

### Requirement: Documentation SHALL include crawler authentication setup

Environment variable documentation MUST include setup instructions for crawler API authentication.

#### Scenario: Update deployment documentation

**Given** deployment documentation in `docs/cloudflare-worker-deployment.md`  
**When** updating crawler configuration  
**Then** the documentation SHALL include section on setting `CRAWLER_API_TOKEN`  
**And** SHALL provide wrangler secret command  
**And** SHALL explain token is required for Hugging Face Spaces service

#### Scenario: Update configuration guide

**Given** configuration documentation in `docs/configuration.md`  
**When** documenting environment variables  
**Then** the guide SHALL document `CRAWLER_API_TOKEN`  
**And** SHALL explain purpose: "Bearer token for private crawler API authentication"  
**And** SHALL note security best practices (never commit to git)

## Related Changes

This delta affects:
- `src/types/worker.ts` - Add `CRAWLER_API_TOKEN` field to Env interface
- `.dev.vars.example` - Document token configuration
- `docs/cloudflare-worker-deployment.md` - Add secret setup instructions
- `docs/configuration.md` - Document environment variable
