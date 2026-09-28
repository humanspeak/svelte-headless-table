import { expect, test } from '@playwright/test'

// A cold dev server regenerates `src/lib/demo-loaders.ts` while serving its
// first page and then triggers a full reload, which aborts whatever navigation
// is in flight. Render one page before the tests so that happens here.
test.beforeAll(async ({ request }) => {
    // The first server render compiles the whole docs shell.
    test.setTimeout(120_000)
    await expect(async () => {
        expect((await request.get('/docs/getting-started/quick-start')).ok()).toBe(true)
    }).toPass({ timeout: 100_000 })
})

// The quick-start demo is the first table most readers copy. It uses the
// runes-style `current.*` API, so a regression there would ship straight
// into user code.
test('quick-start demo renders the table through current.*', async ({ page }) => {
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
    await expect(page.getByText('row.current.attrs').first()).toBeVisible()
})

test('API pages document the first-party render primitives', async ({ page }) => {
    await page.goto('/docs/api/create-render')
    await expect(page.getByRole('heading', { name: /createSnippetRender/ })).toBeVisible()
    await expect(page.getByText('based on svelte-render')).toHaveCount(0)

    // v7 removed `.on()` / `eventHandlers`; handlers are ordinary props.
    await expect(page.getByRole('heading', { name: /\.on\(/ })).toHaveCount(0)
})

test('migration guide is reachable and lists the breaking changes', async ({ page }) => {
    await page.goto('/docs/guides/migrating-to-v7')
    await expect(page.getByRole('heading', { name: /Breaking changes/ })).toBeVisible()
    await expect(page.getByText('createTable(() =>').first()).toBeAttached()
})

test('pagination demo drives page index through .current', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(String(err)))

    await page.goto('/docs/plugins/add-pagination')
    // The demo has 100 rows and the default page size of 10.
    await expect(page.getByText('1 out of 10')).toBeVisible()
    // A click that lands before hydration does nothing, so retry until the
    // counter moves; the guard keeps a late retry from skipping a page.
    await expect(async () => {
        if (await page.getByText('1 out of 10').isVisible()) {
            await page.getByRole('button', { name: 'Next page' }).click()
        }
        await expect(page.getByText('2 out of 10')).toBeVisible({ timeout: 1000 })
    }).toPass()
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeEnabled()
    expect(errors).toEqual([])
})
