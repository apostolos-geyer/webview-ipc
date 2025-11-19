import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use projects to let each package define its own environment
    projects: ['packages/*/vitest.config.ts'],

    // Global settings
    globals: true,

    // Coverage settings (applied globally across all projects)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts', '**/*.test.tsx', '**/*.config.ts', 'example/'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
})
