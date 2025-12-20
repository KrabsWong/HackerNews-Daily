import { defineConfig } from 'vitest/config';

/**
 * Vitest Coverage Configuration
 * 
 * This configuration is used for measuring actual test coverage metrics.
 * It uses realistic thresholds based on current coverage levels.
 * 
 * PHASED IMPROVEMENT PLAN:
 * - Phase 0 (Current): 55% lines/statements, 62% functions, 84% branches
 * - Phase 1 (Target):  70% lines/statements, 75% functions, 85% branches
 * - Phase 2 (Target):  80% lines/statements, 80% functions, 85% branches
 * 
 * These thresholds reflect the actual achievable coverage given:
 * - Cloudflare Workers runtime constraints
 * - External API dependencies (GitHub, HackerNews)
 * - LLM provider integration complexity
 * 
 * See openspec/project.md for detailed coverage strategy and module-specific targets.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'src/__tests__/**',
        '**/types/**',
        'esbuild.worker.config.js',
        'vitest.config.ts',
        'vitest.coverage.config.ts',
        'wrangler.toml',
      ],
      all: true,
      // Phase 0 thresholds - reflecting current baseline
      // DO NOT lower these values; only increase as coverage improves
      thresholds: {
        lines: 55,       // Current: 55% (Target Phase 1: 70%, Phase 2: 80%)
        functions: 62,   // Current: 62% (Target Phase 1: 75%, Phase 2: 80%)
        branches: 84,    // Current: 84% (Target Phase 1: 85%, Phase 2: 85%)
        statements: 55,  // Current: 55% (Target Phase 1: 70%, Phase 2: 80%)
      },
    },
  },
});
