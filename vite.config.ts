import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [sveltekit()],
    server: {
        port: 8417
    },
    test: {
        include: ['src/**/*.test.ts'],
        globals: true,
        coverage: {
            reporter: 'lcov',
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.test.ts',
                'docs/**',
                'docs-new/**',
                'docs-old/**',
                '.trunk/**',
                '.svelte-kit/**',
                'tests/**',
                'src/routes/**'
            ]
        },
        reporters: ['verbose', ['junit', { outputFile: './junit-vitest.xml' }]]
    }
})
