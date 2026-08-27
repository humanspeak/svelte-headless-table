<script lang="ts">
    import { SvelteMap } from 'svelte/reactivity'
    import { writable } from 'svelte/store'
    import { Render, Subscribe, createTable } from '../../lib/index.js'
    import { addVirtualScroll } from '../../lib/plugins/index.js'

    interface DataItem {
        id: number
        name: string
        department: string
        salary: number
    }

    const departments = [
        'Engineering',
        'Sales',
        'Marketing',
        'HR',
        'Finance',
        'Operations',
        'Legal',
        'Support'
    ]

    /** Stands in for a paged remote endpoint over a multi-million-row result set. */
    const DATASET_SIZE = 4_000_000
    const PAGE_SIZE = 200
    /** Pages kept resident before the oldest are evicted. */
    const MAX_RESIDENT_PAGES = 6

    function fetchPage(page: number): DataItem[] {
        const start = page * PAGE_SIZE
        return Array.from({ length: PAGE_SIZE }, (_, i) => {
            const id = start + i
            return {
                id,
                name: `Row ${id.toLocaleString()}`,
                department: departments[id % departments.length],
                salary: 30000 + ((id * 1234) % 170000)
            }
        })
    }

    // The caller's sparse cache: page number -> rows. Insertion order doubles as
    // the eviction order.
    const cache = new SvelteMap<number, DataItem[]>()
    let fetches = $state(0)
    let evictions = $state(0)
    // Pages currently published as `data`, so an unchanged window is a no-op.
    let publishedFirstPage = -1
    let publishedLastPage = -1

    const datasetRows = writable(DATASET_SIZE)
    const dataOffset = writable(0)
    const data = writable<DataItem[]>([])

    /**
     * Fetch every page intersecting the range, evict the pages that have
     * scrolled far out of view, then publish the contiguous slab covering the
     * range as the table's data.
     */
    function loadRange(start: number, end: number) {
        const firstPage = Math.floor(start / PAGE_SIZE)
        const lastPage = Math.floor(Math.max(start, end - 1) / PAGE_SIZE)

        // Compression means the range advances every few container pixels, so
        // most calls land on the same pages. Republishing would rebuild the
        // whole view model for identical content.
        if (firstPage === publishedFirstPage && lastPage === publishedLastPage) {
            return
        }

        for (let page = firstPage; page <= lastPage; page++) {
            if (!cache.has(page)) {
                cache.set(page, fetchPage(page))
                fetches += 1
            }
        }

        // Evict least-recently-fetched pages outside the current window.
        if (cache.size > MAX_RESIDENT_PAGES) {
            for (const page of [...cache.keys()]) {
                if (cache.size <= MAX_RESIDENT_PAGES) break
                if (page >= firstPage && page <= lastPage) continue
                cache.delete(page)
                evictions += 1
            }
        }

        const rows: DataItem[] = []
        for (let page = firstPage; page <= lastPage; page++) {
            for (const row of cache.get(page) ?? []) {
                rows.push(row)
            }
        }
        publishedFirstPage = firstPage
        publishedLastPage = lastPage
        dataOffset.set(firstPage * PAGE_SIZE)
        data.set(rows)
    }

    const table = createTable(data, {
        virtualScroll: addVirtualScroll<DataItem>({
            estimatedRowHeight: 40,
            bufferSize: 10,
            totalRows: datasetRows,
            dataOffset,
            // Synchronous here, so the signal is moot — a real endpoint should
            // pass it to fetch and re-check `signal.aborted` before publishing.
            onRangeChange: ({ start, end }) => loadRange(start, end)
        })
    })

    const columns = table.createColumns([
        table.column({ header: 'ID', accessor: 'id' }),
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Department', accessor: 'department' }),
        table.column({
            header: 'Salary',
            accessor: (item) => `$${item.salary.toLocaleString()}`
        })
    ])

    const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates, visibleColumns } =
        table.createViewModel(columns)

    const {
        virtualScroll,
        topSpacerHeight,
        bottomSpacerHeight,
        visibleRange,
        totalHeight,
        totalRows,
        renderedRows,
        scrollToIndex,
        measureRowAction
    } = pluginStates.virtualScroll

    let jumpToRow = $state(2_000_000)

    function handleJumpToRow() {
        scrollToIndex(jumpToRow, { align: 'start' })
    }
</script>

<main>
    <h1>Virtual Scroll &mdash; Sparse Mode</h1>
    <p class="hint">
        A {DATASET_SIZE.toLocaleString()}-row dataset served in {PAGE_SIZE}-row pages, with at most
        {MAX_RESIDENT_PAGES} pages held in memory &mdash; only the pages you look at are ever fetched.
        Jump anywhere: the scroll range is compressed to stay under the browser's element-height cap,
        so all {DATASET_SIZE.toLocaleString()} rows stay reachable.
    </p>

    <section class="controls">
        <div class="control-group">
            <label>
                Jump to row:
                <input type="number" min={0} max={DATASET_SIZE - 1} bind:value={jumpToRow} />
                <button onclick={handleJumpToRow}>Go</button>
            </label>
        </div>
    </section>

    <section class="stats">
        <div class="stat-grid">
            <div class="stat">
                <span class="stat-label">Total Rows:</span>
                <span class="stat-value">{$totalRows.toLocaleString()}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Rows in Memory:</span>
                <span class="stat-value">{(cache.size * PAGE_SIZE).toLocaleString()}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Rendered Rows:</span>
                <span class="stat-value">{$renderedRows}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Visible Range:</span>
                <span class="stat-value"
                    >{$visibleRange.start.toLocaleString()} - {$visibleRange.end.toLocaleString()}</span
                >
            </div>
            <div class="stat">
                <span class="stat-label">Pages Fetched:</span>
                <span class="stat-value">{fetches}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Pages Evicted:</span>
                <span class="stat-value">{evictions}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Total Height:</span>
                <span class="stat-value">{Math.round($totalHeight).toLocaleString()}px</span>
            </div>
            <div class="stat">
                <span class="stat-label">Top Spacer:</span>
                <span class="stat-value">{Math.round($topSpacerHeight).toLocaleString()}px</span>
            </div>
            <div class="stat">
                <span class="stat-label">Bottom Spacer:</span>
                <span class="stat-value">{Math.round($bottomSpacerHeight).toLocaleString()}px</span>
            </div>
        </div>
    </section>

    <section class="table-section">
        <div class="table-container" use:virtualScroll>
            <table {...$tableAttrs}>
                <colgroup>
                    <col style="width: 15%" />
                    <col style="width: 40%" />
                    <col style="width: 25%" />
                    <col style="width: 20%" />
                </colgroup>
                <thead>
                    {#each $headerRows as headerRow (headerRow.id)}
                        <Subscribe attrs={headerRow.attrs()} let:attrs>
                            <tr {...attrs}>
                                {#each headerRow.cells as cell (cell.id)}
                                    <Subscribe attrs={cell.attrs()} let:attrs>
                                        <th {...attrs}>
                                            <Render of={cell.render()} />
                                        </th>
                                    </Subscribe>
                                {/each}
                            </tr>
                        </Subscribe>
                    {/each}
                </thead>
                <tbody {...$tableBodyAttrs}>
                    {#if $topSpacerHeight > 0}
                        <tr class="spacer-row" data-spacer="top">
                            <td
                                colspan={$visibleColumns.length}
                                style="height: {$topSpacerHeight}px; padding: 0; border: none;"
                            ></td>
                        </tr>
                    {/if}

                    {#each $pageRows as row (row.id)}
                        <Subscribe attrs={row.attrs()} props={row.props()} let:attrs let:props>
                            <tr
                                {...attrs}
                                data-virtual-index={props.virtualScroll.virtualIndex}
                                use:measureRowAction={row.id}
                            >
                                {#each row.cells as cell (cell.id)}
                                    <Subscribe attrs={cell.attrs()} let:attrs>
                                        <td {...attrs}>
                                            <Render of={cell.render()} />
                                        </td>
                                    </Subscribe>
                                {/each}
                            </tr>
                        </Subscribe>
                    {/each}

                    {#if $bottomSpacerHeight > 0}
                        <tr class="spacer-row" data-spacer="bottom">
                            <td
                                colspan={$visibleColumns.length}
                                style="height: {$bottomSpacerHeight}px; padding: 0; border: none;"
                            ></td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </section>
</main>

<style>
    main {
        font-family: system-ui, sans-serif;
        margin: 0 auto;
        max-width: 1100px;
        padding: 1rem;
    }
    .hint {
        color: #555;
    }
    .controls,
    .stats {
        background: #f6f6f6;
        border-radius: 6px;
        margin-bottom: 1rem;
        padding: 0.75rem 1rem;
    }
    .stat-grid {
        display: grid;
        gap: 0.5rem 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    .stat-label {
        color: #666;
        margin-right: 0.35rem;
    }
    .stat-value {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
    }
    .table-container {
        border: 1px solid #ddd;
        height: 500px;
        overflow-y: auto;
    }
    table {
        border-collapse: collapse;
        table-layout: fixed;
        width: 100%;
    }
    th,
    td {
        border-bottom: 1px solid #eee;
        padding: 0.5rem;
        text-align: left;
    }
    th {
        background: #fff;
        position: sticky;
        top: 0;
    }
    .spacer-row td {
        border: none;
    }
</style>
