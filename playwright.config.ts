import { defineConfig, devices } from '@playwright/test'

// Support passing --project via package runner that injects a standalone "--"
// Example: pnpm run test:e2e -- --project=firefox
const argProjects = process.argv
    .filter((arg) => arg.startsWith('--project='))
    .flatMap((arg) => arg.slice('--project='.length).split(','))

// Local runs can move the preview server off 4173 when another project already
// owns it (`PLAYWRIGHT_PORT=4180 pnpm test:e2e`). With `reuseExistingServer`
// on, a foreign server on the default port would otherwise answer every
// request with a 404 and fail the whole suite.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)

export default defineConfig({
    testDir: './tests',
    // Produce artifacts that are easy to collect in CI
    // Written into test-results/ so CI's trunk analytics uploader and the
    // playwright-results artifact both find it (junit-paths in npm-publish.yml)
    reporter: [
        ['junit', { outputFile: 'test-results/junit-playwright.xml' }],
        ['html', { open: 'never' }]
    ],
    webServer: {
        command: `npm run build && npm run preview -- --port ${port} --strictPort`,
        port,
        timeout: 120000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe'
    },
    use: {
        baseURL: `http://localhost:${port}`,
        trace: 'on-first-retry'
    },
    // Lower the default per-test timeout to speed up failures in CI
    timeout: 30000,
    // Increase expect timeout for slower CI environments
    expect: {
        timeout: 10000
    },
    // Limit parallelism to reduce flakiness from resource contention
    // Table tests with large datasets are resource-intensive
    // CI uses 1 worker for maximum determinism, local uses 2 for stability
    workers: process.env.CI ? 1 : 2,
    // Don't run tests within the same file in parallel
    fullyParallel: false,
    // Make CI a bit more forgiving for transient issues
    retries: process.env.CI ? 2 : 0,
    forbidOnly: !!process.env.CI,
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 6'] }
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 15'] }
        }
    ].filter((p) => (argProjects.length ? argProjects.includes(p.name) : true))
})
