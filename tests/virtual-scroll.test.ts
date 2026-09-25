import { expect, test } from '@playwright/test'

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } })

// At least one 1K page has loaded on top of the 10K base. While the thumb is
// held at the bottom, Chromium may keep scrollTop pinned to the growing max,
// which re-triggers loadMore as soon as the previous append settles; the
// exact "11,000" reading can then be visible for only a few hundred ms.
const atLeastOneLoad = /^1[1-9],000$/

for (const holdDuringLoad of [false, true]) {
    test(`fast scrollbar drag from 10K retains position while loading 1K (${holdDuringLoad ? 'hold' : 'release'} thumb)`, async ({
        page,
        browserName,
        isMobile
    }, testInfo) => {
        test.skip(browserName !== 'chromium' || isMobile, 'Uses a desktop Chromium scrollbar')
        await page.goto('/virtual-scroll')
        const container = page.locator('.table-container')
        const totalRows = page
            .locator('.stat')
            .filter({ hasText: 'Total Rows:' })
            .locator('.stat-value')
        await expect(totalRows).toHaveText('1,000')
        await expect(container.locator('tr[data-row-id]').first()).toBeVisible()
        await page.getByRole('button', { name: '10K', exact: true }).click()
        await expect(totalRows).toHaveText('10,000')

        // Give the native scrollbar a predictable hit target, including in headless Chromium.
        await page.addStyleTag({
            content: `
        .table-container::-webkit-scrollbar { width: 16px; }
        .table-container::-webkit-scrollbar-thumb { background: #888; min-height: 20px; }
        .table-container::-webkit-scrollbar-track { background: #eee; }
        .table-container::-webkit-scrollbar-button { display: none; }
    `
        })
        await container.scrollIntoViewIfNeeded()
        const geometry = await container.evaluate((node) => {
            const rect = node.getBoundingClientRect()
            return {
                x: rect.right - 8,
                top: rect.top + node.clientTop + 10,
                bottom: rect.top + node.clientTop + node.clientHeight - 10,
                maxScroll: node.scrollHeight - node.clientHeight
            }
        })
        expect(geometry.maxScroll).toBeGreaterThan(10000)
        await page.mouse.move(geometry.x, geometry.top)
        await page.mouse.down()
        const [samples] = await Promise.all([
            container.evaluate(async (node) => {
                const samples: { scrollTop: number; firstRow: string | null }[] = []
                const deadline = performance.now() + 1500
                // Sample every rendered frame so a transient jump cannot pass by recovering later.
                while (performance.now() < deadline) {
                    await new Promise(requestAnimationFrame)
                    samples.push({
                        scrollTop: node.scrollTop,
                        firstRow:
                            node.querySelector('tr[data-row-id]')?.getAttribute('data-row-id') ??
                            null
                    })
                }
                return samples
            }),
            (async () => {
                // One move reproduces grabbing the thumb and pulling straight to the bottom.
                await page.mouse.move(geometry.x, geometry.bottom, { steps: 1 })
                if (holdDuringLoad) {
                    await expect(totalRows).toHaveText(atLeastOneLoad)
                }
                await page.mouse.up()
            })()
        ])
        await testInfo.attach('scroll-samples', {
            body: JSON.stringify({ geometry, samples }, null, 2),
            contentType: 'application/json'
        })
        const bottomReached = samples.findIndex(
            (sample) => sample.scrollTop >= geometry.maxScroll * 0.8
        )
        expect(
            bottomReached,
            'The native scrollbar drag must reach the lower part of the table'
        ).toBeGreaterThanOrEqual(0)
        await expect(totalRows).toHaveText(atLeastOneLoad)
        // Appending rows may change thumb size, but must not throw the viewport back to the top.
        expect(
            Math.min(...samples.slice(bottomReached).map((sample) => sample.scrollTop)),
            'Scroll position must stay near the previous bottom during and after loading'
        ).toBeGreaterThan(geometry.maxScroll * 0.75)
    })
}
