# worker-deployment-tooling Specification Delta

## Overview

This change modifies the build script integration to include a clean step before TypeScript compilation, preventing stale build artifacts from causing case-sensitivity issues during Wrangler deployment.

## MODIFIED Requirements

### Requirement: Build Script Integration
The project SHALL include npm scripts for building the Worker bundle using esbuild, with clean build support to prevent stale artifacts.

#### Scenario: Build Worker Bundle
**Given** the project has a `package.json` with scripts section  
**When** the developer runs `npm run build:worker`  
**Then** the system SHALL execute esbuild with the following configuration:  
  - Entry point: `src/worker/index.ts`  
  - Output: `dist/worker/index.js`  
  - Format: ES modules (`esm`)  
  - Target: `es2022`  
  - Minify: `true`  
  - Tree-shaking: `true`  
**And** the system SHALL output bundle size statistics  
**And** the system SHALL fail with error if bundle exceeds 1MB  

#### Scenario: Watch Mode for Development
**Given** a developer is actively developing the Worker code  
**When** the developer runs `npm run build:worker:watch`  
**Then** the system SHALL run esbuild in watch mode  
**And** the system SHALL rebuild the bundle on any source file change  
**And** the system SHALL display rebuild time and bundle size after each build  

#### Scenario: Clean Build Output
**Given** the developer wants to ensure a fresh build  
**When** the developer runs `npm run clean:worker`  
**Then** the system SHALL delete the `dist/worker/` directory  
**And** the system SHALL log "Worker build artifacts cleaned" message  
**And** the subsequent build SHALL create output directory if missing  

#### Scenario: Clean TypeScript Build
**Given** the developer runs `npm run build`  
**When** the TypeScript compilation starts  
**Then** the system SHALL first remove the `dist/` directory to eliminate stale artifacts  
**And** the system SHALL then run `tsc` to compile all TypeScript files  
**And** the system SHALL prevent case-sensitivity warnings during deployment (e.g., `hackerNews.js` vs `hackernews/`)  

#### Scenario: Clean All Build Artifacts
**Given** the developer wants to remove all compiled output  
**When** the developer runs `npm run clean`  
**Then** the system SHALL delete the entire `dist/` directory  
**And** the system SHALL exit silently if the directory does not exist  
