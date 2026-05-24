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
 *     pnpm perf:bench                                               # 1 iteration, COLD + WARM
 *     pnpm perf:bench > scripts/perf-baseline.json                  # capture a baseline
 *     PERF_BENCH_URL=http://localhost:9000 pnpm perf:bench          # custom URL
 *     PERF_BENCH_ITERATIONS=100 PERF_BENCH_COLD_ONLY=1 pnpm perf:bench \
 *         > /tmp/before.json                                        # 100× cold-only for A/B
 *
 * Iteration mode reloads the page between iterations so each sample is
 * a fresh COLD measurement; aggregates emit mean/median/p95/stddev so
 * single-run jitter doesn't swamp the signal you're trying to see.
 *
 * Caveat: headless Chromium is not a DevTools session — absolute
 * numbers differ from a manual capture. The deltas between commits
 * stay valid, which is what we want.
 */

import { chromium } from '@playwright/test'

const URL = process.env.PERF_BENCH_URL ?? 'http://localhost:8417/test/perf-bench'
// Number('abc') -> NaN, and Math.max(1, NaN) -> NaN, which makes the
// iteration loop run zero times and emit an empty stats blob — a
// silent failure mode that's easy to miss when the bench is wired
// into CI. Parse strictly + fall back to 1.
const parsedIterations = Number.parseInt(process.env.PERF_BENCH_ITERATIONS ?? '1', 10)
const ITERATIONS = Number.isFinite(parsedIterations) && parsedIterations > 0 ? parsedIterations : 1
const COLD_ONLY = process.env.PERF_BENCH_COLD_ONLY === '1'

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
        // vm._debug.derivationTimings snapshot — per-derivation wall-clock
        // (ms). The first signal to consult when chasing render budget,
        // since `firstPaintMs` alone can't tell you which derivation ate
        // the time.
        timeTotalMs: num(grab('timeTotalMs')),
        timeTableAttrs: num(grab('timeTableAttrs')),
        timeVisibleColumns: num(grab('timeVisibleColumns')),
        timeColumnedRows: num(grab('timeColumnedRows')),
        timeInjectedRows: num(grab('timeInjectedRows')),
        timeInjectedPageRows: num(grab('timeInjectedPageRows')),
        timeHeaderRows: num(grab('timeHeaderRows')),
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

/**
 * Compute mean / median / p95 / stddev / min / max for a numeric array.
 * Used in iteration mode to aggregate N samples per scenario per metric
 * into a single comparable record. Returns null fields for empty input.
 */
function aggregate(values) {
    const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v))
    if (nums.length === 0) return { n: 0 }
    const sorted = [...nums].sort((a, b) => a - b)
    const sum = nums.reduce((a, b) => a + b, 0)
    const mean = sum / nums.length
    // True median: average the two middle values for even-n samples
    // (the default 100-iteration mode is even-n). Picking only the
    // upper-middle skews the reported number toward the higher half.
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    // Standard percentile-by-nearest-rank formula. The previous
    // `Math.ceil(0.95 * n) - 1` form collapsed to the max element
    // for small n (e.g. n=10 → index 9 = max); this form yields the
    // correct 9th element. For our default n=100 both agree.
    const p95 = sorted[Math.floor(0.95 * (sorted.length - 1))]
    const variance = nums.reduce((acc, v) => acc + (v - mean) ** 2, 0) / nums.length
    const stddev = Math.sqrt(variance)
    const round = (n) => Math.round(n * 100) / 100
    return {
        n: nums.length,
        mean: round(mean),
        median: round(median),
        p95: round(p95),
        stddev: round(stddev),
        min: round(sorted[0]),
        max: round(sorted[sorted.length - 1])
    }
}

/**
 * Folds N iterations of per-scenario sample objects into per-scenario
 * aggregate stats. For each scenario, walks every numeric metric key
 * and computes the stats record above. Non-numeric fields (e.g.
 * `scenario` name) are dropped from aggregates.
 */
function aggregateAll(iterations) {
    if (iterations.length === 0) return {}
    const out = {}
    const scenarioKeys = Object.keys(iterations[0])
    for (const sk of scenarioKeys) {
        const sampleArr = iterations.map((it) => it[sk]).filter((s) => s && typeof s === 'object')
        if (sampleArr.length === 0) continue
        const metricKeys = Object.keys(sampleArr[0])
        const stats = {}
        for (const mk of metricKeys) {
            if (typeof sampleArr[0][mk] !== 'number') continue
            stats[mk] = aggregate(sampleArr.map((s) => s[mk]))
        }
        out[sk] = { samples: sampleArr, stats }
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

    // Single-iteration mode preserves the original output shape ({cold, warm})
    // so existing tooling and the committed baseline file keep working.
    if (ITERATIONS === 1) {
        await page.goto(URL, { waitUntil: 'load' })
        await page.waitForSelector('[data-testid="perf-stats"]')
        await sleep(1000)
        const cold = await runAll('COLD', page)

        let warm = null
        if (!COLD_ONLY) {
            await page.reload({ waitUntil: 'load' })
            await page.waitForSelector('[data-testid="perf-stats"]')
            await sleep(1000)
            warm = await runAll('WARM', page)
        }

        await browser.close()
        const allResults = { cold, warm, capturedAt: new Date().toISOString(), url: URL }
        console.log('\n=== JSON ===')
        console.log(JSON.stringify(allResults, null, 2))
        return
    }

    // Iteration mode: collect N cold passes (and N warm passes if not
    // COLD_ONLY) by reloading between each. Each iteration is a fresh
    // COLD measurement.
    const coldIterations = []
    const warmIterations = []
    for (let i = 0; i < ITERATIONS; i++) {
        console.log(`\n### iteration ${i + 1}/${ITERATIONS} ###`)
        await page.goto(URL, { waitUntil: 'load' })
        await page.waitForSelector('[data-testid="perf-stats"]')
        await sleep(500)
        coldIterations.push(await runAll('COLD', page))

        if (!COLD_ONLY) {
            await page.reload({ waitUntil: 'load' })
            await page.waitForSelector('[data-testid="perf-stats"]')
            await sleep(500)
            warmIterations.push(await runAll('WARM', page))
        }
    }

    await browser.close()
    const result = {
        iterations: ITERATIONS,
        coldOnly: COLD_ONLY,
        url: URL,
        capturedAt: new Date().toISOString(),
        cold: aggregateAll(coldIterations),
        warm: COLD_ONLY ? null : aggregateAll(warmIterations)
    }
    console.log('\n=== JSON ===')
    console.log(JSON.stringify(result, null, 2))
})().catch((err) => {
    console.error(err)
    process.exit(1)
})
