<script lang="ts">
    /**
     * Cross-library compare bench: the same rows, columns and operations
     * driven through @humanspeak/svelte-headless-table and
     * @tanstack/svelte-table. One page load runs one library on one
     * scenario (`?lib=humanspeak|tanstack&scenario=...`), so every sample
     * is a cold mount. `scripts/compare-bench.mjs` loads it repeatedly,
     * alternating libraries, and aggregates the results.
     *
     * Timing matches the perf-bench fixture: a step starts just before the
     * state change and ends when a MutationObserver on the container sees
     * the DOM update.
     */
    import { page } from '$app/state'
    import { onMount, tick, type Component } from 'svelte'
    import HumanspeakTable from './_HumanspeakTable.svelte'
    import TanstackTable from './_TanstackTable.svelte'
    import { buildRows, type BenchApi } from './_data.js'

    type Adapter = Component<{
        data: ReturnType<typeof buildRows>
        pageSize: number
        onReady: (api: BenchApi) => void
    }>
    type Step = (api: BenchApi) => void

    const ADAPTERS: Record<string, Adapter> = {
        humanspeak: HumanspeakTable,
        tanstack: TanstackTable
    }

    const SCENARIOS: Record<string, { rows: number; pageSize: number; steps: Step[] }> = {
        // Build every row model over 10K rows, render one 50-row page.
        'mount-10k': { rows: 10_000, pageSize: 50, steps: [] },
        // Render cost: 1K rows on one page, 8,000 cells.
        'mount-1k-all': { rows: 1_000, pageSize: 1_000, steps: [] },
        // Three single-column sorts over 10K rows.
        'sort-10k': {
            rows: 10_000,
            pageSize: 50,
            steps: [
                (api) => api.setSort('lastName', false),
                (api) => api.setSort('age', true),
                (api) => api.setSort('visits', false)
            ]
        },
        // Three global searches over 10K rows. Each term changes the visible
        // page; a term that leaves the DOM untouched would time out.
        'filter-10k': {
            rows: 10_000,
            pageSize: 50,
            steps: [
                (api) => api.setFilter('w'),
                (api) => api.setFilter('wi'),
                (api) => api.setFilter('ta')
            ]
        },
        // Three page turns over 10K rows.
        'page-10k': {
            rows: 10_000,
            pageSize: 50,
            steps: [(api) => api.nextPage(), (api) => api.nextPage(), (api) => api.nextPage()]
        }
    }

    const libName = page.url.searchParams.get('lib') ?? 'humanspeak'
    const scenarioName = page.url.searchParams.get('scenario') ?? 'mount-10k'
    const Adapter = ADAPTERS[libName]
    const scenario = SCENARIOS[scenarioName]

    const data = buildRows(scenario.rows)
    let mounted = $state(false)
    let container: HTMLDivElement | undefined = $state()
    let api: BenchApi | undefined
    let stats = $state('')

    const PAINT_TIMEOUT_MS = 10_000
    let timedOut = 0
    const waitForPaint = (target: HTMLElement): Promise<number> =>
        new Promise((resolve) => {
            let done = false
            const settle = (timeout: boolean) => {
                if (done) return
                done = true
                if (timeout) timedOut += 1
                observer.disconnect()
                clearTimeout(timer)
                resolve(performance.now())
            }
            const observer = new MutationObserver(() => settle(false))
            observer.observe(target, { childList: true, subtree: true, characterData: true })
            const timer = setTimeout(() => settle(true), PAINT_TIMEOUT_MS)
        })

    const firstRowText = () =>
        [...(container?.querySelectorAll('tbody tr:first-child td') ?? [])]
            .map((td) => td.textContent.trim())
            .join('|')

    onMount(async () => {
        await tick()
        if (!container) throw new Error('compare-bench: container not bound')
        const target = container
        const mountStart = performance.now()
        const mountPaint = waitForPaint(target)
        mounted = true
        const mountMs = (await mountPaint) - mountStart
        await tick()

        const ready = api
        if (!ready) throw new Error(`compare-bench: ${libName} adapter never called onReady`)
        const stepMs: number[] = []
        for (const step of scenario.steps) {
            const stepStart = performance.now()
            const stepPaint = waitForPaint(target)
            step(ready)
            stepMs.push((await stepPaint) - stepStart)
            await tick()
        }

        const round = (ms: number) => Math.round(ms * 100) / 100
        stats = JSON.stringify({
            lib: libName,
            scenario: scenarioName,
            mountMs: round(mountMs),
            interactionMs: round(stepMs.reduce((a, b) => a + b, 0)),
            stepMs: stepMs.map(round),
            cells: target.querySelectorAll('tbody td').length,
            timedOut,
            firstRow: firstRowText()
        })
    })
</script>

<div bind:this={container}>
    {#if mounted}
        <Adapter {data} pageSize={scenario.pageSize} onReady={(ready) => (api = ready)} />
    {/if}
</div>
<pre data-testid="compare-stats">{stats}</pre>
