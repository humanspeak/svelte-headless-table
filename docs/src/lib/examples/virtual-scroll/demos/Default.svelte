<script lang="ts">
    import { writable } from 'svelte/store'
    import { Render, Subscribe, createTable } from '@humanspeak/svelte-headless-table'
    import { addVirtualScroll, addSortBy } from '@humanspeak/svelte-headless-table/plugins'
    import { ChevronDown, ChevronUp, MoveDown, MoveRight } from '@lucide/svelte'

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

<div class="vs-toolbar">
    <fieldset class="vs-panel">
        <legend>Load rows</legend>
        <div class="vs-row">
            <button type="button" class="vs-btn" onclick={() => loadLargeBatch(1000)}>1K</button>
            <button type="button" class="vs-btn" onclick={() => loadLargeBatch(10000)}>10K</button>
            <button type="button" class="vs-btn" onclick={() => loadLargeBatch(50000)}>50K</button>
            <button type="button" class="vs-btn" onclick={() => loadLargeBatch(100000)}>100K</button
            >
        </div>
    </fieldset>

    <fieldset class="vs-panel">
        <legend>Jump to row</legend>
        <div class="vs-row">
            <input
                type="number"
                min={0}
                max={$totalRows - 1}
                bind:value={jumpToRow}
                class="vs-input"
                aria-label="Row index"
            />
            <button type="button" class="vs-btn vs-btn--icon" onclick={handleJumpToRow}>
                <MoveRight size={14} strokeWidth={2.25} />
                go
            </button>
        </div>
    </fieldset>

    <fieldset class="vs-panel vs-stats">
        <legend>State</legend>
        <dl>
            <div>
                <dt>total</dt>
                <dd class="num">{$totalRows.toLocaleString()}</dd>
            </div>
            <div>
                <dt>rendered</dt>
                <dd class="num">{$renderedRows}</dd>
            </div>
            <div>
                <dt>visible</dt>
                <dd class="num">{$visibleRange.start}–{$visibleRange.end}</dd>
            </div>
            <div>
                <dt>loading</dt>
                <dd class="num" class:on={$isLoading}>{$isLoading ? 'yes' : 'no'}</dd>
            </div>
        </dl>
    </fieldset>
</div>

<p class="vs-hint">
    <MoveDown size={12} strokeWidth={2.5} />
    scroll the panel to trigger infinite loading, or hit one of the size buttons above to load a large
    dataset instantly.
</p>

<div class="vs-shell" use:virtualScroll>
    <table {...$tableAttrs} class="vs-table">
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
                                    <span class="vs-th-inner">
                                        <Render of={cell.render()} />
                                        {#if props.sort.order === 'asc'}
                                            <ChevronDown size={12} strokeWidth={2.5} />
                                        {:else if props.sort.order === 'desc'}
                                            <ChevronUp size={12} strokeWidth={2.5} />
                                        {/if}
                                    </span>
                                </th>
                            </Subscribe>
                        {/each}
                    </tr>
                </Subscribe>
            {/each}
        </thead>
        <tbody {...$tableBodyAttrs}>
            {#if $topSpacerHeight > 0}
                <tr class="vs-spacer">
                    <td colspan={$visibleColumns.length} style="height: {$topSpacerHeight}px;"></td>
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
                <tr class="vs-spacer">
                    <td colspan={$visibleColumns.length} style="height: {$bottomSpacerHeight}px;"
                    ></td>
                </tr>
            {/if}

            {#if $isLoading}
                <tr class="vs-loading">
                    <td colspan={$visibleColumns.length}> loading more rows… </td>
                </tr>
            {/if}
        </tbody>
    </table>
</div>

<style>
    /* ── Toolbar ────────────────────────────────────────────────────── */
    .vs-toolbar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
    }

    .vs-panel {
        border: 1px solid var(--border);
        background: var(--background);
        margin: 0;
        padding: 12px 14px 14px;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.8em;
    }
    .vs-panel legend {
        padding: 0 6px;
        font-family: var(--prose-sans), system-ui, sans-serif;
        font-size: 0.7em;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--foreground) 70%, transparent);
    }

    .vs-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
    }

    .vs-btn {
        all: unset;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.9em;
        color: var(--foreground);
        border: 1px solid var(--border);
        background: var(--background);
        cursor: pointer;
        transition:
            background 100ms ease,
            color 100ms ease,
            border-color 100ms ease;
    }
    .vs-btn:hover:not(:disabled) {
        background: var(--foreground);
        color: var(--background);
        border-color: var(--foreground);
    }
    .vs-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
    .vs-btn--icon :global(svg) {
        margin-right: 2px;
    }

    .vs-input {
        flex: 1 1 0;
        min-width: 0;
        max-width: 120px;
        padding: 3px 8px;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.9em;
        color: var(--foreground);
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 0;
        outline: none;
    }
    .vs-input:focus {
        border-color: var(--color-brand-500, var(--foreground));
    }

    /* ── Stats panel ────────────────────────────────────────────────── */
    .vs-stats dl {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 4px 14px;
        margin: 0;
    }
    .vs-stats dl > div {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
    }
    .vs-stats dt {
        font-size: 0.7em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--foreground) 65%, transparent);
    }
    .vs-stats dd {
        margin: 0;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        color: var(--foreground);
    }
    .vs-stats dd.on {
        color: var(--color-brand-500, var(--foreground));
    }

    /* ── Hint ───────────────────────────────────────────────────────── */
    .vs-hint {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin: 0 0 10px;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.78em;
        color: color-mix(in srgb, var(--foreground) 65%, transparent);
    }

    /* ── Table shell ────────────────────────────────────────────────── */
    .vs-shell {
        height: 480px;
        border: 1px solid var(--border);
        background: var(--background);
        overflow-y: auto;
    }

    .vs-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.85em;
        color: var(--foreground);
    }

    .vs-table thead {
        position: sticky;
        top: 0;
        z-index: 1;
        background: color-mix(in srgb, var(--muted, var(--foreground)) 12%, var(--background));
    }

    .vs-table th,
    .vs-table td {
        padding: 6px 10px;
        text-align: left;
        border-bottom: 1px solid var(--border);
        border-right: 1px solid var(--border);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .vs-table th:last-child,
    .vs-table td:last-child {
        border-right: 0;
    }

    .vs-table th {
        font-family: var(--prose-sans), system-ui, sans-serif;
        font-weight: 600;
        font-size: 0.7em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--foreground) 70%, transparent);
        cursor: pointer;
        user-select: none;
    }
    .vs-table th:hover {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 6%, transparent);
    }
    .vs-table th.sorted {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 14%, transparent);
        color: var(--foreground);
    }
    .vs-th-inner {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .vs-table tbody tr {
        transition: background 80ms ease;
    }
    .vs-table tbody tr:hover {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 5%, transparent);
    }
    .vs-table tbody tr:nth-child(even):not(.vs-spacer):not(.vs-loading) {
        background: color-mix(in srgb, var(--muted, var(--foreground)) 3%, transparent);
    }

    /* Spacer rows hold scrollbar position for the virtual window.
       They must have no borders / padding so they don't add measurable
       height beyond the inline `style="height: …"` set on the <td>. */
    .vs-spacer td {
        padding: 0 !important;
        border: 0 !important;
        background: transparent;
    }

    .vs-loading td {
        text-align: center;
        padding: 12px;
        font-style: italic;
        color: color-mix(in srgb, var(--foreground) 65%, transparent);
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 4%, transparent);
    }
</style>
