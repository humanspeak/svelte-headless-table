<script lang="ts">
    import { writable } from 'svelte/store'
    import { Render, Subscribe, createTable } from '@humanspeak/svelte-headless-table'
    import { addVirtualScroll, addSortBy } from '@humanspeak/svelte-headless-table/plugins'

    // Simple data item
    interface DataItem {
        id: number
        name: string
        email: string
        company: string
        department: string
        salary: number
    }

    // Fast data generation
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
                salary: 30000 + ((id * 1234) % 170000)
            })
        }
        return items
    }

    // State
    const initialSize = 1000
    let totalItemsLoaded = $state(initialSize)
    const hasMore = writable(true)
    const data = writable<DataItem[]>(generateItems(initialSize))

    let loadingMore = $state(false)

    // Create table with virtual scroll
    const table = createTable(data, {
        sort: addSortBy(),
        virtualScroll: addVirtualScroll<DataItem>({
            estimatedRowHeight: 40,
            bufferSize: 10,
            onLoadMore: loadMoreItems,
            hasMore,
            loadMoreThreshold: 200
        })
    })

    async function loadMoreItems(): Promise<void> {
        if (loadingMore) return
        loadingMore = true

        await new Promise((resolve) => setTimeout(resolve, 300))

        const newItems = generateItems(1000, totalItemsLoaded)
        data.update((d) => [...d, ...newItems])
        totalItemsLoaded += 1000

        if (totalItemsLoaded >= 50000) {
            hasMore.set(false)
        }

        loadingMore = false
    }

    function loadLargeBatch(size: number) {
        const newData = generateItems(size)
        data.set(newData)
        totalItemsLoaded = size
        hasMore.set(size < 50000)
    }

    const columns = table.createColumns([
        table.column({
            header: 'ID',
            accessor: 'id',
            plugins: { sort: {} }
        }),
        table.column({
            header: 'Name',
            accessor: 'name',
            plugins: { sort: {} }
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
        })
    ])

    const { headerRows, pageRows, tableAttrs, tableBodyAttrs, pluginStates, visibleColumns } =
        table.createViewModel(columns)

    const {
        virtualScroll,
        topSpacerHeight,
        bottomSpacerHeight,
        visibleRange,
        totalRows,
        renderedRows,
        isLoading,
        scrollToIndex,
        measureRowAction
    } = pluginStates.virtualScroll

    let jumpToRow = $state(0)

    function handleJumpToRow() {
        scrollToIndex(jumpToRow, { align: 'start', behavior: 'smooth' })
    }
</script>

<div class="controls">
    <div class="control-row">
        <span class="label">Load rows:</span>
        <button onclick={() => loadLargeBatch(1000)}>1K</button>
        <button onclick={() => loadLargeBatch(10000)}>10K</button>
        <button onclick={() => loadLargeBatch(50000)}>50K</button>
        <button onclick={() => loadLargeBatch(100000)}>100K</button>
    </div>
    <div class="control-row">
        <label>
            Jump to row:
            <input type="number" min={0} max={$totalRows - 1} bind:value={jumpToRow} />
            <button onclick={handleJumpToRow}>Go</button>
        </label>
    </div>
</div>

<div class="stats">
    <div class="stat">
        <span class="stat-label">Total Rows:</span>
        <span class="stat-value">{$totalRows.toLocaleString()}</span>
    </div>
    <div class="stat">
        <span class="stat-label">Rendered:</span>
        <span class="stat-value">{$renderedRows}</span>
    </div>
    <div class="stat">
        <span class="stat-label">Visible Range:</span>
        <span class="stat-value">{$visibleRange.start} - {$visibleRange.end}</span>
    </div>
    <div class="stat">
        <span class="stat-label">Loading:</span>
        <span class="stat-value">{$isLoading ? 'Yes' : 'No'}</span>
    </div>
</div>

<p class="hint">
    Scroll down to trigger infinite loading, or use buttons to load large datasets instantly.
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
            {#if $topSpacerHeight > 0}
                <tr class="spacer-row">
                    <td
                        colspan={$visibleColumns.length}
                        style="height: {$topSpacerHeight}px; padding: 0; border: none;"
                    ></td>
                </tr>
            {/if}

            {#each $pageRows as row (row.id)}
                <Subscribe attrs={row.attrs()} let:attrs>
                    <tr {...attrs} use:measureRowAction={row.id}>
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
                <tr class="spacer-row">
                    <td
                        colspan={$visibleColumns.length}
                        style="height: {$bottomSpacerHeight}px; padding: 0; border: none;"
                    ></td>
                </tr>
            {/if}

            {#if $isLoading}
                <tr class="loading-row">
                    <td colspan={$visibleColumns.length}> Loading more rows... </td>
                </tr>
            {/if}
        </tbody>
    </table>
</div>

<style>
    .controls {
        margin-bottom: 1rem;
        padding: 1rem;
        background: var(--color-surface-2, #f5f5f5);
        border-radius: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
    }

    .control-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .control-row .label {
        font-weight: 500;
    }

    .control-row button {
        padding: 0.25rem 0.75rem;
        cursor: pointer;
        border: 1px solid var(--color-border, #ccc);
        border-radius: 4px;
        background: var(--color-surface-1, white);
    }

    .control-row button:hover {
        background: var(--color-surface-3, #e0e0e0);
    }

    .control-row input[type='number'] {
        width: 80px;
        padding: 0.25rem;
        border: 1px solid var(--color-border, #ccc);
        border-radius: 4px;
    }

    .stats {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .stat {
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: var(--color-surface-2, #f5f5f5);
        border-radius: 4px;
    }

    .stat-label {
        font-weight: 500;
    }

    .stat-value {
        font-family: monospace;
        color: var(--color-primary, #0066cc);
    }

    .hint {
        color: var(--color-text-muted, #666);
        font-style: italic;
        margin-bottom: 0.5rem;
    }

    .table-container {
        height: 400px;
        overflow-y: auto;
        border: 1px solid var(--color-border, #ccc);
        border-radius: 4px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead {
        position: sticky;
        top: 0;
        background: var(--color-surface-2, #f5f5f5);
        z-index: 1;
    }

    th,
    td {
        padding: 0.5rem 0.75rem;
        text-align: left;
        border-bottom: 1px solid var(--color-border, #ddd);
    }

    th {
        font-weight: 600;
        cursor: pointer;
        user-select: none;
    }

    th:hover {
        background: var(--color-surface-3, #e0e0e0);
    }

    th.sorted {
        background: var(--color-primary-light, #e6f2ff);
    }

    .sort-indicator {
        margin-left: 0.5rem;
        font-size: 0.8em;
    }

    tbody tr:hover {
        background: var(--color-surface-1, #fafafa);
    }

    .loading-row td {
        text-align: center;
        padding: 1rem;
        color: var(--color-text-muted, #666);
        font-style: italic;
    }
</style>
