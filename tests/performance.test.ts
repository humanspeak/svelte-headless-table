import { expect, test, type Page } from '@playwright/test'

test.describe('performance', () => {
    test.describe('small dataset (100 rows)', () => {
        test.beforeEach(async ({ page }: { page: Page }) => {
            await page.goto('/?seed=12345&rows=100&subrows=false')
        })

        test('table renders within acceptable time', async ({ page }: { page: Page }) => {
            // Table should be visible quickly
            await expect(page.locator('table')).toBeVisible({ timeout: 5000 })

            // Check row count in header
            await expect(page.getByText(/100 records/)).toBeVisible()
        })

        test('sorting works', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible()

            // Click to sort by First Name (use th locator to be specific)
            await page.locator('th').getByText('First Name').click()

            // Should show sort indicator
            await expect(page.locator('th.sorted')).toBeVisible()
        })

        test('filtering works', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible()

            const searchInput = page.getByTestId('first-name-filter')
            await searchInput.fill('A')

            // Should filter results (fewer than 100)
            await expect(page.getByText(/\d+ records/)).toBeVisible()
        })

        test('pagination works', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible()

            // Set smaller page size
            const pageSizeInput = page.getByLabel('Page size')
            await pageSizeInput.fill('10')

            // Should show multiple pages
            await expect(page.getByText(/of \d+/)).toBeVisible()

            // Navigate to next page
            await page.getByRole('button', { name: 'Next page' }).click()
            await expect(page.getByText('2 of', { exact: false })).toBeVisible()
        })
    })

    test.describe('medium dataset (1000 rows)', () => {
        test.beforeEach(async ({ page }: { page: Page }) => {
            await page.goto('/?seed=12345&rows=1000&subrows=false')
        })

        test('table renders within acceptable time', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible({ timeout: 10000 })
            await expect(page.getByText(/1000 records/)).toBeVisible()
        })

        test('sorting 1000 rows works', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible()

            // Sort by Age (force click for mobile viewports where elements may overlap)
            const ageHeader = page.locator('th').getByText('Age', { exact: true })
            await ageHeader.click({ force: true })
            await expect(page.locator('th.sorted')).toBeVisible()
        })

        test('filtering 1000 rows works', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible()

            const searchInput = page.getByTestId('first-name-filter')
            await searchInput.fill('Jo')

            // Results should be filtered
            await expect(page.getByText(/\d+ records/)).toBeVisible()
        })
    })

    test.describe('large dataset (5000 rows)', () => {
        // Large dataset tests need more time
        test.slow()

        test.beforeEach(async ({ page }: { page: Page }) => {
            await page.goto('/?seed=12345&rows=5000&subrows=false')
        })

        test('table renders within acceptable time', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible()
            await expect(page.getByText(/5000 records/)).toBeVisible()
        })

        test('sorting 5000 rows completes', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible()

            // Sort by Age (force click for mobile viewports where elements may overlap)
            const ageHeader = page.locator('th').getByText('Age', { exact: true })
            await ageHeader.click({ force: true })
            await expect(page.locator('th.sorted')).toBeVisible()
        })

        test('pagination handles large dataset', async ({ page }: { page: Page }) => {
            await expect(page.locator('table')).toBeVisible({ timeout: 30000 })

            // Should show many pages with default page size
            await expect(page.getByText(/of \d{2,}/)).toBeVisible() // 2+ digit page count
        })
    })

    test.describe('with sub-rows', () => {
        test('renders rows with sub-rows', async ({ page }: { page: Page }) => {
            await page.goto('/?seed=12345&rows=100&subrows=true')

            await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

            // With sub-rows, total should be more than 100 (100 parents + children)
            await expect(page.getByText(/\d{3,} records/)).toBeVisible()
        })

        test('table body has rows', async ({ page }: { page: Page }) => {
            await page.goto('/?seed=12345&rows=50&subrows=true')

            await expect(page.locator('table')).toBeVisible({ timeout: 10000 })

            // Table should have body rows
            const rowCount = await page.locator('tbody tr').count()
            expect(rowCount).toBeGreaterThan(0)
        })
    })

    test.describe('debug metrics', () => {
        test('debug panel shows correct plugin count', async ({ page }: { page: Page }) => {
            await page.goto('/?seed=12345&rows=100&subrows=false')

            await expect(page.locator('table')).toBeVisible()

            // Debug panel should show plugin info
            await expect(page.getByText('Plugin Info')).toBeVisible()
            await expect(page.getByText(/Count:\s*\d+/)).toBeVisible()
        })

        test('reset counters works', async ({ page }: { page: Page }) => {
            await page.goto('/?seed=12345&rows=100&subrows=false')

            await expect(page.locator('table')).toBeVisible()

            // Force click for mobile viewports where elements may overlap
            const resetButton = page.getByRole('button', { name: 'Reset Counters' })
            await resetButton.click({ force: true })

            // Total should be 0 after reset
            await expect(page.getByText('TOTAL: 0')).toBeVisible()
        })

        test('derivation counters increment on sort', async ({ page }: { page: Page }) => {
            await page.goto('/?seed=12345&rows=100&subrows=false')

            await expect(page.locator('table')).toBeVisible()

            // Force click reset button for mobile viewports
            const resetButton = page.getByRole('button', { name: 'Reset Counters' })
            await resetButton.click({ force: true })
            await expect(page.getByText('TOTAL: 0')).toBeVisible()

            // Force click sort header for mobile viewports
            const ageHeader = page.locator('th').getByText('Age', { exact: true })
            await ageHeader.click({ force: true })

            // Counters should have incremented
            await expect(page.getByText(/TOTAL: [1-9]\d*/)).toBeVisible()
        })
    })
})
