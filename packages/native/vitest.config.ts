import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'native',
		environment: 'jsdom',
		globals: true,
		include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'dist/',
				'**/*.test.ts',
				'**/*.test.tsx',
				'vitest.config.ts',
			],
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100,
			},
		},
	},
})
