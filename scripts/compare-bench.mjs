/**
 * Headless-Chromium runner for the cross-library compare bench
 * (`src/routes/test/compare-bench/+page.svelte`).
 *
 * Every sample is a fresh page load (a cold mount) of one library on one
 * scenario. Libraries alternate order on each iteration so drift (thermal,
 * background work) lands on both. Prints a Markdown table of medians and
 * p95s, then the raw aggregate as JSON.
 *
 * Measure a production build, not the dev server:
 *     pnpm build && pnpm preview --port 4173 --strictPort   # in another shell
 *     pnpm compare:bench
 *     COMPARE_BENCH_ITERATIONS=50 pnpm compare:bench
 *     COMPARE_BENCH_SCENARIOS=sort-10k,filter-10k pnpm compare:bench
 *
 * The run fails if the libraries render a different number of cells for
 * the same scenario: then they are not doing the same work.
 */

import { chromium } from '@playwright/test'

const BASE = process.env.COMPARE_BENCH_URL ?? 'http://localhost:4173/test/compare-bench'
const parsed = Number.parseInt(process.env.COMPARE_BENCH_ITERATIONS ?? '20', 10)
const ITERATIONS = Number.isFinite(parsed) && parsed > 0 ? parsed : 20
const LIBS = ['humanspeak', 'tanstack']
const SCENARIOS = (
    process.env.COMPARE_BENCH_SCENARIOS ?? 'mount-10k,mount-1k-all,sort-10k,filter-10k,page-10k'
).split(',')

const quantile = (values, q) => {
    const sorted = [...values].sort((a, b) => a - b)
    const pos = (sorted.length - 1) * q
    const lo = Math.floor(pos)
    const hi = Math.ceil(pos)
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

const sample = async (browser, lib, scenario) => {
    const page = await browser.newPage()
    try {
        await page.goto(`${BASE}?lib=${lib}&scenario=${scenario}`)
        await page.waitForFunction(
            () => document.querySelector('[data-testid="compare-stats"]')?.textContent?.trim(),
            undefined,
            { timeout: 60_000 }
        )
        return JSON.parse(await page.textContent('[data-testid="compare-stats"]'))
    } finally {
        await page.close()
    }
}

const browser = await chromium.launch()
const results = {}
try {
    // One discarded warm-up per pair, so the first measured load does not pay
    // for the server's first response or the browser's first compile.
    for (const lib of LIBS) await sample(browser, lib, SCENARIOS[0])

    for (let i = 0; i < ITERATIONS; i++) {
        const order = i % 2 === 0 ? LIBS : [...LIBS].reverse()
        for (const scenario of SCENARIOS) {
            for (const lib of order) {
                const s = await sample(browser, lib, scenario)
                if (s.timedOut > 0) {
                    throw new Error(
                        `${lib} ${scenario}: ${s.timedOut} step(s) produced no DOM change before the timeout`
                    )
                }
                const bucket = ((results[scenario] ??= {})[lib] ??= {
                    mountMs: [],
                    interactionMs: [],
                    cells: new Set(),
                    firstRow: new Set()
                })
                bucket.mountMs.push(s.mountMs)
                bucket.interactionMs.push(s.interactionMs)
                bucket.cells.add(s.cells)
                bucket.firstRow.add(s.firstRow)
            }
        }
        process.stderr.write(`iteration ${i + 1}/${ITERATIONS}\n`)
    }
} finally {
    await browser.close()
}

const summary = {}
const problems = []
const fmt = (n) => n.toFixed(1)
const lines = [
    `Iterations: ${ITERATIONS} cold loads per library per scenario (median / p95, ms)`,
    '',
    '| Scenario | Metric | humanspeak | tanstack | humanspeak / tanstack |',
    '| --- | --- | ---: | ---: | ---: |'
]
for (const scenario of SCENARIOS) {
    const byLib = results[scenario]
    const cellCounts = LIBS.map((lib) => [...byLib[lib].cells].join('/'))
    if (new Set(cellCounts).size !== 1 || cellCounts[0].includes('/')) {
        problems.push(
            `${scenario}: cell counts differ (${LIBS.map((l, i) => `${l}=${cellCounts[i]}`).join(', ')})`
        )
    }
    const rows = LIBS.map((lib) => [...byLib[lib].firstRow].join(' || '))
    if (rows[0] !== rows[1])
        problems.push(`${scenario}: first rendered row differs (${rows.join(' vs ')})`)

    const hasInteraction = byLib[LIBS[0]].interactionMs.some((ms) => ms > 0)
    for (const metric of hasInteraction ? ['mountMs', 'interactionMs'] : ['mountMs']) {
        const stat = Object.fromEntries(
            LIBS.map((lib) => [
                lib,
                {
                    median: quantile(byLib[lib][metric], 0.5),
                    p95: quantile(byLib[lib][metric], 0.95)
                }
            ])
        )
        ;(summary[scenario] ??= {})[metric] = stat
        const ratio = stat.humanspeak.median / stat.tanstack.median
        lines.push(
            `| \`${scenario}\` | ${metric} | ${fmt(stat.humanspeak.median)} / ${fmt(stat.humanspeak.p95)} | ${fmt(stat.tanstack.median)} / ${fmt(stat.tanstack.p95)} | ${ratio.toFixed(2)}× |`
        )
    }
    summary[scenario].cells = Number(cellCounts[0])
}

console.log(lines.join('\n'))
console.log('\n```json\n' + JSON.stringify(summary, null, 2) + '\n```')
if (problems.length) {
    console.error('\nNot comparable:\n' + problems.map((p) => `  - ${p}`).join('\n'))
    process.exitCode = 1
}
