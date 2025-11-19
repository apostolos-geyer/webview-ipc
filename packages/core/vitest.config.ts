import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'core',
		environment: 'node',
		globals: true,
		include: ['src/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'dist/',
				'**/*.test.ts',
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
