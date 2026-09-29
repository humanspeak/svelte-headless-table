import { expect, test, type Page } from '@playwright/test'

/**
 * A "rows N-M" footer built on `viewportRange` must name row 1 whenever the
 * table is scrolled to the top. It is derived from two DOM measurements, how
 * much of the viewport the header covers and where the rows begin, so each
 * case here moves one of them without the other.
 */

const FIXTURE = '/test/footer-range'
const STICKY = 'sticky=1&measureHeader=1'

const open = async (page: Page, query: string) => {
    await page.goto(`${FIXTURE}?${query}`)
    await expect(page.getByTestId('container').locator('tr[data-row-id]').first()).toBeVisible()
}

const scrollTo = (page: Page, top: number) =>
    page.getByTestId('container').evaluate((node, value) => {
        node.scrollTop = value
    }, top)

/** The first row the footer names, e.g. 1 for "rows 00001-00012". */
const firstRowNamed = async (page: Page) => {
    const text = await page.getByTestId('footer').innerText()
    return Number(/rows (\d+)-/.exec(text)?.[1])
}

/** The first row whose body shows below the header, read straight from the DOM. */
const firstRowOnScreen = (page: Page) =>
    page.getByTestId('container').evaluate((node) => {
        const top = Math.max(
            node.getBoundingClientRect().top + node.clientTop,
            node.querySelector('thead')?.getBoundingClientRect().bottom ?? 0
        )
        const row = [...node.querySelectorAll<HTMLElement>('tr[data-row-id]')].find(
            (candidate) => candidate.getBoundingClientRect().bottom > top + 0.01
        )
        return Number(row?.dataset.rowId) + 1
    })

for (const [name, distance] of [
    ['within the render buffer', 200],
    ['past the render buffer', 20_000]
] as const) {
    test(`names row 1 after scrolling ${name} and back to the top`, async ({ page }) => {
        await open(page, STICKY)
        await expect(page.getByTestId('footer')).toHaveText(/rows 00001-/)

        await scrollTo(page, distance)
        await expect(page.getByTestId('footer')).not.toHaveText(/rows 00001-/)
        await expect.poll(() => firstRowNamed(page)).toBe(await firstRowOnScreen(page))

        await scrollTo(page, 0)
        await expect(page.getByTestId('footer')).toHaveText(/rows 00001-/)
    })
}

test('names row 1 at the top after the header grows', async ({ page }) => {
    await open(page, STICKY)
    await expect(page.getByTestId('footer')).toHaveText(/rows 00001-/)
    const before = await page.getByTestId('footer').innerText()

    // Stands in for a filter row appearing: the rows move down but do not resize.
    await page.getByTestId('container').evaluate((node) => {
        for (const cell of node.querySelectorAll<HTMLElement>('th')) {
            cell.style.height = '76px'
        }
    })

    // Fewer rows fit, so the footer must change, and must still begin at row 1.
    await expect(page.getByTestId('footer')).not.toHaveText(before)
    await expect(page.getByTestId('footer')).toHaveText(/rows 00001-/)

    await scrollTo(page, 5000)
    await expect(page.getByTestId('footer')).not.toHaveText(/rows 00001-/)
    await expect.poll(() => firstRowNamed(page)).toBe(await firstRowOnScreen(page))
})

test('names row 1 at the top when rows are not measured', async ({ page }) => {
    await open(page, `${STICKY}&measureRows=0`)
    await expect(page.getByTestId('footer')).toHaveText(/rows 00001-/)

    await scrollTo(page, 5000)
    await expect(page.getByTestId('footer')).not.toHaveText(/rows 00001-/)
    await expect.poll(() => firstRowNamed(page)).toBe(await firstRowOnScreen(page))

    await scrollTo(page, 0)
    await expect(page.getByTestId('footer')).toHaveText(/rows 00001-/)
})

test('names row 1 at the top in a window that is not being rendered', async ({ page }) => {
    // A hidden window gets no rendering opportunities, so no ResizeObserver
    // callback is ever delivered.
    await page.addInitScript(() => {
        window.ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    })
    await open(page, `${STICKY}&measureRows=0`)
    await expect(page.getByTestId('footer')).toHaveText(/rows 00001-/)

    await scrollTo(page, 200)
    await expect(page.getByTestId('footer')).not.toHaveText(/rows 00001-/)

    await scrollTo(page, 0)
    await expect(page.getByTestId('footer')).toHaveText(/rows 00001-/)
})
