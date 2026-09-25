import { sveltekit } from '@sveltejs/kit/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [sveltekit(), svelteTesting()],
    resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
    build: {
        sourcemap: false
    },
    server: {
        port: 8417
    },
    test: {
        include: ['src/**/*.test.ts'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['vitest.setup.ts'],
        coverage: {
            reporter: ['lcov'],
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'docs/**',
                'docs-new/**',
                'docs-old/**',
                'scripts/**',
                '.trunk/**',
                '.svelte-kit/**',
                'tests/**',
                'src/routes/**'
            ]
        },
        reporters: ['verbose', ['junit', { outputFile: './junit-vitest.xml' }]]
    }
})
