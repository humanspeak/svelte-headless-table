import { sveltekit } from '@sveltejs/kit/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [sveltekit(), svelteTesting()],
    // Spread rather than `resolve: undefined` so the key is absent outside
    // Vitest (required by `exactOptionalPropertyTypes`).
    ...(process.env.VITEST ? { resolve: { conditions: ['browser'] } } : {}),
    build: {
        sourcemap: false
    },
    server: {
        port: 8417
    },
    test: {
        include: ['src/**/*.test.ts'],
        // PARKED by plan 002; restored by plan 003 (PARKED.md).
        exclude: ['**/node_modules/**', 'src/lib/plugins/_parked/**'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['vitest.setup.ts'],
        coverage: {
            reporter: ['lcov', 'text-summary'],
            provider: 'v8',
            include: ['src/**/*.ts'],
            // Floor just under the level measured on 2026-09-25 (87/79/87/87);
            // raise as coverage improves, never lower to make a PR pass.
            thresholds: {
                statements: 85,
                branches: 77,
                functions: 85,
                lines: 85
            },
            exclude: [
                'src/**/*.test.ts',
                'docs/**',
                'docs-new/**',
                'docs-old/**',
                'scripts/**',
                '.trunk/**',
                '.svelte-kit/**',
                'tests/**',
                'src/routes/**',
                // PARKED by plan 002; restored by plan 003 (PARKED.md).
                'src/lib/plugins/_parked/**'
            ]
        },
        reporters: ['verbose', ['junit', { outputFile: './junit-vitest.xml' }]]
    }
})
