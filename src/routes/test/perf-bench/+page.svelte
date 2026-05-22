<script lang="ts">
    /**
     * Performance baseline fixture for svelte-headless-table.
     *
     * Captures build-time, render-time, and derivation-count metrics for
     * a fixed catalogue of scenarios so optimization commits can be
     * attributed to a specific before/after delta. Modeled on the
     * svelte-markdown perf-bench fixture; gauges differ to suit a table
     * view-model.
     *
     * Each preset:
     *   1. Tears down the previously mounted table (sets mount=null).
     *   2. Builds a fresh table + columns + view-model, timing each step.
     *   3. Resets vm._debug counters, mounts the new view-model, awaits
     *      the next MutationObserver fire as the "paint" signal.
     *   4. (Optional) runs an interaction phase: sort cycle, filter, page
     *      change, column reorder, expand all, etc. Each interaction's
     *      time-to-next-paint is recorded.
     *   5. Snapshots derivation counters + scenario-window observer
     *      aggregates into `[data-testid="perf-stats"]` for the headless
     *      runner to scrape.
     *
     * The non-wall-clock derivation counts come straight from the
     * `_debug.derivationCalls` surface created in createViewModel.ts and
     * are the most stable signal — they don't move with hardware noise.
     */
    import { writable, type Writable } from 'svelte/store'
    import { onMount, tick } from 'svelte'
    import { createTable } from '$lib/index.js'
    import {
        addColumnFilters,
        addColumnOrder,
        addExpandedRows,
        addGroupBy,
        addHiddenColumns,
        addPagination,
        addSelectedRows,
        addSortBy,
        addSubRows,
        addTableFilter,
        matchFilter,
        textPrefixFilter
    } from '$lib/plugins/index.js'
    import type { TableViewModel } from '$lib/createViewModel.js'
    import type { AnyPlugins } from '$lib/types/TablePlugin.js'
    import PerfTable from './_PerfTable.svelte'

    const ROLLING_WINDOW_MS = 10_000
    const LONG_TASK_THRESHOLD_MS = 50

    // ---- Deterministic corpus generators -------------------------------------

    type Row = {
        id: string
        firstName: string
        lastName: string
        age: number
        visits: number
        progress: number
        status: 'relationship' | 'complicated' | 'single'
        department: string
        salary: number
        children?: Row[]
    }

    const FIRSTS = [
        'Alice',
        'Bob',
        'Carol',
        'David',
        'Emma',
        'Frank',
        'Grace',
        'Henry',
        'Ivy',
        'Jack',
        'Kate',
        'Liam',
        'Mia',
        'Noah',
        'Olivia',
        'Pat',
        'Quinn',
        'Rose',
        'Sam',
        'Tess'
    ]
    const LASTS = [
        'Smith',
        'Jones',
        'Brown',
        'Davis',
        'Miller',
        'Wilson',
        'Moore',
        'Taylor',
        'Anderson',
        'Thomas',
        'Jackson',
        'White',
        'Harris',
        'Martin',
        'Thompson',
        'Garcia',
        'Martinez',
        'Robinson',
        'Clark',
        'Rodriguez'
    ]
    const STATUSES: Row['status'][] = ['relationship', 'complicated', 'single']
    const DEPTS = ['Eng', 'Sales', 'Marketing', 'HR', 'Finance', 'Ops', 'Legal', 'Support']

    const buildFlatRows = (count: number, seed = 0): Row[] => {
        const out: Row[] = new Array(count)
        for (let i = 0; i < count; i++) {
            const idx = seed + i
            out[i] = {
                id: `r${idx}`,
                firstName: FIRSTS[idx % FIRSTS.length],
                lastName: LASTS[(idx * 7) % LASTS.length],
                age: 18 + ((idx * 13) % 48),
                visits: (idx * 17) % 1000,
                progress: (idx * 23) % 101,
                status: STATUSES[idx % 3],
                department: DEPTS[idx % DEPTS.length],
                salary: 30_000 + ((idx * 1_234) % 170_000)
            }
        }
        return out
    }

    const buildTreeRows = (parents: number, kids: number): Row[] => {
        const out: Row[] = new Array(parents)
        for (let p = 0; p < parents; p++) {
            const [parent] = buildFlatRows(1, p)
            parent.children = buildFlatRows(kids, p * kids + 100_000)
            out[p] = parent
        }
        return out
    }

    type WideRow = Record<string, string | number>
    const buildWideRows = (count: number, cols: number): WideRow[] => {
        const out: WideRow[] = new Array(count)
        for (let i = 0; i < count; i++) {
            const row: WideRow = { id: `r${i}` }
            for (let c = 0; c < cols; c++) {
                row[`c${c}`] = (i * (c + 1)) % 1000
            }
            out[i] = row
        }
        return out
    }

    // ---- Stats state ---------------------------------------------------------

    type Scenario =
        | 'idle'
        | 'rows-1k'
        | 'rows-10k'
        | 'columns-50'
        | 'column-reorder-1k'
        | 'group-by-1k'
        | 'sort-cycle-1k'
        | 'subrows-tree-1k'
        | 'kitchen-sink-1k'

    let scenario = $state<string>('idle')

    // Holds the currently-mounted view-model + plugin states so the shared
    // render template can subscribe without a per-scenario component.
    // The Item generic is washed to `unknown` because the render template
    // only uses the surface every scenario exposes (headerRows, pageRows,
    // tableAttrs, ...) — no Item-typed methods are called.
    type AnyVm = TableViewModel<unknown, AnyPlugins>
    let currentVm = $state<AnyVm | null>(null)
    let renderVariant = $state<'flat' | 'tree' | 'wide' | 'grouped'>('flat')

    let stat = $state({
        rows: 0,
        cols: 0,
        plugins: 0,
        createTableMs: 0,
        createColumnsMs: 0,
        createViewModelMs: 0,
        firstPaintMs: 0,
        renderOnlyMs: 0,
        domCells: 0,
        rowsPerSec: 0,
        cellsPerSec: 0,
        // vm._debug.derivationCalls snapshot (post-paint, pre-interaction)
        derivTotal: 0,
        derivTableAttrs: 0,
        derivVisibleColumns: 0,
        derivColumnedRows: 0,
        derivRows: 0,
        derivInjectedRows: 0,
        derivPageRows: 0,
        derivInjectedPageRows: 0,
        derivHeaderRows: 0,
        // Interaction wall-clock (where applicable)
        interactionMs: 0,
        interactionPaintMs: 0,
        // Scenario-window observer aggregates
        scenarioLongestTaskMs: 0,
        scenarioMutations: 0,
        scenarioLoafScriptMaxMs: 0
    })

    const resetStat = () => {
        stat = {
            rows: 0,
            cols: 0,
            plugins: 0,
            createTableMs: 0,
            createColumnsMs: 0,
            createViewModelMs: 0,
            firstPaintMs: 0,
            renderOnlyMs: 0,
            domCells: 0,
            rowsPerSec: 0,
            cellsPerSec: 0,
            derivTotal: 0,
            derivTableAttrs: 0,
            derivVisibleColumns: 0,
            derivColumnedRows: 0,
            derivRows: 0,
            derivInjectedRows: 0,
            derivPageRows: 0,
            derivInjectedPageRows: 0,
            derivHeaderRows: 0,
            interactionMs: 0,
            interactionPaintMs: 0,
            scenarioLongestTaskMs: 0,
            scenarioMutations: 0,
            scenarioLoafScriptMaxMs: 0
        }
    }

    // ---- Rolling-10s observer state (verbatim from svelte-markdown) ----------

    let displayLongestTaskMs = $state(0)
    let displayLongTaskCount = $state(0)
    let displayRafP95Ms = $state(0)
    let displayMutationCount = $state(0)
    let displayLoafCount = $state(0)
    let displayLoafScriptMaxMs = $state(0)
    let displayHeapAllocKbPerSec = $state(0)
    let longTaskSupported = $state(true)
    let loafSupported = $state(true)
    let heapSupported = $state(true)

    let longTaskEntries: { time: number; duration: number }[] = []
    let rafIntervals: { time: number; delta: number }[] = []
    let mutationEvents: { time: number; count: number }[] = []
    let loafEntries: { time: number; durationMs: number; scriptMs: number }[] = []
    let heapDeltas: { time: number; deltaBytes: number }[] = []

    let previewEl: HTMLDivElement | undefined = $state()

    // ---- Helpers --------------------------------------------------------------

    const round = (n: number, places = 2): number => {
        const m = 10 ** places
        return Math.round(n * m) / m
    }

    const waitForPaint = (): Promise<number> =>
        new Promise((resolve) => {
            if (!previewEl) {
                resolve(performance.now())
                return
            }
            const mo = new MutationObserver(() => {
                mo.disconnect()
                resolve(performance.now())
            })
            mo.observe(previewEl, { childList: true, subtree: true, characterData: true })
        })

    const snapshotScenarioObservers = (start: number, end: number) => {
        let longestTaskMs = 0
        for (const e of longTaskEntries) {
            if (e.time >= start && e.time <= end && e.duration > longestTaskMs) {
                longestTaskMs = e.duration
            }
        }
        let mutations = 0
        for (const e of mutationEvents) {
            if (e.time >= start && e.time <= end) mutations += e.count
        }
        let loafScriptMaxMs = 0
        for (const e of loafEntries) {
            if (e.time >= start && e.time <= end && e.scriptMs > loafScriptMaxMs) {
                loafScriptMaxMs = e.scriptMs
            }
        }
        return {
            longestTaskMs: Math.round(longestTaskMs),
            mutations,
            loafScriptMaxMs: Math.round(loafScriptMaxMs)
        }
    }

    const snapshotDerivations = (vm: AnyVm) => {
        const d = vm._debug.derivationCalls
        return {
            total: vm._debug.getTotalCalls(),
            tableAttrs: d.tableAttrs,
            visibleColumns: d.visibleColumns,
            columnedRows: d.columnedRows,
            rows: d.rows,
            injectedRows: d.injectedRows,
            pageRows: d.pageRows,
            injectedPageRows: d.injectedPageRows,
            headerRows: d.headerRows
        }
    }

    const countCells = (): number => {
        if (!previewEl) return 0
        return previewEl.querySelectorAll('td').length
    }

    // ---- Scenario runners ----------------------------------------------------

    /**
     * Common pre-roll: switch to idle, drop the previous DOM, then await
     * two ticks + a MutationObserver settle so unmount work isn't
     * attributed to the new scenario's window.
     */
    const preroll = async () => {
        currentVm = null
        await tick()
        await tick()
    }

    /**
     * 1K rows × 8 cols, sort + filter + paginate.
     * Baseline scenario — the everyday table shape.
     */
    const runRows1k = async () => {
        scenario = 'rows-1k'
        resetStat()
        await preroll()

        const data = writable(buildFlatRows(1000))

        const tT0 = performance.now()
        const table = createTable(data, {
            sort: addSortBy(),
            filter: addTableFilter({ fn: textPrefixFilter }),
            page: addPagination({ initialPageSize: 50 })
        })
        const createTableMs = performance.now() - tT0

        const tC0 = performance.now()
        const columns = table.createColumns([
            table.column({ header: 'First', accessor: 'firstName', plugins: { sort: {} } }),
            table.column({ header: 'Last', accessor: 'lastName', plugins: { sort: {} } }),
            table.column({ header: 'Age', accessor: 'age', plugins: { sort: {} } }),
            table.column({ header: 'Visits', accessor: 'visits', plugins: { sort: {} } }),
            table.column({ header: 'Progress', accessor: 'progress' }),
            table.column({ header: 'Status', accessor: 'status' }),
            table.column({ header: 'Dept', accessor: 'department' }),
            table.column({ header: 'Salary', accessor: 'salary', plugins: { sort: {} } })
        ])
        const createColumnsMs = performance.now() - tC0

        const tV0 = performance.now()
        const vm = table.createViewModel(columns) as unknown as AnyVm
        const createViewModelMs = performance.now() - tV0

        vm._debug.resetCounters()
        renderVariant = 'flat'
        const start = performance.now()
        const paintPromise = waitForPaint()
        currentVm = vm
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - start
        await tick()
        const end = performance.now()

        const derivs = snapshotDerivations(vm)
        const observers = snapshotScenarioObservers(start, end)
        const domCells = countCells()
        const totalMs = createTableMs + createColumnsMs + createViewModelMs + firstPaintMs
        const rows = 1000

        stat = {
            ...stat,
            rows,
            cols: 8,
            plugins: 3,
            createTableMs: round(createTableMs),
            createColumnsMs: round(createColumnsMs),
            createViewModelMs: round(createViewModelMs),
            firstPaintMs: round(firstPaintMs),
            renderOnlyMs: round(Math.max(0, firstPaintMs - createViewModelMs)),
            domCells,
            rowsPerSec: totalMs > 0 ? Math.round((rows / totalMs) * 1000) : 0,
            cellsPerSec: totalMs > 0 ? Math.round((domCells / totalMs) * 1000) : 0,
            derivTotal: derivs.total,
            derivTableAttrs: derivs.tableAttrs,
            derivVisibleColumns: derivs.visibleColumns,
            derivColumnedRows: derivs.columnedRows,
            derivRows: derivs.rows,
            derivInjectedRows: derivs.injectedRows,
            derivPageRows: derivs.pageRows,
            derivInjectedPageRows: derivs.injectedPageRows,
            derivHeaderRows: derivs.headerRows,
            scenarioLongestTaskMs: observers.longestTaskMs,
            scenarioMutations: observers.mutations,
            scenarioLoafScriptMaxMs: observers.loafScriptMaxMs
        }

        scenario = 'rows-1k-done'
    }

    /**
     * 10K rows × 8 cols, sort + filter + paginate.
     * Scales row-side derivations 10× — surfaces O(n) overhead in
     * columnedRows / injectedRows / hooks fan-out that's hidden at 1K.
     */
    const runRows10k = async () => {
        scenario = 'rows-10k'
        resetStat()
        await preroll()

        const data = writable(buildFlatRows(10_000))

        const tT0 = performance.now()
        const table = createTable(data, {
            sort: addSortBy(),
            filter: addTableFilter({ fn: textPrefixFilter }),
            page: addPagination({ initialPageSize: 50 })
        })
        const createTableMs = performance.now() - tT0

        const tC0 = performance.now()
        const columns = table.createColumns([
            table.column({ header: 'First', accessor: 'firstName', plugins: { sort: {} } }),
            table.column({ header: 'Last', accessor: 'lastName', plugins: { sort: {} } }),
            table.column({ header: 'Age', accessor: 'age', plugins: { sort: {} } }),
            table.column({ header: 'Visits', accessor: 'visits', plugins: { sort: {} } }),
            table.column({ header: 'Progress', accessor: 'progress' }),
            table.column({ header: 'Status', accessor: 'status' }),
            table.column({ header: 'Dept', accessor: 'department' }),
            table.column({ header: 'Salary', accessor: 'salary', plugins: { sort: {} } })
        ])
        const createColumnsMs = performance.now() - tC0

        const tV0 = performance.now()
        const vm = table.createViewModel(columns) as unknown as AnyVm
        const createViewModelMs = performance.now() - tV0

        vm._debug.resetCounters()
        renderVariant = 'flat'
        const start = performance.now()
        const paintPromise = waitForPaint()
        currentVm = vm
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - start
        await tick()
        const end = performance.now()

        const derivs = snapshotDerivations(vm)
        const observers = snapshotScenarioObservers(start, end)
        const domCells = countCells()
        const totalMs = createTableMs + createColumnsMs + createViewModelMs + firstPaintMs
        const rows = 10_000

        stat = {
            ...stat,
            rows,
            cols: 8,
            plugins: 3,
            createTableMs: round(createTableMs),
            createColumnsMs: round(createColumnsMs),
            createViewModelMs: round(createViewModelMs),
            firstPaintMs: round(firstPaintMs),
            renderOnlyMs: round(Math.max(0, firstPaintMs - createViewModelMs)),
            domCells,
            rowsPerSec: totalMs > 0 ? Math.round((rows / totalMs) * 1000) : 0,
            cellsPerSec: totalMs > 0 ? Math.round((domCells / totalMs) * 1000) : 0,
            derivTotal: derivs.total,
            derivTableAttrs: derivs.tableAttrs,
            derivVisibleColumns: derivs.visibleColumns,
            derivColumnedRows: derivs.columnedRows,
            derivRows: derivs.rows,
            derivInjectedRows: derivs.injectedRows,
            derivPageRows: derivs.pageRows,
            derivInjectedPageRows: derivs.injectedPageRows,
            derivHeaderRows: derivs.headerRows,
            scenarioLongestTaskMs: observers.longestTaskMs,
            scenarioMutations: observers.mutations,
            scenarioLoafScriptMaxMs: observers.loafScriptMaxMs
        }

        scenario = 'rows-10k-done'
    }

    /**
     * 1K rows × 50 cols. Targets the `getColumnedBodyRows` cell-lookup
     * hot path (`cells.find(c => c.id === cid)` inside `columnIdOrder.map`).
     * Wide columns + many rows = O(rows × cols²) without the Map fix.
     */
    const runColumns50 = async () => {
        scenario = 'columns-50'
        resetStat()
        await preroll()

        const rows = 1000
        const cols = 50
        const data = writable(buildWideRows(rows, cols))

        const tT0 = performance.now()
        const table = createTable(data, {
            page: addPagination({ initialPageSize: 25 })
        })
        const createTableMs = performance.now() - tT0

        const colDefs = []
        for (let c = 0; c < cols; c++) {
            const id = `c${c}`
            colDefs.push(
                table.column({
                    header: `Col ${c}`,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    accessor: id as any
                })
            )
        }
        const tC0 = performance.now()
        const columns = table.createColumns(colDefs)
        const createColumnsMs = performance.now() - tC0

        const tV0 = performance.now()
        const vm = table.createViewModel(columns) as unknown as AnyVm
        const createViewModelMs = performance.now() - tV0

        vm._debug.resetCounters()
        renderVariant = 'wide'
        const start = performance.now()
        const paintPromise = waitForPaint()
        currentVm = vm
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - start
        await tick()
        const end = performance.now()

        const derivs = snapshotDerivations(vm)
        const observers = snapshotScenarioObservers(start, end)
        const domCells = countCells()
        const totalMs = createTableMs + createColumnsMs + createViewModelMs + firstPaintMs

        stat = {
            ...stat,
            rows,
            cols,
            plugins: 1,
            createTableMs: round(createTableMs),
            createColumnsMs: round(createColumnsMs),
            createViewModelMs: round(createViewModelMs),
            firstPaintMs: round(firstPaintMs),
            renderOnlyMs: round(Math.max(0, firstPaintMs - createViewModelMs)),
            domCells,
            rowsPerSec: totalMs > 0 ? Math.round((rows / totalMs) * 1000) : 0,
            cellsPerSec: totalMs > 0 ? Math.round((domCells / totalMs) * 1000) : 0,
            derivTotal: derivs.total,
            derivTableAttrs: derivs.tableAttrs,
            derivVisibleColumns: derivs.visibleColumns,
            derivColumnedRows: derivs.columnedRows,
            derivRows: derivs.rows,
            derivInjectedRows: derivs.injectedRows,
            derivPageRows: derivs.pageRows,
            derivInjectedPageRows: derivs.injectedPageRows,
            derivHeaderRows: derivs.headerRows,
            scenarioLongestTaskMs: observers.longestTaskMs,
            scenarioMutations: observers.mutations,
            scenarioLoafScriptMaxMs: observers.loafScriptMaxMs
        }

        scenario = 'columns-50-done'
    }

    /**
     * 1K rows × 20 cols + column-reorder. Records build-time normally,
     * then runs an interaction phase that reverses the column order and
     * times the next paint. Targets the `addColumnOrder` Map-lookup
     * derivation and the `getColumnedBodyRows` cell lookup it triggers.
     */
    const runColumnReorder1k = async () => {
        scenario = 'column-reorder-1k'
        resetStat()
        await preroll()

        const rows = 1000
        const cols = 20
        const data = writable(buildWideRows(rows, cols))

        const tT0 = performance.now()
        const table = createTable(data, {
            order: addColumnOrder<WideRow>(),
            page: addPagination({ initialPageSize: 25 })
        })
        const createTableMs = performance.now() - tT0

        const colIds: string[] = []
        const colDefs = []
        for (let c = 0; c < cols; c++) {
            const id = `c${c}`
            colIds.push(id)
            colDefs.push(
                table.column({
                    header: `Col ${c}`,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    accessor: id as any
                })
            )
        }
        const tC0 = performance.now()
        const columns = table.createColumns(colDefs)
        const createColumnsMs = performance.now() - tC0

        const tV0 = performance.now()
        const vm = table.createViewModel(columns) as unknown as AnyVm
        const createViewModelMs = performance.now() - tV0

        vm._debug.resetCounters()
        renderVariant = 'wide'
        const start = performance.now()
        const paintPromise = waitForPaint()
        currentVm = vm
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - start
        await tick()

        // Interaction: reverse the column order, measure next paint.
        const columnIdOrder = (
            vm.pluginStates as unknown as { order: { columnIdOrder: Writable<string[]> } }
        ).order.columnIdOrder
        vm._debug.resetCounters()
        const iStart = performance.now()
        const iPaintPromise = waitForPaint()
        columnIdOrder.set([...colIds].reverse())
        const iPaintAt = await iPaintPromise
        const interactionPaintMs = iPaintAt - iStart
        await tick()
        const interactionMs = performance.now() - iStart
        const end = performance.now()

        const derivs = snapshotDerivations(vm)
        const observers = snapshotScenarioObservers(start, end)
        const domCells = countCells()
        const totalMs = createTableMs + createColumnsMs + createViewModelMs + firstPaintMs

        stat = {
            ...stat,
            rows,
            cols,
            plugins: 2,
            createTableMs: round(createTableMs),
            createColumnsMs: round(createColumnsMs),
            createViewModelMs: round(createViewModelMs),
            firstPaintMs: round(firstPaintMs),
            renderOnlyMs: round(Math.max(0, firstPaintMs - createViewModelMs)),
            domCells,
            rowsPerSec: totalMs > 0 ? Math.round((rows / totalMs) * 1000) : 0,
            cellsPerSec: totalMs > 0 ? Math.round((domCells / totalMs) * 1000) : 0,
            // For interaction scenarios the deriv* fields capture
            // calls during the *interaction*, not the cold mount — the
            // baseline is the same as `columns-50` so the interaction
            // delta is the interesting signal.
            derivTotal: derivs.total,
            derivTableAttrs: derivs.tableAttrs,
            derivVisibleColumns: derivs.visibleColumns,
            derivColumnedRows: derivs.columnedRows,
            derivRows: derivs.rows,
            derivInjectedRows: derivs.injectedRows,
            derivPageRows: derivs.pageRows,
            derivInjectedPageRows: derivs.injectedPageRows,
            derivHeaderRows: derivs.headerRows,
            interactionMs: round(interactionMs),
            interactionPaintMs: round(interactionPaintMs),
            scenarioLongestTaskMs: observers.longestTaskMs,
            scenarioMutations: observers.mutations,
            scenarioLoafScriptMaxMs: observers.loafScriptMaxMs
        }

        scenario = 'column-reorder-1k-done'
    }

    /**
     * 1K rows grouped by `status` (3 buckets). Targets the
     * `addGroupBy` mutable-array-build hot path
     * (`[...subRows, row]` inside the grouping loop).
     */
    const runGroupBy1k = async () => {
        scenario = 'group-by-1k'
        resetStat()
        await preroll()

        const rows = 1000
        const data = writable(buildFlatRows(rows))

        const tT0 = performance.now()
        const table = createTable(data, {
            group: addGroupBy({ initialGroupByIds: ['status'] }),
            page: addPagination({ initialPageSize: 25 })
        })
        const createTableMs = performance.now() - tT0

        const tC0 = performance.now()
        const columns = table.createColumns([
            table.column({ header: 'Status', accessor: 'status', plugins: { group: {} } }),
            table.column({ header: 'First', accessor: 'firstName' }),
            table.column({ header: 'Last', accessor: 'lastName' }),
            table.column({ header: 'Age', accessor: 'age' }),
            table.column({ header: 'Visits', accessor: 'visits' }),
            table.column({ header: 'Progress', accessor: 'progress' }),
            table.column({ header: 'Dept', accessor: 'department' }),
            table.column({ header: 'Salary', accessor: 'salary' })
        ])
        const createColumnsMs = performance.now() - tC0

        const tV0 = performance.now()
        const vm = table.createViewModel(columns) as unknown as AnyVm
        const createViewModelMs = performance.now() - tV0

        vm._debug.resetCounters()
        renderVariant = 'grouped'
        const start = performance.now()
        const paintPromise = waitForPaint()
        currentVm = vm
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - start
        await tick()
        const end = performance.now()

        const derivs = snapshotDerivations(vm)
        const observers = snapshotScenarioObservers(start, end)
        const domCells = countCells()
        const totalMs = createTableMs + createColumnsMs + createViewModelMs + firstPaintMs

        stat = {
            ...stat,
            rows,
            cols: 8,
            plugins: 2,
            createTableMs: round(createTableMs),
            createColumnsMs: round(createColumnsMs),
            createViewModelMs: round(createViewModelMs),
            firstPaintMs: round(firstPaintMs),
            renderOnlyMs: round(Math.max(0, firstPaintMs - createViewModelMs)),
            domCells,
            rowsPerSec: totalMs > 0 ? Math.round((rows / totalMs) * 1000) : 0,
            cellsPerSec: totalMs > 0 ? Math.round((domCells / totalMs) * 1000) : 0,
            derivTotal: derivs.total,
            derivTableAttrs: derivs.tableAttrs,
            derivVisibleColumns: derivs.visibleColumns,
            derivColumnedRows: derivs.columnedRows,
            derivRows: derivs.rows,
            derivInjectedRows: derivs.injectedRows,
            derivPageRows: derivs.pageRows,
            derivInjectedPageRows: derivs.injectedPageRows,
            derivHeaderRows: derivs.headerRows,
            scenarioLongestTaskMs: observers.longestTaskMs,
            scenarioMutations: observers.mutations,
            scenarioLoafScriptMaxMs: observers.loafScriptMaxMs
        }

        scenario = 'group-by-1k-done'
    }

    /**
     * 1K rows × 8 cols. Mounts cold, then runs a 3-step sort cycle and
     * sums the per-sort paint time. Targets the `addSortBy` re-derivation
     * path + the downstream injectedRows hook fan-out.
     */
    const runSortCycle1k = async () => {
        scenario = 'sort-cycle-1k'
        resetStat()
        await preroll()

        const rows = 1000
        const data = writable(buildFlatRows(rows))

        const tT0 = performance.now()
        const table = createTable(data, {
            sort: addSortBy(),
            page: addPagination({ initialPageSize: 50 })
        })
        const createTableMs = performance.now() - tT0

        const tC0 = performance.now()
        const columns = table.createColumns([
            table.column({ header: 'First', accessor: 'firstName', plugins: { sort: {} } }),
            table.column({ header: 'Last', accessor: 'lastName', plugins: { sort: {} } }),
            table.column({ header: 'Age', accessor: 'age', plugins: { sort: {} } }),
            table.column({ header: 'Visits', accessor: 'visits', plugins: { sort: {} } }),
            table.column({ header: 'Progress', accessor: 'progress', plugins: { sort: {} } }),
            table.column({ header: 'Status', accessor: 'status' }),
            table.column({ header: 'Dept', accessor: 'department' }),
            table.column({ header: 'Salary', accessor: 'salary', plugins: { sort: {} } })
        ])
        const createColumnsMs = performance.now() - tC0

        const tV0 = performance.now()
        const vm = table.createViewModel(columns) as unknown as AnyVm
        const createViewModelMs = performance.now() - tV0

        vm._debug.resetCounters()
        renderVariant = 'flat'
        const start = performance.now()
        const paintPromise = waitForPaint()
        currentVm = vm
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - start
        await tick()

        // Sort cycle: by lastName → by age → by visits. Each step
        // measured separately, then summed for `interactionMs`.
        const sortKeys = (
            vm.pluginStates as unknown as {
                sort: { sortKeys: Writable<{ id: string; order: 'asc' | 'desc' }[]> }
            }
        ).sort.sortKeys
        const cycle: { id: string; order: 'asc' | 'desc' }[][] = [
            [{ id: 'lastName', order: 'asc' }],
            [{ id: 'age', order: 'desc' }],
            [{ id: 'visits', order: 'asc' }]
        ]
        vm._debug.resetCounters()
        const iStart = performance.now()
        let interactionPaintTotal = 0
        for (const keys of cycle) {
            const stepStart = performance.now()
            const stepPaint = waitForPaint()
            sortKeys.set(keys)
            const stepPaintAt = await stepPaint
            interactionPaintTotal += stepPaintAt - stepStart
            await tick()
        }
        const interactionMs = performance.now() - iStart
        const end = performance.now()

        const derivs = snapshotDerivations(vm)
        const observers = snapshotScenarioObservers(start, end)
        const domCells = countCells()
        const totalMs = createTableMs + createColumnsMs + createViewModelMs + firstPaintMs

        stat = {
            ...stat,
            rows,
            cols: 8,
            plugins: 2,
            createTableMs: round(createTableMs),
            createColumnsMs: round(createColumnsMs),
            createViewModelMs: round(createViewModelMs),
            firstPaintMs: round(firstPaintMs),
            renderOnlyMs: round(Math.max(0, firstPaintMs - createViewModelMs)),
            domCells,
            rowsPerSec: totalMs > 0 ? Math.round((rows / totalMs) * 1000) : 0,
            cellsPerSec: totalMs > 0 ? Math.round((domCells / totalMs) * 1000) : 0,
            derivTotal: derivs.total,
            derivTableAttrs: derivs.tableAttrs,
            derivVisibleColumns: derivs.visibleColumns,
            derivColumnedRows: derivs.columnedRows,
            derivRows: derivs.rows,
            derivInjectedRows: derivs.injectedRows,
            derivPageRows: derivs.pageRows,
            derivInjectedPageRows: derivs.injectedPageRows,
            derivHeaderRows: derivs.headerRows,
            interactionMs: round(interactionMs),
            interactionPaintMs: round(interactionPaintTotal),
            scenarioLongestTaskMs: observers.longestTaskMs,
            scenarioMutations: observers.mutations,
            scenarioLoafScriptMaxMs: observers.loafScriptMaxMs
        }

        scenario = 'sort-cycle-1k-done'
    }

    /**
     * 100 parent rows × 10 child rows. Targets the addSubRows +
     * addExpandedRows composition path. Expand-all after mount measures
     * the cost of flipping every row's expanded flag.
     */
    const runSubrowsTree1k = async () => {
        scenario = 'subrows-tree-1k'
        resetStat()
        await preroll()

        const parents = 100
        const kids = 10
        const data = writable(buildTreeRows(parents, kids))

        const tT0 = performance.now()
        const table = createTable(data, {
            subRows: addSubRows({ children: 'children' }),
            expand: addExpandedRows<Row>(),
            page: addPagination({ initialPageSize: 50 })
        })
        const createTableMs = performance.now() - tT0

        const tC0 = performance.now()
        const columns = table.createColumns([
            table.column({ header: 'First', accessor: 'firstName' }),
            table.column({ header: 'Last', accessor: 'lastName' }),
            table.column({ header: 'Age', accessor: 'age' }),
            table.column({ header: 'Visits', accessor: 'visits' }),
            table.column({ header: 'Status', accessor: 'status' }),
            table.column({ header: 'Dept', accessor: 'department' }),
            table.column({ header: 'Salary', accessor: 'salary' })
        ])
        const createColumnsMs = performance.now() - tC0

        const tV0 = performance.now()
        const vm = table.createViewModel(columns) as unknown as AnyVm
        const createViewModelMs = performance.now() - tV0

        vm._debug.resetCounters()
        renderVariant = 'tree'
        const start = performance.now()
        const paintPromise = waitForPaint()
        currentVm = vm
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - start
        await tick()

        // Interaction: expand all parent rows (deeply impacts pageRows
        // derivation; flatten-tree work dominates injectedRows).
        const expandedIds = (
            vm.pluginStates as unknown as {
                expand: { expandedIds: Writable<Record<string, boolean>> }
            }
        ).expand.expandedIds
        vm._debug.resetCounters()
        const iStart = performance.now()
        const iPaintPromise = waitForPaint()
        // Expand every visible parent (page is 50, parents are 100,
        // first page = 50 expanded). Toggling all keys triggers a
        // single derivation pass rather than 50 separate ones.
        const all: Record<string, boolean> = {}
        for (let p = 0; p < parents; p++) all[String(p)] = true
        expandedIds.set(all)
        const iPaintAt = await iPaintPromise
        const interactionPaintMs = iPaintAt - iStart
        await tick()
        const interactionMs = performance.now() - iStart
        const end = performance.now()

        const derivs = snapshotDerivations(vm)
        const observers = snapshotScenarioObservers(start, end)
        const domCells = countCells()
        const totalMs = createTableMs + createColumnsMs + createViewModelMs + firstPaintMs
        const rows = parents + parents * kids

        stat = {
            ...stat,
            rows,
            cols: 7,
            plugins: 3,
            createTableMs: round(createTableMs),
            createColumnsMs: round(createColumnsMs),
            createViewModelMs: round(createViewModelMs),
            firstPaintMs: round(firstPaintMs),
            renderOnlyMs: round(Math.max(0, firstPaintMs - createViewModelMs)),
            domCells,
            rowsPerSec: totalMs > 0 ? Math.round((rows / totalMs) * 1000) : 0,
            cellsPerSec: totalMs > 0 ? Math.round((domCells / totalMs) * 1000) : 0,
            derivTotal: derivs.total,
            derivTableAttrs: derivs.tableAttrs,
            derivVisibleColumns: derivs.visibleColumns,
            derivColumnedRows: derivs.columnedRows,
            derivRows: derivs.rows,
            derivInjectedRows: derivs.injectedRows,
            derivPageRows: derivs.pageRows,
            derivInjectedPageRows: derivs.injectedPageRows,
            derivHeaderRows: derivs.headerRows,
            interactionMs: round(interactionMs),
            interactionPaintMs: round(interactionPaintMs),
            scenarioLongestTaskMs: observers.longestTaskMs,
            scenarioMutations: observers.mutations,
            scenarioLoafScriptMaxMs: observers.loafScriptMaxMs
        }

        scenario = 'subrows-tree-1k-done'
    }

    /**
     * Kitchen-sink: 1K rows × 8 cols with every common plugin composed.
     * Surfaces plugin-stack interactions that single-plugin scenarios
     * miss — e.g. the hook fan-out cost when injectedRows traverses
     * tbody.tr / tbody.tr.td hooks from N plugins.
     */
    const runKitchenSink1k = async () => {
        scenario = 'kitchen-sink-1k'
        resetStat()
        await preroll()

        const rows = 1000
        const data = writable(buildFlatRows(rows))

        const tT0 = performance.now()
        const table = createTable(data, {
            select: addSelectedRows(),
            sort: addSortBy(),
            filter: addColumnFilters(),
            tableFilter: addTableFilter({ fn: textPrefixFilter }),
            hide: addHiddenColumns(),
            order: addColumnOrder(),
            page: addPagination({ initialPageSize: 50 })
        })
        const createTableMs = performance.now() - tT0

        const tC0 = performance.now()
        const columns = table.createColumns([
            table.column({
                header: 'First',
                accessor: 'firstName',
                plugins: {
                    sort: {},
                    filter: { fn: textPrefixFilter, initialFilterValue: '' }
                }
            }),
            table.column({
                header: 'Last',
                accessor: 'lastName',
                plugins: { sort: {}, filter: { fn: textPrefixFilter, initialFilterValue: '' } }
            }),
            table.column({ header: 'Age', accessor: 'age', plugins: { sort: {} } }),
            table.column({ header: 'Visits', accessor: 'visits', plugins: { sort: {} } }),
            table.column({
                header: 'Status',
                accessor: 'status',
                plugins: { filter: { fn: matchFilter, initialFilterValue: '' } }
            }),
            table.column({ header: 'Dept', accessor: 'department' }),
            table.column({ header: 'Progress', accessor: 'progress' }),
            table.column({ header: 'Salary', accessor: 'salary', plugins: { sort: {} } })
        ])
        const createColumnsMs = performance.now() - tC0

        const tV0 = performance.now()
        const vm = table.createViewModel(columns) as unknown as AnyVm
        const createViewModelMs = performance.now() - tV0

        vm._debug.resetCounters()
        renderVariant = 'flat'
        const start = performance.now()
        const paintPromise = waitForPaint()
        currentVm = vm
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - start
        await tick()
        const end = performance.now()

        const derivs = snapshotDerivations(vm)
        const observers = snapshotScenarioObservers(start, end)
        const domCells = countCells()
        const totalMs = createTableMs + createColumnsMs + createViewModelMs + firstPaintMs

        stat = {
            ...stat,
            rows,
            cols: 8,
            plugins: 7,
            createTableMs: round(createTableMs),
            createColumnsMs: round(createColumnsMs),
            createViewModelMs: round(createViewModelMs),
            firstPaintMs: round(firstPaintMs),
            renderOnlyMs: round(Math.max(0, firstPaintMs - createViewModelMs)),
            domCells,
            rowsPerSec: totalMs > 0 ? Math.round((rows / totalMs) * 1000) : 0,
            cellsPerSec: totalMs > 0 ? Math.round((domCells / totalMs) * 1000) : 0,
            derivTotal: derivs.total,
            derivTableAttrs: derivs.tableAttrs,
            derivVisibleColumns: derivs.visibleColumns,
            derivColumnedRows: derivs.columnedRows,
            derivRows: derivs.rows,
            derivInjectedRows: derivs.injectedRows,
            derivPageRows: derivs.pageRows,
            derivInjectedPageRows: derivs.injectedPageRows,
            derivHeaderRows: derivs.headerRows,
            scenarioLongestTaskMs: observers.longestTaskMs,
            scenarioMutations: observers.mutations,
            scenarioLoafScriptMaxMs: observers.loafScriptMaxMs
        }

        scenario = 'kitchen-sink-1k-done'
    }

    const clear = () => {
        currentVm = null
        resetStat()
        longTaskEntries = []
        rafIntervals = []
        mutationEvents = []
        loafEntries = []
        heapDeltas = []
        displayLongestTaskMs = 0
        displayLongTaskCount = 0
        displayRafP95Ms = 0
        displayMutationCount = 0
        displayLoafCount = 0
        displayLoafScriptMaxMs = 0
        displayHeapAllocKbPerSec = 0
        scenario = 'idle'
    }

    // ---- Observer wiring (verbatim from svelte-markdown perf-bench) ----------

    onMount(() => {
        const cleanups: Array<() => void> = []

        try {
            const po = new PerformanceObserver((list) => {
                const now = performance.now()
                for (const entry of list.getEntries()) {
                    longTaskEntries.push({ time: now, duration: entry.duration })
                }
            })
            po.observe({ entryTypes: ['longtask'] })
            cleanups.push(() => po.disconnect())
        } catch {
            longTaskSupported = false
        }

        try {
            type ScriptTiming = { duration: number }
            type LongAnimationFrameTiming = PerformanceEntry & { scripts?: ScriptTiming[] }
            const po = new PerformanceObserver((list) => {
                const now = performance.now()
                for (const raw of list.getEntries()) {
                    const entry = raw as LongAnimationFrameTiming
                    let scriptMs = 0
                    if (entry.scripts) for (const s of entry.scripts) scriptMs += s.duration
                    loafEntries.push({ time: now, durationMs: entry.duration, scriptMs })
                }
            })
            po.observe({ type: 'long-animation-frame', buffered: true })
            cleanups.push(() => po.disconnect())
        } catch {
            loafSupported = false
        }

        const wrapper = document.querySelector('[data-testid="perf-preview"]')
        if (wrapper) {
            const mo = new MutationObserver((records) => {
                mutationEvents.push({ time: performance.now(), count: records.length })
            })
            mo.observe(wrapper, { childList: true, subtree: true, characterData: true })
            cleanups.push(() => mo.disconnect())
        }

        type MemoryInfo = { usedJSHeapSize: number }
        type PerformanceWithMemory = Performance & { memory?: MemoryInfo }
        const perfMem = (performance as PerformanceWithMemory).memory
        if (!perfMem) heapSupported = false

        let rafId = 0
        let lastRaf = performance.now()
        let firstSampleSeen = false
        let lastHeapBytes = perfMem?.usedJSHeapSize ?? 0
        const tickRaf = (now: number) => {
            const delta = now - lastRaf
            lastRaf = now
            if (firstSampleSeen) {
                rafIntervals.push({ time: now, delta })
                if (perfMem) {
                    const current = perfMem.usedJSHeapSize
                    const heapDelta = current - lastHeapBytes
                    if (heapDelta > 0) heapDeltas.push({ time: now, deltaBytes: heapDelta })
                    lastHeapBytes = current
                }
            } else {
                firstSampleSeen = true
            }
            rafId = requestAnimationFrame(tickRaf)
        }
        rafId = requestAnimationFrame(tickRaf)
        cleanups.push(() => cancelAnimationFrame(rafId))

        const refreshHandle = setInterval(() => {
            const now = performance.now()
            const cutoff = now - ROLLING_WINDOW_MS

            longTaskEntries = longTaskEntries.filter((e) => e.time >= cutoff)
            rafIntervals = rafIntervals.filter((e) => e.time >= cutoff)
            mutationEvents = mutationEvents.filter((e) => e.time >= cutoff)
            loafEntries = loafEntries.filter((e) => e.time >= cutoff)
            heapDeltas = heapDeltas.filter((e) => e.time >= cutoff)

            let longest = 0
            let longCount = 0
            for (const e of longTaskEntries) {
                if (e.duration > longest) longest = e.duration
                if (e.duration > LONG_TASK_THRESHOLD_MS) longCount++
            }
            displayLongestTaskMs = Math.round(longest)
            displayLongTaskCount = longCount

            if (rafIntervals.length > 0) {
                const sorted = rafIntervals.map((e) => e.delta).sort((a, b) => a - b)
                const idx = Math.floor(0.95 * sorted.length)
                displayRafP95Ms = Math.round(sorted[Math.min(idx, sorted.length - 1)] * 10) / 10
            } else {
                displayRafP95Ms = 0
            }

            let mutCount = 0
            for (const e of mutationEvents) mutCount += e.count
            displayMutationCount = mutCount

            let loafScriptMax = 0
            for (const e of loafEntries) {
                if (e.scriptMs > loafScriptMax) loafScriptMax = e.scriptMs
            }
            displayLoafCount = loafEntries.length
            displayLoafScriptMaxMs = Math.round(loafScriptMax)

            if (heapSupported) {
                let totalBytes = 0
                for (const e of heapDeltas) totalBytes += e.deltaBytes
                const seconds = ROLLING_WINDOW_MS / 1000
                displayHeapAllocKbPerSec = Math.round(totalBytes / 1024 / seconds)
            } else {
                displayHeapAllocKbPerSec = 0
            }
        }, 250)
        cleanups.push(() => clearInterval(refreshHandle))

        return () => {
            for (const fn of cleanups) fn()
        }
    })
</script>

<svelte:head>
    <title>Test: Perf bench</title>
</svelte:head>

<div class="page">
    <h1>Test: Perf bench</h1>
    <p class="lede">
        Per-scenario build/render timings + derivation counts + rolling-10s observer metrics. Each
        preset tears down the previous mount, builds a fresh view-model, mounts, and (where
        applicable) runs an interaction phase. Stats are scraped by
        <code>scripts/perf-bench.mjs</code>.
    </p>

    <div class="presets">
        <button data-testid="rows-1k" onclick={runRows1k}>rows 1k</button>
        <button data-testid="rows-10k" onclick={runRows10k}>rows 10k</button>
        <button data-testid="columns-50" onclick={runColumns50}>columns ×50</button>
        <button data-testid="column-reorder-1k" onclick={runColumnReorder1k}>
            column-reorder 1k
        </button>
        <button data-testid="group-by-1k" onclick={runGroupBy1k}>group-by 1k</button>
        <button data-testid="sort-cycle-1k" onclick={runSortCycle1k}>sort-cycle 1k</button>
        <button data-testid="subrows-tree-1k" onclick={runSubrowsTree1k}>subrows-tree 1k</button>
        <button data-testid="kitchen-sink-1k" onclick={runKitchenSink1k}>kitchen-sink 1k</button>
        <button data-testid="clear" onclick={clear}>Clear</button>
    </div>

    <div class="stats" data-testid="perf-stats">
        scenario={scenario} rows={stat.rows} cols={stat.cols} plugins={stat.plugins}
        createTableMs={stat.createTableMs} createColumnsMs={stat.createColumnsMs}
        createViewModelMs={stat.createViewModelMs} firstPaintMs={stat.firstPaintMs}
        renderOnlyMs={stat.renderOnlyMs} domCells={stat.domCells} rowsPerSec={stat.rowsPerSec}
        cellsPerSec={stat.cellsPerSec} derivTotal={stat.derivTotal} derivTableAttrs={stat.derivTableAttrs}
        derivVisibleColumns={stat.derivVisibleColumns} derivColumnedRows={stat.derivColumnedRows}
        derivRows={stat.derivRows} derivInjectedRows={stat.derivInjectedRows} derivPageRows={stat.derivPageRows}
        derivInjectedPageRows={stat.derivInjectedPageRows} derivHeaderRows={stat.derivHeaderRows}
        interactionMs={stat.interactionMs} interactionPaintMs={stat.interactionPaintMs}
        scenarioLongestTaskMs={stat.scenarioLongestTaskMs} scenarioMutations={stat.scenarioMutations}
        scenarioLoafScriptMaxMs={stat.scenarioLoafScriptMaxMs} · longestTaskMs={longTaskSupported
            ? displayLongestTaskMs
            : 'n/a'}
        longTasks10s={longTaskSupported ? displayLongTaskCount : 'n/a'} rafP95Ms={displayRafP95Ms}
        mutations10s={displayMutationCount} loaf10s={loafSupported ? displayLoafCount : 'n/a'}
        loafScriptMaxMs={loafSupported ? displayLoafScriptMaxMs : 'n/a'} heapAllocKbPerSec={heapSupported
            ? displayHeapAllocKbPerSec
            : 'n/a'}
    </div>

    <div
        class="preview"
        data-testid="perf-preview"
        data-variant={renderVariant}
        bind:this={previewEl}
    >
        {#if currentVm}
            {#key currentVm}
                <PerfTable vm={currentVm} />
            {/key}
        {/if}
    </div>
</div>

<style>
    .page {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
        height: 100vh;
        box-sizing: border-box;
    }
    h1 {
        margin: 0;
        font-size: 1.1rem;
    }
    .lede {
        margin: 0;
        font-size: 0.85rem;
        color: #555;
    }
    .lede code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        background: #edf2f7;
        padding: 0 4px;
        border-radius: 3px;
    }
    .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    .presets button {
        padding: 0.4rem 0.75rem;
        font-size: 0.85rem;
        border: 1px solid #cbd5e0;
        border-radius: 0.25rem;
        background: #edf2f7;
        cursor: pointer;
    }
    .presets button:hover:not(:disabled) {
        background: #e2e8f0;
    }
    .stats {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.7rem;
        color: #2d3748;
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        padding: 0.5rem 0.75rem;
        line-height: 1.5;
        word-break: break-word;
    }
    .preview {
        flex: 1;
        min-height: 0;
        overflow: auto;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        padding: 0.5rem;
        background: white;
    }
</style>
