/**
 * Headless-Chromium runner for the table perf-bench fixture
 * (`src/routes/test/perf-bench/+page.svelte`).
 *
 * Drives each preset twice — COLD (first navigation) and WARM (after
 * reload) — and dumps a JSON blob of the page's stats line so each
 * commit can be attributed to a specific before/after delta.
 *
 * Usage:
 *     pnpm dev                                                      # in another shell
 *     pnpm perf:bench                                               # against http://localhost:8417
 *     pnpm perf:bench > scripts/perf-baseline.json                  # capture a baseline
 *     PERF_BENCH_URL=http://localhost:9000 pnpm perf:bench          # custom URL
 *
 * Caveat: headless Chromium is not a DevTools session — absolute
 * numbers differ from a manual capture. The deltas between commits
 * stay valid, which is what we want.
 */

import { chromium } from '@playwright/test'

const URL = process.env.PERF_BENCH_URL ?? 'http://localhost:8417/test/perf-bench'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function readStats(page) {
    return await page.$eval('[data-testid="perf-stats"]', (el) =>
        el.textContent.replace(/\s+/g, ' ').trim()
    )
}

function parseStats(s) {
    const grab = (key) => {
        const m = s.match(new RegExp(`${key}=([^\\s·]+)`))
        return m ? m[1] : null
    }
    const num = (v) => (v == null ? null : Number.isNaN(Number(v)) ? v : Number(v))
    return {
        scenario: grab('scenario'),
        rows: num(grab('rows')),
        cols: num(grab('cols')),
        plugins: num(grab('plugins')),
        // Build-time decomposition: createTable -> createColumns -> createViewModel.
        // Surface the createViewModel cost separately so plugin-stack
        // regressions don't get masked by data-array setup.
        createTableMs: num(grab('createTableMs')),
        createColumnsMs: num(grab('createColumnsMs')),
        createViewModelMs: num(grab('createViewModelMs')),
        firstPaintMs: num(grab('firstPaintMs')),
        // Render-attribution column: firstPaintMs minus createViewModelMs.
        // Surfaces build-side wins that pure firstPaint would hide
        // when render dominates.
        renderOnlyMs: num(grab('renderOnlyMs')),
        domCells: num(grab('domCells')),
        rowsPerSec: num(grab('rowsPerSec')),
        cellsPerSec: num(grab('cellsPerSec')),
        // vm._debug.derivationCalls snapshot — the non-wall-clock signal
        // for each individual derivation in createViewModel.ts. A
        // regression in derivColumnedRows / derivInjectedRows is far
        // more attributable than a millisecond-level wall-clock drift.
        derivTotal: num(grab('derivTotal')),
        derivTableAttrs: num(grab('derivTableAttrs')),
        derivVisibleColumns: num(grab('derivVisibleColumns')),
        derivColumnedRows: num(grab('derivColumnedRows')),
        derivRows: num(grab('derivRows')),
        derivInjectedRows: num(grab('derivInjectedRows')),
        derivPageRows: num(grab('derivPageRows')),
        derivInjectedPageRows: num(grab('derivInjectedPageRows')),
        derivHeaderRows: num(grab('derivHeaderRows')),
        // Interaction phase (sort cycle, reorder, expand-all) — null
        // for cold-mount-only scenarios. interactionPaintMs is the
        // critical-path: how long the user waits for the change to
        // become visible.
        interactionMs: num(grab('interactionMs')),
        interactionPaintMs: num(grab('interactionPaintMs')),
        // Per-scenario observer snapshots: filtered to the scenario's
        // [start, end] window, not the rolling-10s aggregate below.
        scenarioLongestTaskMs: num(grab('scenarioLongestTaskMs')),
        scenarioMutations: num(grab('scenarioMutations')),
        scenarioLoafScriptMaxMs: num(grab('scenarioLoafScriptMaxMs')),
        // Rolling-10s window (verbatim from svelte-markdown perf-bench).
        longestTaskMs: grab('longestTaskMs'),
        longTasks10s: grab('longTasks10s'),
        rafP95Ms: num(grab('rafP95Ms')),
        mutations10s: num(grab('mutations10s')),
        loaf10s: grab('loaf10s'),
        loafScriptMaxMs: grab('loafScriptMaxMs'),
        heapAllocKbPerSec: grab('heapAllocKbPerSec')
    }
}

/**
 * Waits for the page's `scenario` field to flip to `${testId}-done`,
 * meaning the in-page scenario function returned and the stats line is
 * fully populated.
 */
async function waitForScenarioDone(page, testId, timeoutMs) {
    await page.waitForFunction(
        (id) => {
            const el = document.querySelector('[data-testid="perf-stats"]')
            return !!el && el.textContent.includes(`scenario=${id}-done`)
        },
        testId,
        { timeout: timeoutMs }
    )
}

async function runTableScenario(page, testId, { timeout = 60_000 } = {}) {
    await page.locator('[data-testid="clear"]').click({ timeout })
    // Give the page a beat to drop the previous scenario's mounted DOM
    // before we click the next preset — otherwise the click can wait
    // behind a long-running unmount task and time out.
    await sleep(500)
    await page.locator(`[data-testid="${testId}"]`).click({ timeout })
    await waitForScenarioDone(page, testId, timeout)
    // Allow the 250ms rolling-window refresh tick to fire at least once
    // so observer-derived fields (longestTaskMs, mutations10s, …) are
    // reflected in the scrape. Per-scenario fields are already final.
    await sleep(400)
    return parseStats(await readStats(page))
}

async function runAll(label, page) {
    console.log(`\n=== ${label} run ===`)
    const out = {}

    const scenarios = [
        ['rows1k', 'rows-1k', { timeout: 30_000 }],
        ['rows10k', 'rows-10k', { timeout: 120_000 }],
        // columns-50 hits the getColumnedBodyRows O(rows × cols²)
        // hot path — slowest cold-mount scenario by a wide margin.
        ['columns50', 'columns-50', { timeout: 180_000 }],
        ['columnReorder1k', 'column-reorder-1k', { timeout: 60_000 }],
        ['groupBy1k', 'group-by-1k', { timeout: 60_000 }],
        ['sortCycle1k', 'sort-cycle-1k', { timeout: 60_000 }],
        ['subrowsTree1k', 'subrows-tree-1k', { timeout: 60_000 }],
        ['kitchenSink1k', 'kitchen-sink-1k', { timeout: 60_000 }]
    ]

    for (const [key, testId, opts] of scenarios) {
        console.log(`  → ${testId}…`)
        out[key] = await runTableScenario(page, testId, opts)
        console.log('   ', JSON.stringify(out[key]))
    }

    return out
}

;(async () => {
    const browser = await chromium.launch({
        headless: true,
        // Needed for the perf-bench fixture's heap-delta metric.
        // performance.memory.usedJSHeapSize is quantized to ~100KB without
        // this flag, which rounds most per-rAF deltas to 0.
        args: ['--enable-precise-memory-info']
    })
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()

    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('  [browser error]', msg.text())
    })
    page.on('pageerror', (err) => console.log('  [page error]', err.message))

    await page.goto(URL, { waitUntil: 'load' })
    await page.waitForSelector('[data-testid="perf-stats"]')
    await sleep(1000)
    const cold = await runAll('COLD', page)

    await page.reload({ waitUntil: 'load' })
    await page.waitForSelector('[data-testid="perf-stats"]')
    await sleep(1000)
    const warm = await runAll('WARM', page)

    await browser.close()

    const allResults = { cold, warm, capturedAt: new Date().toISOString(), url: URL }
    console.log('\n=== JSON ===')
    console.log(JSON.stringify(allResults, null, 2))
})().catch((err) => {
    console.error(err)
    process.exit(1)
})
