<script lang="ts">
    import { writable } from 'svelte/store'
    import { Render, Subscribe, createTable } from '@humanspeak/svelte-headless-table'
    import { addVirtualScroll, addSortBy } from '@humanspeak/svelte-headless-table/plugins'
    import { ChevronDown, ChevronUp, RotateCcw } from '@lucide/svelte'

    interface Person {
        id: number
        name: string
        company: string
        department: string
        salary: number
    }

    // Deterministic, fast generator — 10k rows of demo data without
    // touching faker (no extra dep, no per-row work that scales with
    // dataset growth).
    const FIRST = [
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
    const LAST = [
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
    const COMPANIES = ['Acme', 'Globex', 'Initech', 'Hooli', 'Massive', 'Stark', 'Wayne', 'Wonka']
    const DEPTS = ['Engineering', 'Sales', 'Marketing', 'Operations', 'Finance', 'Legal']

    const ROWS = 10_000

    const seedPeople = (): Person[] => {
        const out: Person[] = new Array(ROWS)
        for (let i = 0; i < ROWS; i++) {
            const first = FIRST[i % FIRST.length]
            const last = LAST[(i * 7) % LAST.length]
            out[i] = {
                id: i,
                name: `${first} ${last}`,
                company: COMPANIES[i % COMPANIES.length],
                department: DEPTS[i % DEPTS.length],
                salary: 30_000 + ((i * 1234) % 170_000)
            }
        }
        return out
    }

    const data = writable<Person[]>(seedPeople())

    const table = createTable(data, {
        sort: addSortBy(),
        virtualScroll: addVirtualScroll<Person>({
            estimatedRowHeight: 36,
            bufferSize: 8
        })
    })

    const columns = table.createColumns([
        table.column({ header: '#', accessor: 'id' }),
        table.column({ header: 'Name', accessor: 'name', plugins: { sort: {} } }),
        table.column({ header: 'Company', accessor: 'company', plugins: { sort: {} } }),
        table.column({ header: 'Department', accessor: 'department', plugins: { sort: {} } }),
        table.column({
            header: 'Salary',
            accessor: (item) => `$${item.salary.toLocaleString()}`,
            plugins: {
                sort: { getSortValue: (item) => item.salary }
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
        measureRowAction
    } = pluginStates.virtualScroll
    const { sortKeys } = pluginStates.sort

    const reset = () => {
        $sortKeys = []
        data.set(seedPeople())
    }
</script>

<div class="vs-bar">
    <span><span class="lbl">file</span> · <span class="v">virtual-scroll-sample.svelte</span></span>
    <span><span class="lbl">total</span> <span class="v">{$totalRows.toLocaleString()}</span></span>
    <span
        ><span class="lbl">window</span>
        <span class="v">{$visibleRange.start}–{$visibleRange.end}</span></span
    >
    <span><span class="lbl">rendered</span> <span class="v">{$renderedRows}</span></span>
    <span class="grow"></span>
    <button type="button" class="ctrl" onclick={reset} title="Reset sort + reseed data">
        <RotateCcw size={11} strokeWidth={2.25} />
        reset
    </button>
</div>

<div class="vs-body" use:virtualScroll>
    <table {...$tableAttrs} class="vs-tbl">
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
                                    <span class="th-inner">
                                        <Render of={cell.render()} />
                                        {#if props.sort.order === 'asc'}
                                            <ChevronDown size={11} strokeWidth={2.5} />
                                        {:else if props.sort.order === 'desc'}
                                            <ChevronUp size={11} strokeWidth={2.5} />
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
                <tr class="spacer">
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
                <tr class="spacer">
                    <td colspan={$visibleColumns.length} style="height: {$bottomSpacerHeight}px;"
                    ></td>
                </tr>
            {/if}
        </tbody>
    </table>
</div>

<div class="vs-foot">
    <div>rows · <span class="v">{$totalRows.toLocaleString()}</span></div>
    <div>cols · <span class="v">{columns.length}</span></div>
    <div>mounted · <span class="v">{$renderedRows}</span></div>
    <div>plugins · <span class="v">addVirtualScroll · addSortBy</span></div>
    <div>status · <span class="v accent">live</span></div>
</div>

<style>
    .vs-bar {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-2);
    }
    .vs-bar .lbl {
        color: var(--brut-ink-3);
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    .vs-bar .v {
        color: var(--brut-ink);
        font-variant-numeric: tabular-nums;
    }
    .vs-bar .grow {
        flex: 1 1 0;
    }
    .vs-bar .ctrl {
        all: unset;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border: 1px solid var(--brut-rule);
        background: transparent;
        color: var(--brut-ink-2);
        cursor: pointer;
        font: inherit;
        text-transform: lowercase;
    }
    .vs-bar .ctrl:hover {
        background: var(--brut-bg-2);
        color: var(--brut-ink);
    }

    .vs-body {
        height: 360px;
        overflow-y: auto;
        background: var(--brut-bg);
    }
    .vs-tbl {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        margin: 0;
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 12px;
        color: var(--brut-ink);
    }
    .vs-tbl thead {
        position: sticky;
        top: 0;
        z-index: 1;
        background: var(--brut-bg-2);
    }
    .vs-tbl th,
    .vs-tbl td {
        padding: 6px 12px;
        text-align: left;
        border-bottom: 1px solid var(--brut-rule);
        border-right: 1px solid var(--brut-rule);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .vs-tbl th:last-child,
    .vs-tbl td:last-child {
        border-right: 0;
    }
    .vs-tbl th {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-weight: 600;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
        cursor: pointer;
        user-select: none;
    }
    .vs-tbl th:hover {
        color: var(--brut-ink);
    }
    .vs-tbl th.sorted {
        color: var(--brut-accent);
    }
    .th-inner {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    .vs-tbl tbody tr:hover {
        background: var(--brut-bg-2);
    }
    .vs-tbl tbody tr:nth-child(even):not(.spacer) {
        background: color-mix(in srgb, var(--brut-ink) 2.5%, transparent);
    }
    .spacer td {
        padding: 0 !important;
        border: 0 !important;
        background: transparent;
    }

    .vs-foot {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        padding: 8px 14px;
        border-top: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.04em;
    }
    .vs-foot .v {
        color: var(--brut-ink-2);
        font-variant-numeric: tabular-nums;
    }
    .vs-foot .v.accent {
        color: var(--brut-accent);
    }
</style>
