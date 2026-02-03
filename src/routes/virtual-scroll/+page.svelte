<script lang="ts">
    import { writable } from 'svelte/store'
    import { Render, Subscribe, createTable } from '../../lib/index.js'
    import { addVirtualScroll, addSortBy } from '../../lib/plugins/index.js'

    // Simple data item - no faker for fast generation
    interface DataItem {
        id: number
        name: string
        email: string
        company: string
        department: string
        salary: number
        startDate: string
    }

    // Fast data generation without faker
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
    const firstNames = [
        'Alice',
        'Bob',
        'Carol',
        'David',
        'Emma',
        'Frank',
        'Grace',
        'Henry',
        'Ivy',
        'Jack'
    ]
    const lastNames = [
        'Smith',
        'Johnson',
        'Williams',
        'Brown',
        'Jones',
        'Garcia',
        'Miller',
        'Davis',
        'Wilson',
        'Moore'
    ]
    const companies = [
        'Acme Corp',
        'TechStart',
        'Global Inc',
        'DataFlow',
        'CloudNine',
        'ByteWorks',
        'NetSphere',
        'CodeBase'
    ]

    function generateItems(count: number, startId: number = 0): DataItem[] {
        const items: DataItem[] = []
        for (let i = 0; i < count; i++) {
            const id = startId + i
            const firstName = firstNames[id % firstNames.length]
            const lastName = lastNames[(id * 7) % lastNames.length]
            items.push({
                id,
                name: `${firstName} ${lastName}`,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${id}@example.com`,
                company: companies[id % companies.length],
                department: departments[id % departments.length],
                salary: 30000 + ((id * 1234) % 170000),
                startDate: new Date(2015 + (id % 10), id % 12, 1 + (id % 28)).toLocaleDateString()
            })
        }
        return items
    }

    // State - start with 1000 rows (fast to generate)
    const initialSize = 1000
    let totalItemsLoaded = $state(initialSize)
    const hasMore = writable(true)
    const data = writable<DataItem[]>(generateItems(initialSize))

    // Track loading state for infinite scroll
    let loadingMore = $state(false)

    // Create table with virtual scroll
    // estimatedRowHeight is just for initial render - actual heights are measured automatically
    const table = createTable(data, {
        sort: addSortBy(),
        virtualScroll: addVirtualScroll<DataItem>({
            estimatedRowHeight: 40,
            bufferSize: 10,
            onLoadMore: loadMoreItems,
            hasMore,
            loadMoreThreshold: 200,
            debug: true
        })
    })

    // Simulated API call for infinite scroll
    async function loadMoreItems(): Promise<void> {
        if (loadingMore) return
        loadingMore = true

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 300))

        const newItems = generateItems(1000, totalItemsLoaded)
        data.update((d) => [...d, ...newItems])
        totalItemsLoaded += 1000

        // Stop after 50,000 items for demo
        if (totalItemsLoaded >= 50000) {
            hasMore.set(false)
        }

        loadingMore = false
    }

    // Load a large batch instantly
    function loadLargeBatch(size: number) {
        const start = performance.now()
        const newData = generateItems(size)
        data.set(newData)
        totalItemsLoaded = size
        hasMore.set(size < 50000)
        const elapsed = performance.now() - start
        console.log(`Generated ${size} rows in ${elapsed.toFixed(2)}ms`)
    }

    const columns = table.createColumns([
        table.column({
            header: 'ID',
            accessor: 'id',
            plugins: {
                sort: {}
            }
        }),
        table.column({
            header: 'Name',
            accessor: 'name',
            plugins: {
                sort: {}
            }
        }),
        table.column({
            header: 'Email',
            accessor: 'email'
        }),
        table.column({
            header: 'Company',
            accessor: 'company'
        }),
        table.column({
            header: 'Department',
            accessor: 'department'
        }),
        table.column({
            header: 'Salary',
            accessor: (item) => `$${item.salary.toLocaleString()}`,
            plugins: {
                sort: {
                    getSortValue: (item) => item.salary
                }
            }
        }),
        table.column({
            header: 'Start Date',
            accessor: 'startDate'
        })
    ])

    const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates, visibleColumns } =
        table.createViewModel(columns)

    const { sortKeys } = pluginStates.sort
    const {
        virtualScroll,
        topSpacerHeight,
        bottomSpacerHeight,
        visibleRange,
        totalHeight,
        totalRows,
        renderedRows,
        isLoading,
        scrollToIndex,
        measureRowAction
    } = pluginStates.virtualScroll

    // Jump to row input
    let jumpToRow = $state(0)

    function handleJumpToRow() {
        scrollToIndex(jumpToRow, { align: 'start', behavior: 'smooth' })
    }

    // DEBUG: Log when pageRows changes
    $effect(() => {
        console.log('[Template] pageRows updated', {
            count: $pageRows.length,
            rowIds:
                $pageRows
                    .slice(0, 5)
                    .map((r) => r.id)
                    .join(',') + ($pageRows.length > 5 ? '...' : '')
        })
    })
</script>

<main>
    <h1>Virtual Scroll Example</h1>
    <p>
        <a href="/">&larr; Back to examples</a>
    </p>

    <section class="controls">
        <h2>Controls</h2>
        <div class="control-grid">
            <div class="control-group">
                <span>Load rows:</span>
                <button onclick={() => loadLargeBatch(1000)}>1K</button>
                <button onclick={() => loadLargeBatch(10000)}>10K</button>
                <button onclick={() => loadLargeBatch(50000)}>50K</button>
                <button onclick={() => loadLargeBatch(100000)}>100K</button>
            </div>
            <div class="control-group">
                <label>
                    Jump to row:
                    <input type="number" min={0} max={$totalRows - 1} bind:value={jumpToRow} />
                    <button onclick={handleJumpToRow}>Go</button>
                </label>
            </div>
        </div>
    </section>

    <section class="stats">
        <h2>Statistics</h2>
        <div class="stat-grid">
            <div class="stat">
                <span class="stat-label">Total Rows:</span>
                <span class="stat-value">{$totalRows.toLocaleString()}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Rendered Rows:</span>
                <span class="stat-value">{$renderedRows}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Visible Range:</span>
                <span class="stat-value">{$visibleRange.start} - {$visibleRange.end}</span>
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
            <div class="stat">
                <span class="stat-label">Loading More:</span>
                <span class="stat-value">{$isLoading ? 'Yes' : 'No'}</span>
            </div>
        </div>
    </section>

    <section class="table-section">
        <h2>Table</h2>
        <p class="hint">
            Scroll down to trigger infinite loading, or use the buttons above to load large
            datasets.
        </p>
        <div class="table-container" use:virtualScroll>
            <table {...$tableAttrs}>
                <thead>
                    {#each $headerRows as headerRow (headerRow.id)}
                        <Subscribe attrs={headerRow.attrs()} let:attrs>
                            <tr {...attrs}>
                                {#each headerRow.cells as cell (cell.id)}
                                    <Subscribe
                                        attrs={cell.attrs()}
                                        let:attrs
                                        props={cell.props()}
                                        let:props
                                    >
                                        <th
                                            {...attrs}
                                            onclick={props.sort.toggle}
                                            class:sorted={props.sort.order !== undefined}
                                        >
                                            <Render of={cell.render()} />
                                            {#if props.sort.order === 'asc'}
                                                <span class="sort-indicator">▲</span>
                                            {:else if props.sort.order === 'desc'}
                                                <span class="sort-indicator">▼</span>
                                            {/if}
                                        </th>
                                    </Subscribe>
                                {/each}
                            </tr>
                        </Subscribe>
                    {/each}
                </thead>
                <tbody {...$tableBodyAttrs}>
                    <!-- Top spacer row -->
                    {#if $topSpacerHeight > 0}
                        <tr class="spacer-row" data-spacer="top" data-height={$topSpacerHeight}>
                            <td
                                colspan={$visibleColumns.length}
                                style="height: {$topSpacerHeight}px; padding: 0; border: none; background: #ffe0e0;"
                            ></td>
                        </tr>
                    {/if}

                    <!-- Visible rows -->
                    {#each $pageRows as row (row.id)}
                        <Subscribe attrs={row.attrs()} let:attrs>
                            <tr {...attrs} data-row-id={row.id} use:measureRowAction={row.id}>
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

                    <!-- Bottom spacer row -->
                    {#if $bottomSpacerHeight > 0}
                        <tr
                            class="spacer-row"
                            data-spacer="bottom"
                            data-height={$bottomSpacerHeight}
                        >
                            <td
                                colspan={$visibleColumns.length}
                                style="height: {$bottomSpacerHeight}px; padding: 0; border: none; background: #e0e0ff;"
                            ></td>
                        </tr>
                    {/if}

                    <!-- Loading indicator -->
                    {#if $isLoading}
                        <tr class="loading-row">
                            <td colspan={$visibleColumns.length}> Loading more rows... </td>
                        </tr>
                    {/if}
                </tbody>
            </table>
        </div>
    </section>

    <section class="usage">
        <h2>Usage</h2>
        <pre><code
                >{`const table = createTable(data, {
    virtualScroll: addVirtualScroll({
        estimatedRowHeight: 48,
        bufferSize: 10,
        onLoadMore: async () => {
            const more = await fetchMoreItems()
            data.update(d => [...d, ...more])
        },
        hasMore: hasMoreStore
    })
})

const {
    virtualScroll,
    topSpacerHeight,
    bottomSpacerHeight
} = table.pluginStates.virtualScroll

// In template:
<div class="table-container" use:virtualScroll>
    <table>
        <tbody>
            <tr><td style="height: {$topSpacerHeight}px" /></tr>
            {#each $pageRows as row}
                <tr>...</tr>
            {/each}
            <tr><td style="height: {$bottomSpacerHeight}px" /></tr>
        </tbody>
    </table>
</div>`}</code
            ></pre>
    </section>
</main>

<style>
    main {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        font-family: sans-serif;
    }

    h1 {
        margin-bottom: 0.5rem;
    }

    h2 {
        margin-top: 2rem;
        margin-bottom: 1rem;
        border-bottom: 2px solid #333;
        padding-bottom: 0.5rem;
    }

    .controls {
        margin: 1rem 0;
        padding: 1rem;
        border: 2px solid #0066cc;
        border-radius: 8px;
        background: #e6f2ff;
    }

    .controls h2 {
        margin-top: 0;
        color: #0066cc;
        border-bottom-color: #0066cc;
    }

    .control-grid {
        display: flex;
        gap: 2rem;
        align-items: center;
        flex-wrap: wrap;
    }

    .control-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .control-group input[type='number'] {
        width: 80px;
        padding: 0.25rem;
    }

    .control-group button {
        padding: 0.25rem 0.75rem;
        cursor: pointer;
    }

    .stats {
        margin: 1rem 0;
        padding: 1rem;
        border: 2px solid #28a745;
        border-radius: 8px;
        background: #e6ffe6;
    }

    .stats h2 {
        margin-top: 0;
        color: #28a745;
        border-bottom-color: #28a745;
    }

    .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
    }

    .stat {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem;
        background: white;
        border-radius: 4px;
    }

    .stat-label {
        font-weight: bold;
        color: #333;
    }

    .stat-value {
        font-family: monospace;
        color: #0066cc;
    }

    .table-section {
        margin: 1rem 0;
    }

    .hint {
        color: #666;
        font-style: italic;
        margin-bottom: 0.5rem;
    }

    .table-container {
        height: 500px;
        overflow-y: auto;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead {
        position: sticky;
        top: 0;
        background: #f5f5f5;
        z-index: 1;
    }

    th,
    td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #ddd;
    }

    th {
        font-weight: bold;
        cursor: pointer;
        user-select: none;
    }

    th:hover {
        background: #e0e0e0;
    }

    th.sorted {
        background: #d4edda;
    }

    .sort-indicator {
        margin-left: 0.5rem;
        font-size: 0.8em;
    }

    tbody tr:hover {
        background: #f9f9f9;
    }

    .spacer-row td {
        background: transparent;
    }

    .loading-row td {
        text-align: center;
        padding: 1rem;
        color: #666;
        font-style: italic;
    }

    .usage {
        margin: 2rem 0;
    }

    .usage pre {
        background: #f5f5f5;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
    }

    .usage code {
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 0.9rem;
    }
</style>
