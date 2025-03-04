import { expect, test, type Page } from '@playwright/test'

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

    test('filtering functionality works', async ({ page }: { page: Page }) => {
        // Test search input
        const searchInput = page.getByTestId('first-name-filter')
        await searchInput.fill('Toby')

        // Verify filtered results
        await expect(page.getByText('Toby Deckow')).toBeVisible()
        await expect(page.getByText('Mike Hansen')).not.toBeVisible()

        // Clear search
        await searchInput.fill('')
        await expect(page.getByText('Mike Hansen')).toBeVisible()
    })
})
