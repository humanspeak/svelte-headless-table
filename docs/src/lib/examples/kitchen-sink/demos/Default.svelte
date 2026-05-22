<script lang="ts">
    import { derived, readable } from 'svelte/store'
    import { Render, Subscribe, createTable, createRender } from '@humanspeak/svelte-headless-table'
    import {
        addColumnFilters,
        addColumnOrder,
        addHiddenColumns,
        addSortBy,
        addTableFilter,
        addPagination,
        addExpandedRows,
        matchFilter,
        numberRangeFilter,
        textPrefixFilter,
        addSubRows,
        addGroupBy,
        addSelectedRows,
        addResizedColumns
    } from '@humanspeak/svelte-headless-table/plugins'
    import { ChevronDown, ChevronUp, Layers, Shuffle } from '@lucide/svelte'

    import { mean, sum } from '$lib/utils/math'
    import { getShuffled } from '$lib/utils/getShuffled'
    import { createSamples } from '$lib/utils/createSamples'
    import Italic from '$lib/examples/_shared/Italic.svelte'
    import Profile from '$lib/examples/_shared/Profile.svelte'
    import TextFilter from '$lib/examples/_shared/TextFilter.svelte'
    import NumberRangeFilter from '$lib/examples/_shared/NumberRangeFilter.svelte'
    import SelectFilter from '$lib/examples/_shared/SelectFilter.svelte'
    import ExpandIndicator from '$lib/examples/_shared/ExpandIndicator.svelte'
    import { getDistinct } from '$lib/utils/array'
    import SelectIndicator from '$lib/examples/_shared/SelectIndicator.svelte'

    // 200 top-level rows, each with up to 3 sub-rows — gives the
    // expand/collapse plugin actual children to toggle on click.
    const data = readable(createSamples(200, 2, 3, { seed: 42 }))

    const table = createTable(data, {
        subRows: addSubRows({
            children: 'children'
        }),
        filter: addColumnFilters(),
        tableFilter: addTableFilter({
            includeHiddenColumns: true
        }),
        group: addGroupBy({
            initialGroupByIds: []
        }),
        sort: addSortBy(),
        expand: addExpandedRows({
            initialExpandedIds: { 1: true }
        }),
        select: addSelectedRows({
            initialSelectedDataIds: { 1: true }
        }),
        orderColumns: addColumnOrder(),
        hideColumns: addHiddenColumns(),
        page: addPagination({
            initialPageSize: 20
        }),
        resize: addResizedColumns()
    })

    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: '',
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected } = pluginStates.select.getRowState(row)
                return createRender(SelectIndicator, {
                    isSelected,
                    isSomeSubRowsSelected
                })
            },
            plugins: {
                resize: {
                    disable: true
                }
            }
        }),
        table.display({
            id: 'expanded',
            header: '',
            cell: ({ row }, { pluginStates }) => {
                const { isExpanded, canExpand, isAllSubRowsExpanded } =
                    pluginStates.expand.getRowState(row)
                return createRender(ExpandIndicator, {
                    isExpanded,
                    canExpand,
                    isAllSubRowsExpanded,
                    depth: row.depth
                })
            },
            plugins: {
                resize: {
                    disable: true
                }
            }
        }),
        table.column({
            header: 'Summary',
            id: 'summary',
            accessor: (item) => item,
            cell: ({ value }) =>
                createRender(Profile, {
                    age: value.age,
                    progress: value.progress,
                    name: `${value.firstName} ${value.lastName}`
                }),
            plugins: {
                sort: {
                    getSortValue: (i) => i.lastName
                },
                tableFilter: {
                    getFilterValue: (i) => i.progress
                }
            }
        }),
        table.group({
            header: (_, { rows, pageRows }) =>
                derived(
                    [rows, pageRows],
                    ([_rows, _pageRows]) =>
                        `Name (${_rows.length} records, ${_pageRows.length} in page)`
                ),
            columns: [
                table.column({
                    header: createRender(Italic, { text: 'First Name' }),
                    accessor: 'firstName',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => getDistinct(values).length,
                            cell: ({ value }) => `${value} unique`
                        },
                        sort: {
                            invert: true
                        },
                        filter: {
                            fn: textPrefixFilter,
                            render: ({ filterValue, values }) =>
                                createRender(TextFilter, { filterValue, values })
                        }
                    }
                }),
                table.column({
                    header: () => 'Last Name',
                    accessor: 'lastName',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => getDistinct(values).length,
                            cell: ({ value }) => `${value} unique`
                        }
                    }
                })
            ]
        }),
        table.group({
            header: (_, { rows }) =>
                createRender(
                    Italic,
                    derived(rows, (_rows) => ({ text: `Info (${_rows.length} samples)` }))
                ),
            columns: [
                table.column({
                    header: 'Age',
                    accessor: 'age',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => mean(values),
                            cell: ({ value }) => `${(value as number).toFixed(2)} (avg)`
                        },
                        resize: {
                            minWidth: 50,
                            initialWidth: 100,
                            maxWidth: 200
                        }
                    }
                }),
                table.column({
                    header: 'Status',
                    id: 'status',
                    accessor: (item) => item.status,
                    plugins: {
                        sort: {
                            disable: true
                        },
                        filter: {
                            fn: matchFilter,
                            render: ({ filterValue, preFilteredValues }) =>
                                createRender(SelectFilter, { filterValue, preFilteredValues })
                        },
                        tableFilter: {
                            exclude: true
                        },
                        resize: {
                            disable: true
                        }
                    }
                }),
                table.column({
                    header: 'Visits',
                    accessor: 'visits',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => sum(values),
                            cell: ({ value }) => `${value} (total)`
                        },
                        filter: {
                            fn: numberRangeFilter,
                            initialFilterValue: [null, null],
                            render: ({ filterValue, values }) =>
                                createRender(NumberRangeFilter, { filterValue, values })
                        }
                    }
                }),
                table.column({
                    header: 'Profile Progress',
                    accessor: 'progress',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => mean(values),
                            cell: ({ value }) => `${(value as number).toFixed(2)} (avg)`
                        }
                    }
                })
            ]
        })
    ])

    const {
        flatColumns,
        headerRows,
        pageRows,
        tableAttrs,
        tableBodyAttrs,
        visibleColumns,
        pluginStates
    } = table.createViewModel(columns)
    const ids = flatColumns.map((c) => c.id)

    const { groupByIds } = pluginStates.group
    const { sortKeys } = pluginStates.sort
    const { filterValues } = pluginStates.filter
    const { filterValue } = pluginStates.tableFilter
    const { selectedDataIds } = pluginStates.select
    const { pageIndex, pageCount, pageSize, hasPreviousPage, hasNextPage } = pluginStates.page
    const { expandedIds } = pluginStates.expand
    const { columnIdOrder } = pluginStates.orderColumns
    const { hiddenColumnIds } = pluginStates.hideColumns
    const { columnWidths } = pluginStates.resize

    let hideForId: Record<string, boolean> = $state(
        Object.fromEntries(ids.map((id) => [id, false]))
    )

    $effect(() => {
        $hiddenColumnIds = Object.entries(hideForId)
            .filter(([, hide]) => hide)
            .map(([id]) => id)
    })
</script>

<div class="ks-toolbar">
    <fieldset class="ks-panel">
        <legend>Hidden columns</legend>
        <div class="ks-checks">
            {#each ids as id (id)}
                <label class="ks-check" for="hide-{id}">
                    <input id="hide-{id}" type="checkbox" bind:checked={hideForId[id]} />
                    <span>{id}</span>
                </label>
            {/each}
        </div>
    </fieldset>

    <fieldset class="ks-panel">
        <legend>Pagination</legend>
        <div class="ks-pager">
            <button
                type="button"
                class="ks-btn"
                onclick={() => $pageIndex--}
                disabled={!$hasPreviousPage}>‹ prev</button
            >
            <span class="ks-pager-meta">
                <strong>{$pageIndex + 1}</strong> / {$pageCount}
            </span>
            <button
                type="button"
                class="ks-btn"
                onclick={() => $pageIndex++}
                disabled={!$hasNextPage}>next ›</button
            >
            <label class="ks-inline" for="page-size">
                <span>rows</span>
                <input id="page-size" type="number" min={1} bind:value={$pageSize} />
            </label>
        </div>
    </fieldset>

    <fieldset class="ks-panel">
        <legend>Column order</legend>
        <button
            type="button"
            class="ks-btn ks-btn--icon"
            onclick={() => {
                // The plugin's columnIdOrder starts empty and falls back to
                // declaration order. Seed it with the live ID list on first
                // shuffle so a single click actually rearranges columns.
                const current = $columnIdOrder.length ? $columnIdOrder : ids
                $columnIdOrder = getShuffled(current)
            }}
        >
            <Shuffle size={14} strokeWidth={2.25} />
            shuffle
        </button>
    </fieldset>
</div>

<div class="ks-shell">
    <table {...$tableAttrs} class="ks-table">
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
                                    use:props.resize
                                >
                                    <div class="ks-th-inner">
                                        <span class="ks-th-label">
                                            <Render of={cell.render()} />
                                        </span>
                                        {#if props.sort.order === 'asc'}
                                            <ChevronDown size={12} strokeWidth={2.5} />
                                        {:else if props.sort.order === 'desc'}
                                            <ChevronUp size={12} strokeWidth={2.5} />
                                        {/if}
                                        {#if !props.group.disabled}
                                            <button
                                                type="button"
                                                class="ks-th-action"
                                                title={props.group.grouped
                                                    ? 'Ungroup'
                                                    : 'Group by this column'}
                                                onclick={(e) => {
                                                    e.stopPropagation()
                                                    props.group.toggle(e)
                                                }}
                                            >
                                                <Layers size={12} strokeWidth={2.25} />
                                                {props.group.grouped ? 'ungroup' : 'group'}
                                            </button>
                                        {/if}
                                    </div>
                                    {#if props.filter?.render !== undefined}
                                        <!-- trunk-ignore(eslint/svelte/a11y_click_events_have_key_events): filter wrapper exists only to stop the sort-toggle click from bubbling out of inline form inputs -->
                                        <!-- trunk-ignore(eslint/svelte/a11y_no_static_element_interactions): see above — non-interactive wrapper for inline filter controls -->
                                        <div
                                            class="ks-th-filter"
                                            onclick={(e) => e.stopPropagation()}
                                        >
                                            <Render of={props.filter.render} />
                                        </div>
                                    {/if}
                                    {#if !props.resize.disabled}
                                        <!-- trunk-ignore(eslint/svelte/a11y_click_events_have_key_events): drag handle, not a keyboard interaction surface -->
                                        <!-- trunk-ignore(eslint/svelte/a11y_no_static_element_interactions): drag handle, not a keyboard interaction surface -->
                                        <div
                                            class="ks-resizer"
                                            onclick={(e) => e.stopPropagation()}
                                            use:props.resize.drag
                                        ></div>
                                    {/if}
                                </th>
                            </Subscribe>
                        {/each}
                    </tr>
                </Subscribe>
            {/each}
            <tr class="ks-search-row">
                <th colspan={$visibleColumns.length}>
                    <input
                        type="text"
                        bind:value={$filterValue}
                        placeholder="Search all rows…"
                        class="ks-search"
                    />
                </th>
            </tr>
        </thead>
        <tbody {...$tableBodyAttrs}>
            {#each $pageRows as row (row.id)}
                <Subscribe attrs={row.attrs()} let:attrs rowProps={row.props()} let:rowProps>
                    <tr {...attrs} class:selected={rowProps.select.selected}>
                        {#each row.cells as cell (cell.id)}
                            <Subscribe
                                attrs={cell.attrs()}
                                let:attrs
                                props={cell.props()}
                                let:props
                            >
                                <td
                                    {...attrs}
                                    class:sorted={props.sort.order !== undefined}
                                    class:matches={props.tableFilter.matches}
                                    class:group={props.group.grouped}
                                    class:aggregate={props.group.aggregated}
                                    class:repeat={props.group.repeated}
                                >
                                    {#if !props.group.repeated}
                                        <Render of={cell.render()} />
                                    {/if}
                                </td>
                            </Subscribe>
                        {/each}
                    </tr>
                </Subscribe>
            {/each}
        </tbody>
    </table>
</div>

<details class="ks-state">
    <summary>plugin state · debug</summary>
    <pre>{JSON.stringify(
            {
                groupByIds: $groupByIds,
                sortKeys: $sortKeys,
                filterValues: $filterValues,
                selectedDataIds: $selectedDataIds,
                columnIdOrder: $columnIdOrder,
                hiddenColumnIds: $hiddenColumnIds,
                expandedIds: $expandedIds,
                columnWidths: $columnWidths
            },
            null,
            2
        )}</pre>
</details>

<style>
    /* ── Toolbar ────────────────────────────────────────────────────── */
    .ks-toolbar {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 14px;
    }

    .ks-panel {
        border: 1px solid var(--border);
        background: var(--background);
        margin: 0;
        padding: 12px 14px 14px;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.8em;
    }
    .ks-panel legend {
        padding: 0 6px;
        font-family: var(--prose-sans), system-ui, sans-serif;
        font-size: 0.7em;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--foreground) 70%, transparent);
    }

    .ks-checks {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 6px 12px;
    }
    .ks-check {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 0.95em;
    }
    .ks-check input {
        accent-color: var(--color-brand-500, var(--foreground));
    }

    .ks-pager {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
    }
    .ks-pager-meta {
        font-variant-numeric: tabular-nums;
        color: color-mix(in srgb, var(--foreground) 75%, transparent);
    }
    .ks-pager-meta strong {
        color: var(--foreground);
    }
    .ks-inline {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
    }
    .ks-inline span {
        font-size: 0.75em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--foreground) 65%, transparent);
    }
    .ks-inline input {
        width: 64px;
        padding: 3px 6px;
        font-family: inherit;
        font-size: 0.95em;
        color: var(--foreground);
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 0;
        outline: none;
    }
    .ks-inline input:focus {
        border-color: var(--color-brand-500, var(--foreground));
    }

    .ks-btn {
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
    .ks-btn:hover:not(:disabled) {
        background: var(--foreground);
        color: var(--background);
        border-color: var(--foreground);
    }
    .ks-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
    .ks-btn--icon :global(svg) {
        margin-right: 2px;
    }

    /* ── Table shell ────────────────────────────────────────────────── */
    .ks-shell {
        border: 1px solid var(--border);
        background: var(--background);
        overflow: auto;
        max-height: 620px;
    }

    .ks-table {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.85em;
        color: var(--foreground);
    }

    .ks-table thead {
        position: sticky;
        top: 0;
        z-index: 2;
        background: color-mix(in srgb, var(--muted, var(--foreground)) 6%, var(--background));
    }
    .ks-table thead tr:first-child th {
        background: color-mix(in srgb, var(--muted, var(--foreground)) 12%, var(--background));
    }

    .ks-table th,
    .ks-table td {
        border-bottom: 1px solid var(--border);
        border-right: 1px solid var(--border);
        padding: 6px 10px;
        text-align: left;
        vertical-align: middle;
        white-space: nowrap;
    }
    .ks-table th:last-child,
    .ks-table td:last-child {
        border-right: 0;
    }
    .ks-table thead th {
        font-family: var(--prose-sans), system-ui, sans-serif;
        font-weight: 600;
        font-size: 0.7em;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--foreground) 70%, transparent);
        cursor: pointer;
        position: relative;
    }
    .ks-th-inner {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .ks-th-label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    .ks-th-action {
        all: unset;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 1px 6px;
        margin-left: 4px;
        font-size: 0.85em;
        letter-spacing: 0.04em;
        cursor: pointer;
        border: 1px solid var(--border);
        background: var(--background);
        color: color-mix(in srgb, var(--foreground) 75%, transparent);
    }
    .ks-th-action:hover {
        background: var(--foreground);
        color: var(--background);
        border-color: var(--foreground);
    }
    .ks-th-filter {
        margin-top: 6px;
        text-transform: none;
        letter-spacing: 0;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 1em;
        font-weight: 400;
    }
    .ks-resizer {
        position: absolute;
        top: 0;
        bottom: 0;
        right: -4px;
        width: 8px;
        z-index: 1;
        cursor: col-resize;
        background: transparent;
        transition: background 100ms ease;
    }
    .ks-resizer:hover {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 35%, transparent);
    }

    .ks-search-row th {
        background: var(--background);
        cursor: default;
        padding: 4px 8px;
    }
    .ks-search {
        width: 100%;
        padding: 4px 8px;
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.95em;
        color: var(--foreground);
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: 0;
        outline: none;
    }
    .ks-search:focus {
        border-color: var(--color-brand-500, var(--foreground));
    }

    .ks-table tbody tr {
        transition: background 80ms ease;
    }
    .ks-table tbody tr:hover {
        background: color-mix(in srgb, var(--color-brand-500, var(--foreground)) 5%, transparent);
    }
    .ks-table tbody tr:nth-child(even) {
        background: color-mix(in srgb, var(--muted, var(--foreground)) 3%, transparent);
    }

    /* ── State badges on cells ──────────────────────────────────────── */
    .ks-table tbody td.sorted {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 8%, transparent);
    }
    .ks-table tbody td.matches {
        font-weight: 600;
        color: var(--foreground);
    }
    .ks-table tbody td.group {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 14%, transparent);
        font-weight: 600;
    }
    .ks-table tbody td.aggregate {
        background: color-mix(in srgb, gold 18%, transparent);
        font-style: italic;
    }
    .ks-table tbody td.repeat {
        background: color-mix(in srgb, currentColor 4%, transparent);
    }
    .ks-table tbody tr.selected {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 12%, transparent);
    }
    .ks-table tbody tr.selected:hover {
        background: color-mix(in srgb, var(--color-brand-500, currentColor) 18%, transparent);
    }

    /* ── Debug panel ────────────────────────────────────────────────── */
    .ks-state {
        margin-top: 14px;
        border: 1px solid var(--border);
        background: var(--background);
    }
    .ks-state summary {
        cursor: pointer;
        padding: 8px 12px;
        font-family: var(--prose-sans), system-ui, sans-serif;
        font-size: 0.7em;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: color-mix(in srgb, var(--foreground) 70%, transparent);
        list-style: none;
    }
    .ks-state summary::before {
        content: '▸ ';
        display: inline-block;
        transform-origin: center;
        transition: transform 120ms ease;
    }
    .ks-state[open] summary::before {
        transform: rotate(90deg);
    }
    .ks-state pre {
        margin: 0;
        padding: 12px 14px;
        border-top: 1px solid var(--border);
        background: color-mix(in srgb, var(--muted, var(--foreground)) 4%, transparent);
        font-family: var(--prose-mono, ui-monospace, monospace);
        font-size: 0.78em;
        line-height: 1.45;
        color: color-mix(in srgb, var(--foreground) 85%, transparent);
        overflow: auto;
        max-height: 260px;
    }
</style>
