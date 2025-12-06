# Design: Web UI Viewer

## Context

The HackerNews Daily CLI tool currently outputs fetched stories directly to the terminal in a card-based text format. Users want an alternative way to view stories through a web interface for better readability and navigation. The change must be backwards compatible and opt-in, meaning the CLI mode remains the default behavior.

**Key stakeholders:**
- End users who prefer visual interfaces over terminal output
- Developers maintaining the codebase (keeping complexity minimal)

**Constraints:**
- Must remain a local-only tool (no deployment infrastructure)
- Must work cross-platform (macOS, Linux, Windows)
- Should not significantly increase project complexity
- Must preserve existing CLI behavior as default

## Goals / Non-Goals

**Goals:**
- Provide web-based viewing mode as an opt-in feature via `--web` flag
- Use Vue.js for frontend as requested by user
- Keep UI simple and focused on content (no fancy interactions)
- Maintain fast startup time (server should start in <1 second)
- Automatically open browser when web mode is activated

**Non-Goals:**
- Real-time updates or story refresh (one-time fetch, like CLI)
- User authentication or multi-user support
- Persistent storage or database integration
- Complex state management (Vuex/Pinia)
- Routing or multi-page navigation
- Responsive mobile design optimization (desktop-focused is sufficient)
- Deployment to production environment

## Decisions

### Decision 1: Express.js for Web Server
**What:** Use Express.js as the web server framework.

**Why:**
- Lightweight and well-established in Node.js ecosystem
- Easy integration with existing TypeScript codebase
- Simple API endpoint creation
- Good cross-platform support

**Alternatives considered:**
- Built-in Node.js `http` module: More code, less convenience
- Fastify: Overkill for this simple use case
- Koa: Similar to Express, but Express has better TypeScript support

### Decision 2: Vue 3 with Composition API
**What:** Use Vue 3 with Composition API and single-file components (SFC).

**Why:**
- User specifically requested Vue.js
- Vue 3 Composition API is modern and concise
- Good TypeScript support
- Lightweight runtime (~34KB gzipped)
- No build complexity needed for simple app

**Alternatives considered:**
- React: Not requested by user
- Vanilla JavaScript: More code, less maintainability
- Vue 2: Older version, less future-proof

### Decision 3: Vite for Frontend Build
**What:** Use Vite as the build tool for Vue frontend.

**Why:**
- Official Vue recommendation
- Fast build times (esbuild-based)
- Simple configuration
- Built-in dev server for development

**Alternatives considered:**
- Webpack: Slower, more complex configuration
- Rollup: Manual setup required for Vue SFCs
- No build step: Vue 3 runtime compiler is larger

### Decision 4: In-Memory Data Storage
**What:** Store fetched stories in memory and pass directly from main CLI function to web server.

**Why:**
- Stories are fetched once per execution (same as CLI mode)
- No need for persistence between runs
- Simplest possible architecture
- Fast data access

**Alternatives considered:**
- SQLite database: Overkill, adds dependency
- JSON file: Unnecessary I/O, synchronization issues
- Redis: Requires external service

### Decision 5: Port Fallback Strategy
**What:** Default to port 3000, automatically try 3001, 3002, etc. if occupied.

**Why:**
- Port 3000 is conventional for Node.js dev servers
- Automatic fallback prevents "port in use" errors
- Informs user of actual port being used

**Implementation:**
```typescript
async function findAvailablePort(startPort: number): Promise<number> {
  // Try ports starting from startPort
  // Return first available port
}
```

### Decision 6: Single-Page Static View
**What:** No routing, no dynamic page updates - just a single page showing all stories at once.

**Why:**
- Matches CLI behavior (shows all stories once)
- Keeps Vue app simple
- No need for Vue Router
- Faster initial load

**Alternatives considered:**
- Pagination: Adds complexity, unnecessary for typical 20-30 stories
- Infinite scroll: Overkill for static data set
- Search/filter: Nice to have, but adds complexity

### Decision 7: CSS-Only Styling
**What:** Use plain CSS without UI frameworks (no Tailwind, Bootstrap, etc.).

**Why:**
- User requested "no fancy UI"
- Reduces bundle size
- Faster build times
- More control over exact appearance
- No learning curve for custom framework

**Alternatives considered:**
- Tailwind CSS: Too much for simple layout
- Bootstrap: Heavy, opinionated styling
- CSS-in-JS: Adds runtime overhead

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│  src/index.ts (Main Entry Point)           │
│  - Parses --web flag                        │
│  - Fetches & processes stories             │
│  - Chooses output mode                      │
└────┬────────────────────────────────────┬───┘
     │                                    │
     │ CLI Mode (default)                 │ Web Mode (--web)
     ▼                                    ▼
┌────────────────┐               ┌────────────────────┐
│  displayCards  │               │  src/server/app.ts │
│  (terminal)    │               │  - Express server  │
└────────────────┘               │  - /api/stories    │
                                 │  - Serve Vue app   │
                                 └─────────┬──────────┘
                                           │
                                           ▼
                                 ┌──────────────────────┐
                                 │  web/dist/           │
                                 │  (Vue.js SPA)        │
                                 │  - App.vue           │
                                 │  - StoryCard.vue     │
                                 │  - Fetch /api/stories│
                                 └──────────────────────┘
```

## Data Flow

1. User runs `npm run fetch -- --web`
2. `src/index.ts` detects `--web` flag
3. Stories fetched and processed (same as CLI)
4. Instead of `displayCards()`, calls `startWebServer(processedStories)`
5. Express server starts on available port
6. Browser auto-opens to `http://localhost:{port}`
7. Vue app loads and fetches `GET /api/stories`
8. Server returns `processedStories` as JSON
9. Vue renders StoryCard components
10. User views stories in browser

## API Contract

### GET /api/stories

**Response:** 200 OK
```json
[
  {
    "rank": 1,
    "titleChinese": "人工智能的未来展望",
    "titleEnglish": "The Future of Artificial Intelligence",
    "score": 342,
    "url": "https://example.com/article",
    "time": "2025-12-06 14:30",
    "description": "本文探讨了人工智能技术的最新发展...",
    "commentSummary": "社区讨论了 GPT-4 的性能..."
  }
]
```

**Error Response:** 500 Internal Server Error
```json
{
  "error": "Failed to fetch stories",
  "message": "Details..."
}
```

## Component Structure

```
web/
├── index.html              # Entry HTML file
├── src/
│   ├── main.ts             # Vue app initialization
│   ├── App.vue             # Main app component
│   │   ├── <script setup>  # Fetch stories, state management
│   │   ├── <template>      # Story list layout
│   │   └── <style>         # Global styles
│   └── components/
│       └── StoryCard.vue   # Individual story card
│           ├── props       # rank, titleChinese, etc.
│           └── template    # Card layout
├── vite.config.ts          # Vite configuration
└── package.json            # Frontend dependencies
```

## Styling Guidelines

**Layout:**
- Centered container with max-width: 900px
- Vertical card list with spacing
- Each card has subtle border/shadow

**Typography:**
- Chinese title: 18px, bold
- English title: 14px, gray
- Description: 14px, line-height 1.6
- Timestamp and URL: 12px, gray

**Colors:**
- Background: #f5f5f5 (light gray)
- Card: white
- Border: #e0e0e0
- Primary text: #333
- Secondary text: #666
- Link: #0066cc (blue)

**No animations, transitions, or hover effects** - keep it static and simple.

## Risks / Trade-offs

**Risk 1: Port conflicts**
- **Mitigation:** Automatic port fallback with user notification

**Risk 2: Browser auto-open may fail on some systems**
- **Mitigation:** Display URL in terminal so user can manually open

**Risk 3: Vue build adds complexity to project**
- **Mitigation:** Keep Vue app minimal, document build process clearly

**Risk 4: Performance with large story counts (>100)**
- **Mitigation:** Current limit of 30 stories is well within performance bounds; if needed, can add virtual scrolling later

**Trade-off:** Adding web dependencies increases package size
- **Accepted:** Web mode is opt-in, CLI users unaffected by slightly larger node_modules

## Migration Plan

**No migration needed** - this is a new additive feature with no breaking changes.

**Steps:**
1. Install new dependencies (express, vue, vite)
2. Create new directories and files (no existing code changes needed)
3. Modify `src/index.ts` to add flag parsing and conditional execution
4. Test both CLI and web modes independently
5. Update documentation

**Rollback:** Simply revert the commits and remove the `--web` flag - CLI behavior unchanged.

## Open Questions

None at this time. User requirements are clear, and technical approach is straightforward.
