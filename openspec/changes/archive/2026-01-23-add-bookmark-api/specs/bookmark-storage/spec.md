# bookmark-storage Specification Delta

## Overview
新增书签存储能力，支持通过 HTTP API 接收和存储来自 Chrome 插件的书签数据。

## ADDED Requirements

### Requirement: Bookmark Database Schema
The system SHALL store bookmarks in a `bookmarks` table with fields: id (primary key), url (unique), title, description, summary, summary_zh, created_at, and updated_at.

#### Scenario: Create bookmarks table
**Given** the database migration is applied  
**When** the system initializes  
**Then** the `bookmarks` table SHALL exist with all required columns  
**And** the `url` column SHALL have a UNIQUE constraint  

### Requirement: Bookmark Tags Storage
The system SHALL store bookmark tags in a separate `bookmark_tags` table with a foreign key reference to the bookmarks table.

#### Scenario: Store multiple tags for a bookmark
**Given** a bookmark with id 1 exists  
**When** tags ["tech", "ai", "programming"] are associated with the bookmark  
**Then** the system SHALL create 3 rows in `bookmark_tags` table  
**And** each row SHALL reference bookmark_id 1  

### Requirement: Bookmark Creation API
The system SHALL provide a POST endpoint at `/api/bookmarks` that accepts bookmark data and stores it in the database.

#### Scenario: Create bookmark successfully
**Given** a valid request with url, title, summary, summary_zh, and tags  
**When** POST /api/bookmarks is called  
**Then** the system SHALL return 201 Created  
**And** the response SHALL include the created bookmark with its id  

#### Scenario: Create bookmark with duplicate URL
**Given** a bookmark with url "https://example.com" already exists  
**When** POST /api/bookmarks is called with the same url  
**Then** the system SHALL return 409 Conflict  
**And** the response SHALL include the existing bookmark id  

### Requirement: Request Validation
The system SHALL validate all incoming bookmark creation requests and return appropriate error responses for invalid data.

#### Scenario: Missing required field
**Given** a request body missing the required "url" field  
**When** POST /api/bookmarks is called  
**Then** the system SHALL return 400 Bad Request  
**And** the error response SHALL specify "url is required"  

#### Scenario: Invalid URL format
**Given** a request body with url "not-a-valid-url"  
**When** POST /api/bookmarks is called  
**Then** the system SHALL return 400 Bad Request  
**And** the error response SHALL specify "url must be a valid URL"  

### Requirement: CORS Support
The system SHALL support CORS to allow cross-origin requests from Chrome extensions.

#### Scenario: Handle CORS preflight
**Given** an OPTIONS request to /api/bookmarks  
**When** the request is received  
**Then** the system SHALL return 204 No Content  
**And** the response SHALL include Access-Control-Allow-Origin header  
**And** the response SHALL include Access-Control-Allow-Methods header  

#### Scenario: Include CORS headers in response
**Given** a POST request to /api/bookmarks  
**When** the request is processed  
**Then** the response SHALL include Access-Control-Allow-Origin header  

#### Scenario: Include CORS headers in GET response
**Given** a GET request to /api/bookmarks  
**When** the request is processed  
**Then** the response SHALL include Access-Control-Allow-Origin header  

### Requirement: Atomic Bookmark and Tags Insertion
The system SHALL use database batch operations to atomically insert both the bookmark record and its associated tags.

#### Scenario: Rollback on tag insertion failure
**Given** a valid bookmark creation request with tags  
**When** the bookmark is inserted successfully but tag insertion fails  
**Then** the system SHALL rollback the entire operation  
**And** no partial data SHALL remain in the database  

### Requirement: Bookmark Query API
The system SHALL provide a GET endpoint at `/api/bookmarks` that accepts a url query parameter and returns the matching bookmark with its tags.

#### Scenario: Query bookmark by URL successfully
**Given** a bookmark with url "https://example.com/article" exists in the database  
**When** GET /api/bookmarks?url=https://example.com/article is called  
**Then** the system SHALL return 200 OK  
**And** the response SHALL include the bookmark data with all fields  
**And** the response SHALL include the tags array  

#### Scenario: Query non-existent bookmark
**Given** no bookmark exists for url "https://example.com/not-found"  
**When** GET /api/bookmarks?url=https://example.com/not-found is called  
**Then** the system SHALL return 404 Not Found  
**And** the error response SHALL include code "NOT_FOUND"  

#### Scenario: Query without url parameter
**Given** a GET request to /api/bookmarks without url parameter  
**When** the request is received  
**Then** the system SHALL return 400 Bad Request  
**And** the error response SHALL specify "url query parameter is required"  
