import { expect, test } from '@playwright/test'

// The quick-start demo is the first table most readers copy. It uses the
// fromStore idiom, so a regression there would ship straight into user code.
test('quick-start demo renders the table through fromStore', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))

    await page.goto('/docs/getting-started/quick-start')
    const demo = page.locator('table.demo').first()

    await expect(demo.locator('th[role="columnheader"]')).toHaveText(['Name', 'Age'])
    await expect(demo.locator('tbody tr[role="row"]')).toHaveCount(3)
    await expect(demo.locator('tbody td[role="cell"]')).toHaveText([
        'Ada Lovelace',
        '21',
        'Barbara Liskov',
        '52',
        'Richard Hamming',
        '38'
    ])
    expect(errors).toEqual([])
})

test('API pages document the first-party render primitives', async ({ page }) => {
    await page.goto('/docs/api/create-render')
    await expect(page.getByRole('heading', { name: /createSnippetRender/ })).toBeVisible()
    await expect(page.getByText('based on svelte-render')).toHaveCount(0)

    await page.goto('/docs/api/subscribe')
    await expect(page.getByRole('heading', { name: /fromStore/ })).toBeVisible()
})
