<script lang="ts">
    import { page } from '$app/state'
    import { Render, createRender, createSnippetRender, createTable } from '../../lib/index.js'
    import {
        addColumnFilters,
        addColumnOrder,
        addDataExport,
        addExpandedRows,
        addGroupBy,
        addHiddenColumns,
        addPagination,
        addResizedColumns,
        addSelectedRows,
        addSortBy,
        addSubRows,
        addTableFilter,
        matchFilter,
        numberRangeFilter,
        textPrefixFilter
    } from '../../lib/plugins/index.js'
    import { getDistinct } from '../../lib/utils/array.js'
    import { mean, sum } from '../../lib/utils/math.js'
    import { createSamples, type Sample } from '../_createSamples.js'
    import ExpandIndicator from '../_ExpandIndicator.svelte'
    import Italic from '../_Italic.svelte'
    import NumberRangeFilter from '../_NumberRangeFilter.svelte'
    import SelectFilter from '../_SelectFilter.svelte'
    import SelectIndicator from '../_SelectIndicator.svelte'
    import TextFilter from '../_TextFilter.svelte'
    import Tick from '../_Tick.svelte'

    const seed = page.url.searchParams.get('seed')
    const rowCountParam = page.url.searchParams.get('rows')
    const subRowsParam = page.url.searchParams.get('subrows')
    const initialRowCount = rowCountParam ? Number(rowCountParam) : 100
    const initialSubRows = subRowsParam !== 'false' // default true unless explicitly false

    // Stress test controls
    let rowCount = $state(initialRowCount)
    let includeSubRows = $state(initialSubRows)
    let lastOperationTime = $state<string | null>(null)

    function generateData(count: number, withSubRows: boolean): Sample[] {
        const start = performance.now()
        const result = withSubRows
            ? createSamples({ seed: isNaN(Number(seed)) ? undefined : Number(seed) }, count, 2)
            : createSamples({ seed: isNaN(Number(seed)) ? undefined : Number(seed) }, count)
        const elapsed = performance.now() - start
        lastOperationTime = `Generated ${count} rows in ${elapsed.toFixed(2)}ms`
        return result
    }

    // `$state.raw`: the rows are replaced wholesale, never mutated, so there is
    // no need to deep-proxy every sample object.
    let items = $state.raw(generateData(initialRowCount, initialSubRows))

    const serverSide = false

    const table = createTable(() => items, {
        subRows: addSubRows({
            children: 'children'
        }),
        filter: addColumnFilters({
            serverSide: serverSide
        }),
        tableFilter: addTableFilter({
            includeHiddenColumns: true,
            serverSide: serverSide
        }),
        group: addGroupBy({
            initialGroupByIds: []
        }),
        sort: addSortBy({
            toggleOrder: ['asc', 'desc'],
            serverSide: serverSide
        }),
        expand: addExpandedRows({
            initialExpandedIds: { 1: true }
        }),
        select: addSelectedRows({
            initialSelectedDataIds: { 1: true }
        }),
        orderColumns: addColumnOrder(),
        hideColumns: addHiddenColumns(),
        page: addPagination({
            initialPageSize: 20,
            // Server-side pagination also needs `serverItemCount: <total>` (a number or a getter).
            serverSide: serverSide
        }),
        resize: addResizedColumns(),
        export: addDataExport(),
        exportJson: addDataExport({
            format: 'json'
        }),
        exportCsv: addDataExport({
            format: 'csv'
        })
    })

    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: (_, { pluginStates }) => {
                const { allPageRowsSelected, somePageRowsSelected } = pluginStates.select
                return createRender(SelectIndicator, {
                    isSelected: allPageRowsSelected,
                    isSomeSubRowsSelected: somePageRowsSelected
                })
            },
            cell: ({ row }, { pluginStates }) => {
                const { isSelected, isSomeSubRowsSelected } = pluginStates.select.getRowState(row)
                return createRender(SelectIndicator, {
                    isSelected,
                    isSomeSubRowsSelected
                })
            },
            data: ({ row }, state) => {
                return state?.pluginStates.select.getRowState(row).isSelected.current
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
            data: ({ row }, state) => {
                return state?.pluginStates.expand.getRowState(row).isExpanded.current
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
            accessor: (item: Sample) => item,
            cell: ({ value }) => createSnippetRender(summaryCell, value),
            plugins: {
                sort: {
                    getSortValue: (i: Sample) => i.lastName
                },
                tableFilter: {
                    getFilterValue: (i: Sample) => String(i.progress)
                }
            }
        }),
        table.group({
            header:
                (_, { rows, pageRows }) =>
                () =>
                    `Name (${rows().length} records, ${pageRows().length} in page)`,
            columns: [
                table.column({
                    header: (cell) => {
                        return createRender(Italic, () => ({
                            text: `First Name ${cell.current.props.sort.order}`
                        }))
                    },
                    accessor: 'firstName',
                    plugins: {
                        group: {
                            getAggregateValue: (values: string[]) => getDistinct(values).length,
                            cell: ({ value }) => `${value} unique`
                        },
                        sort: {
                            invert: true
                        },
                        filter: {
                            fn: textPrefixFilter,
                            render: ({ filterValue, values }) =>
                                createRender(TextFilter, {
                                    filterValue,
                                    values,
                                    testId: 'first-name-filter'
                                })
                        }
                    }
                }),
                table.column({
                    header: () => 'Last Name',
                    accessor: 'lastName',
                    plugins: {
                        group: {
                            getAggregateValue: (values: string[]) => getDistinct(values).length,
                            cell: ({ value }) => `${value} unique`
                        }
                    }
                })
            ]
        }),
        table.group({
            header: (_, { rows }) =>
                createRender(Italic, () => ({ text: `Info (${rows().length} samples)` })),
            columns: [
                table.column({
                    header: 'Age',
                    accessor: 'age',
                    plugins: {
                        group: {
                            getAggregateValue: (values: number[]) => mean(values),
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
                    header: createRender(Tick),
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
                            getAggregateValue: (values: number[]) => sum(values),
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
                            getAggregateValue: (values: number[]) => mean(values),
                            cell: ({ value }) => `${(value as number).toFixed(2)} (avg)`
                        }
                    }
                })
            ]
        })
    ])

    const viewModel = table.createViewModel(columns)
    const { pluginStates, _debug } = viewModel

    // Debug state for reactive updates - refresh whenever the view model changes
    let debugSnapshot = $state({ ...(_debug.derivationCalls as Record<string, number>) })
    let totalCalls = $state(_debug.getTotalCalls())

    /** Registers its arguments as dependencies of the enclosing effect. */
    const track = (..._deps: unknown[]): undefined => undefined

    // Auto-update debug snapshot when any of the main view-model values change
    $effect(() => {
        // Read the values so the effect re-runs when any of them change.
        const { current } = viewModel
        track(
            current.pageRows,
            current.headerRows,
            current.tableAttrs,
            current.tableBodyAttrs,
            current.visibleColumns
        )
        // Update snapshot after the derivations have run
        debugSnapshot = { ...(_debug.derivationCalls as Record<string, number>) }
        totalCalls = _debug.getTotalCalls()
    })

    function resetCounters() {
        _debug.resetCounters()
        debugSnapshot = { ...(_debug.derivationCalls as Record<string, number>) }
        totalCalls = _debug.getTotalCalls()
    }

    const { groupByIds } = pluginStates.group
    const { sortKeys } = pluginStates.sort
    const { filterValues } = pluginStates.filter
    const { filterValue } = pluginStates.tableFilter
    const { selectedDataIds } = pluginStates.select
    const { pageIndex, pageCount, pageSize, hasPreviousPage, hasNextPage } = pluginStates.page
    const { expandedIds } = pluginStates.expand
    const { columnIdOrder } = pluginStates.orderColumns
    const { hiddenColumnIds } = pluginStates.hideColumns
    hiddenColumnIds.current = ['progress']
    const { columnWidths } = pluginStates.resize
    const { exportedData } = pluginStates.export
    const { exportedData: exportedJson } = pluginStates.exportJson
    const { exportedData: exportedCsv } = pluginStates.exportCsv
</script>

{#snippet summaryCell(value: Sample)}
    {@const name = `${value.firstName} ${value.lastName}`}
    <div style="font-size: 0.875rem">{name}, <strong>{value.age}</strong></div>
    <div style="font-size: 0.875rem">{value.progress} / 100</div>
{/snippet}

<h1>@humanspeak/svelte-headless-table</h1>

<div class="stress-test-panel">
    <h3>Stress Test Controls</h3>
    <div class="stress-controls">
        <label>
            Row count:
            <select bind:value={rowCount}>
                <option value={100}>100 rows</option>
                <option value={500}>500 rows</option>
                <option value={1000}>1,000 rows</option>
                <option value={5000}>5,000 rows</option>
                <option value={10000}>10,000 rows</option>
                <option value={25000}>25,000 rows</option>
                <option value={50000}>50,000 rows</option>
            </select>
        </label>
        <label>
            <input type="checkbox" bind:checked={includeSubRows} />
            Include sub-rows (2 per row)
        </label>
        <button
            onclick={() => {
                _debug.resetCounters()
                const start = performance.now()
                items = generateData(rowCount, includeSubRows)
                const elapsed = performance.now() - start
                lastOperationTime = `Data set in ${elapsed.toFixed(2)}ms (${rowCount} rows${includeSubRows ? ' + sub-rows' : ''})`
            }}
        >
            Regenerate Data
        </button>
        <button
            onclick={() => {
                _debug.resetCounters()
                const start = performance.now()
                items = [...items]
                const elapsed = performance.now() - start
                lastOperationTime = `Shallow update in ${elapsed.toFixed(2)}ms`
            }}
        >
            Trigger Update (no change)
        </button>
    </div>
    {#if lastOperationTime}
        <p class="timing"><strong>Last operation:</strong> {lastOperationTime}</p>
    {/if}
</div>

<div>
    <button onclick={() => pageIndex.current--} disabled={!hasPreviousPage.current}>
        Previous page
    </button>
    {pageIndex.current + 1} of {pageCount.current}
    <button onclick={() => pageIndex.current++} disabled={!hasNextPage.current}>Next page</button>
    <label for="page-size">Page size</label>
    <input id="page-size" type="number" min={1} bind:value={pageSize.current} />
</div>

<button data-testid="export-as-object-button" onclick={() => console.log(exportedData.current)}>
    Export as object
</button>
<button data-testid="export-as-json-button" onclick={() => console.log(exportedJson.current)}>
    Export as JSON
</button>
<button data-testid="export-as-csv-button" onclick={() => console.log(exportedCsv.current)}>
    Export as CSV
</button>

<table {...viewModel.current.tableAttrs}>
    <thead>
        {#each viewModel.current.headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th
                        {...cell.current.attrs}
                        onclick={cell.current.props.sort.toggle}
                        class:sorted={cell.current.props.sort.order !== undefined}
                        use:cell.current.props.resize
                    >
                        <div>
                            <Render of={cell.render()} />
                            {#if cell.current.props.sort.order === 'asc'}
                                ⬇️
                            {:else if cell.current.props.sort.order === 'desc'}
                                ⬆️
                            {/if}
                        </div>
                        {#if !cell.current.props.group.disabled}
                            <button
                                onclick={(e) => {
                                    e.stopPropagation()
                                    cell.current.props.group.toggle(e)
                                }}
                            >
                                {#if cell.current.props.group.grouped}
                                    ungroup
                                {:else}
                                    group
                                {/if}
                            </button>
                        {/if}
                        {#if cell.current.props.filter?.render !== undefined}
                            <Render of={cell.current.props.filter.render} />
                        {/if}
                        {#if !cell.current.props.resize.disabled}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <div
                                class="resizer"
                                role="button"
                                tabindex="0"
                                onclick={(e) => e.stopPropagation()}
                                use:cell.current.props.resize.drag
                                use:cell.current.props.resize.reset
                            ></div>
                        {/if}
                    </th>
                {/each}
            </tr>
        {/each}
        <tr>
            <th colspan={viewModel.current.visibleColumns.length}>
                <input
                    type="text"
                    bind:value={filterValue.current}
                    placeholder="Search all data..."
                />
            </th>
        </tr>
    </thead>
    <tbody {...viewModel.current.tableBodyAttrs}>
        {#each viewModel.current.pageRows as row (row.id)}
            <tr
                id={row.id}
                {...row.current.attrs}
                class:selected={row.current.props.select.selected}
            >
                {#each row.cells as cell (cell.id)}
                    <td
                        {...cell.current.attrs}
                        class:sorted={cell.current.props.sort.order !== undefined}
                        class:matches={cell.current.props.tableFilter.matches}
                        class:group={cell.current.props.group.grouped}
                        class:aggregate={cell.current.props.group.aggregated}
                        class:repeat={cell.current.props.group.repeated}
                        data-value={row.isData()
                            ? row.original[cell.id as keyof Sample]
                            : undefined}
                    >
                        {#if !cell.current.props.group.repeated}
                            <Render of={cell.render()} />
                        {/if}
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>

<pre>{JSON.stringify(
        {
            groupByIds: groupByIds.current,
            sortKeys: sortKeys.current,
            filterValues: filterValues.current,
            filterValue: filterValue.current,
            selectedDataIds: selectedDataIds.current,
            columnIdOrder: columnIdOrder.current,
            hiddenColumnIds: hiddenColumnIds.current,
            expandedIds: expandedIds.current,
            columnWidths: columnWidths.current
        },
        null,
        2
    )}
serverSide: {serverSide}</pre>

<div class="debug-panel">
    <h2>Debug: Derivation Metrics</h2>
    <div class="debug-info">
        <div class="debug-section">
            <h3>Plugin Info</h3>
            <p><strong>Count:</strong> {_debug.pluginCount}</p>
            <p><strong>Names:</strong> {_debug.pluginNames.join(', ')}</p>
        </div>
        <div class="debug-section">
            <h3>Derivation Chain Depths</h3>
            <ul>
                <li>tableAttrs: {_debug.derivedCount.tableAttrs}</li>
                <li>tableHeadAttrs: {_debug.derivedCount.tableHeadAttrs}</li>
                <li>tableBodyAttrs: {_debug.derivedCount.tableBodyAttrs}</li>
                <li>visibleColumns: {_debug.derivedCount.visibleColumns}</li>
                <li>rows: {_debug.derivedCount.rows}</li>
                <li>pageRows: {_debug.derivedCount.pageRows}</li>
            </ul>
        </div>
        <div class="debug-section">
            <h3>Derivation Calls</h3>
            <div class="debug-controls">
                <button onclick={resetCounters}>Reset Counters</button>
            </div>
            <ul>
                {#each Object.entries(debugSnapshot) as [name, count] (name)}
                    <li class:has-calls={count > 0}>{name}: <strong>{count}</strong></li>
                {/each}
            </ul>
            <p class="total"><strong>TOTAL: {totalCalls}</strong></p>
        </div>
    </div>
</div>

<style>
    * {
        font-family: sans-serif;
    }
    pre {
        font-family: monospace;
    }

    table {
        border-spacing: 0;
        border-top: 1px solid black;
        border-left: 1px solid black;
    }

    th,
    td {
        margin: 0;
        padding: 0.5rem;
        border-bottom: 1px solid black;
        border-right: 1px solid black;
    }

    th {
        position: relative;
    }

    th .resizer {
        position: absolute;
        top: 0;
        bottom: 0;
        right: -4px;
        width: 8px;
        z-index: 1;
        background: lightgray;
        cursor: col-resize;
    }

    .sorted {
        background: rgb(144, 191, 148);
    }

    .matches {
        font-weight: 700;
    }

    .group {
        background: rgb(144, 191, 148);
    }
    .aggregate {
        background: rgb(238, 212, 100);
    }
    .repeat {
        background: rgb(255, 139, 139);
    }

    .selected {
        background: rgb(148, 205, 255);
    }

    .stress-test-panel {
        margin: 1rem 0;
        padding: 1rem;
        border: 2px solid #0066cc;
        border-radius: 8px;
        background: #e6f2ff;
    }

    .stress-test-panel h3 {
        margin-top: 0;
        color: #0066cc;
    }

    .stress-controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
    }

    .stress-controls label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .stress-controls button {
        padding: 0.5rem 1rem;
        cursor: pointer;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
    }

    .stress-controls button:hover {
        background: #0052a3;
    }

    .timing {
        margin-top: 0.5rem;
        font-family: monospace;
        color: #333;
    }

    .debug-panel {
        margin-top: 2rem;
        padding: 1rem;
        border: 2px solid #333;
        border-radius: 8px;
        background: #f9f9f9;
    }

    .debug-panel h2 {
        margin-top: 0;
        border-bottom: 1px solid #333;
        padding-bottom: 0.5rem;
    }

    .debug-info {
        display: flex;
        gap: 2rem;
        flex-wrap: wrap;
    }

    .debug-section {
        min-width: 200px;
    }

    .debug-section h3 {
        margin-bottom: 0.5rem;
        color: #555;
    }

    .debug-section ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .debug-section li {
        padding: 0.2rem 0;
        font-family: monospace;
    }

    .debug-section li.has-calls {
        background: #ffe066;
        padding: 0.2rem 0.5rem;
        border-radius: 3px;
    }

    .debug-controls {
        margin-bottom: 0.5rem;
    }

    .debug-controls button {
        margin-right: 0.5rem;
        padding: 0.3rem 0.8rem;
        cursor: pointer;
    }

    .total {
        margin-top: 0.5rem;
        font-size: 1.1rem;
        font-family: monospace;
    }
</style>
