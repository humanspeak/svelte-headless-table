import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        include: ['src/**/*.test.ts'],
        globals: true,
        coverage: {
            reporter: 'lcov'
        },
        reporters: ['verbose', ['junit', { outputFile: './junit-vitest.xml' }]]
    }
})
