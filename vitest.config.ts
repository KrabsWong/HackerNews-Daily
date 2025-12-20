import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

/**
 * Vitest Configuration for Cloudflare Workers Testing
 * 
 * This is the PRIMARY configuration used for running tests with Cloudflare Workers runtime.
 * 
 * IMPORTANT: The 80% thresholds here represent ASPIRATIONAL GOALS, not current reality.
 * - These thresholds are intentionally set high to encourage quality coverage
 * - They may not be enforced in CI/CD pipelines yet
 * - For actual coverage metrics, see vitest.coverage.config.ts
 * 
 * COVERAGE THRESHOLD STRATEGY:
 * - 80% is a standard industry best practice for well-tested codebases
 * - This config serves as the "north star" target
 * - Actual enforcement uses vitest.coverage.config.ts with realistic thresholds
 * 
 * DUAL-CONFIG RATIONALE:
 * - This config: Cloudflare Workers pool + aspirational 80% thresholds
 * - vitest.coverage.config.ts: Node environment + realistic Phase 0 thresholds
 * 
 * TODO (Phase 2): Unify configs once 80% coverage is achieved
 * 
 * See openspec/project.md "Test Coverage Strategy" for full details.
 */
export default defineWorkersConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types/**',
        'esbuild.worker.config.js',
        'vitest.config.ts',
        'wrangler.toml',
      ],
      // ASPIRATIONAL GOALS - not yet enforced
      // See vitest.coverage.config.ts for current enforced thresholds
      thresholds: {
        lines: 80,       // Goal (Current: 55%)
        functions: 80,   // Goal (Current: 62%)
        branches: 80,    // Goal (Current: 84%) ✅ Nearly achieved
        statements: 80,  // Goal (Current: 55%)
      },
    },
    poolOptions: {
      workers: {
        wrangler: { configPath: './wrangler.toml' },
      },
    },
  },
});
