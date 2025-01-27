import { test, expect, type Page } from '@playwright/test'

test.describe('initial', () => {
    test.beforeEach(async ({ page }: { page: Page }) => {
        await page.goto('/?seed=12345')
    })

    test('loads table with initial data', async ({ page }: { page: Page }) => {
        // Check table headers are present
        await expect(page.getByText('Name (4 records, 4 in page)')).toBeVisible()
        await expect(page.getByText('Info (4 samples)')).toBeVisible()

        // Verify pagination shows correct values
        await expect(page.getByText('1 of 1')).toBeVisible()

        // Check some initial data is loaded
        await expect(page.getByText('Toby Deckow')).toBeVisible()
        await expect(page.getByText('Mike Hansen')).toBeVisible()

        // Verify page size input has default value
        const pageSizeInput = page.getByLabel('Page size')
        await expect(pageSizeInput).toHaveValue('20')
    })
})
