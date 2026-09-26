import { defineConfig, devices } from '@playwright/test'

// Smoke tests for the docs site. The dev server needs the generated
// github-stats.json, so the same fetch script the build runs is invoked first.
export default defineConfig({
    testDir: './tests',
    timeout: 30_000,
    reporter: [['list']],
    webServer: {
        command: 'npx tsx ./scripts/fetch-github-stats.ts && npx vite dev --port 8473',
        port: 8473,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000
    },
    use: {
        baseURL: 'http://localhost:8473',
        trace: 'on-first-retry'
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
})
