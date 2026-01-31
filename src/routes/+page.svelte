<script lang="ts">
    import { page } from '$app/stores'
    import { createRender } from '@humanspeak/svelte-render'
    import { derived, get, readable, writable } from 'svelte/store'
    import { Render, Subscribe, createTable } from '../lib/index.js'
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
    } from '../lib/plugins/index.js'
    import { getDistinct } from '../lib/utils/array.js'
    import { mean, sum } from '../lib/utils/math.js'
    import { createSamples, type Sample } from './_createSamples.js'
    import ExpandIndicator from './_ExpandIndicator.svelte'
    import Italic from './_Italic.svelte'
    import NumberRangeFilter from './_NumberRangeFilter.svelte'
    import Profile from './_Profile.svelte'
    import SelectFilter from './_SelectFilter.svelte'
    import SelectIndicator from './_SelectIndicator.svelte'
    import TextFilter from './_TextFilter.svelte'
    import Tick from './_Tick.svelte'

    const seed = $page.url.searchParams.get('seed')
    const rowCountParam = $page.url.searchParams.get('rows')
    const subRowsParam = $page.url.searchParams.get('subrows')
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

    const data = writable(generateData(initialRowCount, initialSubRows))

    const serverSide = false

    const table = createTable(data, {
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
            serverSide: serverSide,
            /* trunk-ignore(eslint/@typescript-eslint/no-explicit-any) */
            serverItemCount: serverSide ? readable(40) : (undefined as any)
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
                return state?.pluginStates.select.getRowState(row).isSelected
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
                return state?.pluginStates.expand.getRowState(row).isExpanded
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
                    header: (cell) => {
                        return createRender(
                            Italic,
                            derived(cell.props(), (_props) => ({
                                text: `First Name ${_props.sort.order}`
                            }))
                        )
                    },
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

    const viewModel = table.createViewModel(columns)
    const {
        headerRows,
        pageRows,
        tableAttrs,
        tableBodyAttrs,
        visibleColumns,
        pluginStates,
        _debug
    } = viewModel

    // Debug state for reactive updates - refresh whenever stores change
    let debugSnapshot = $state({ ...(_debug.derivationCalls as Record<string, number>) })
    let totalCalls = $state(_debug.getTotalCalls())

    // Auto-update debug snapshot when any of the main stores change
    $effect(() => {
        // Subscribe to reactive stores to trigger updates
        $pageRows
        $headerRows
        $tableAttrs
        $tableBodyAttrs
        $visibleColumns
        // Update snapshot after stores have processed
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
    // $: $columnIdOrder = ['expanded', ...$groupByIds];
    const { hiddenColumnIds } = pluginStates.hideColumns
    $hiddenColumnIds = ['progress']
    const { columnWidths } = pluginStates.resize
    const { exportedData } = pluginStates.export
    const { exportedData: exportedJson } = pluginStates.exportJson
    const { exportedData: exportedCsv } = pluginStates.exportCsv
</script>

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
                data.set(generateData(rowCount, includeSubRows))
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
                data.update((d) => [...d])
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
    <button onclick={() => $pageIndex--} disabled={!$hasPreviousPage}>Previous page</button>
    {$pageIndex + 1} of {$pageCount}
    <button onclick={() => $pageIndex++} disabled={!$hasNextPage}>Next page</button>
    <label for="page-size">Page size</label>
    <input id="page-size" type="number" min={1} bind:value={$pageSize} />
</div>

<button data-testid="export-as-object-button" onclick={() => console.log(get(exportedData))}>
    Export as object
</button>
<button data-testid="export-as-json-button" onclick={() => console.log(get(exportedJson))}>
    Export as JSON
</button>
<button data-testid="export-as-csv-button" onclick={() => console.log(get(exportedCsv))}>
    Export as CSV
</button>

<table {...$tableAttrs}>
    <thead>
        {#each $headerRows as headerRow (headerRow.id)}
            <Subscribe attrs={headerRow.attrs()} let:attrs>
                <tr {...attrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                            <th
                                {...attrs}
                                onclick={props.sort.toggle}
                                class:sorted={props.sort.order !== undefined}
                                use:props.resize
                            >
                                <div>
                                    <Render of={cell.render()} />
                                    {#if props.sort.order === 'asc'}
                                        ⬇️
                                    {:else if props.sort.order === 'desc'}
                                        ⬆️
                                    {/if}
                                </div>
                                {#if !props.group.disabled}
                                    <button
                                        onclick={(e) => {
                                            e.stopPropagation()
                                            props.group.toggle(e)
                                        }}
                                    >
                                        {#if props.group.grouped}
                                            ungroup
                                        {:else}
                                            group
                                        {/if}
                                    </button>
                                {/if}
                                {#if props.filter?.render !== undefined}
                                    <Render of={props.filter.render} />
                                {/if}
                                {#if !props.resize.disabled}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <div
                                        class="resizer"
                                        role="button"
                                        tabindex="0"
                                        onclick={(e) => e.stopPropagation()}
                                        use:props.resize.drag
                                        use:props.resize.reset
                                    ></div>
                                {/if}
                            </th>
                        </Subscribe>
                    {/each}
                </tr>
            </Subscribe>
        {/each}
        <tr>
            <th colspan={$visibleColumns.length}>
                <input type="text" bind:value={$filterValue} placeholder="Search all data..." />
            </th>
        </tr>
    </thead>
    <tbody {...$tableBodyAttrs}>
        {#each $pageRows as row (row.id)}
            <Subscribe attrs={row.attrs()} let:attrs rowProps={row.props()} let:rowProps>
                <tr id={row.id} {...attrs} class:selected={rowProps.select.selected}>
                    {#each row.cells as cell (cell.id)}
                        <Subscribe attrs={cell.attrs()} let:attrs props={cell.props()} let:props>
                            <td
                                {...attrs}
                                class:sorted={props.sort.order !== undefined}
                                class:matches={props.tableFilter.matches}
                                class:group={props.group.grouped}
                                class:aggregate={props.group.aggregated}
                                class:repeat={props.group.repeated}
                                data-value={row.original?.[cell.id as keyof Sample]}
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

<pre>{JSON.stringify(
        {
            groupByIds: $groupByIds,
            sortKeys: $sortKeys,
            filterValues: $filterValues,
            filterValue: $filterValue,
            selectedDataIds: $selectedDataIds,
            columnIdOrder: $columnIdOrder,
            hiddenColumnIds: $hiddenColumnIds,
            expandedIds: $expandedIds,
            columnWidths: $columnWidths
        },
        null,
        2
    )}
serverSide: {serverSide}</pre>

<div class="debug-panel">
    <h2>Debug: Store Derivation Metrics</h2>
    <div class="debug-info">
        <div class="debug-section">
            <h3>Plugin Info</h3>
            <p><strong>Count:</strong> {_debug.pluginCount}</p>
            <p><strong>Names:</strong> {_debug.pluginNames.join(', ')}</p>
        </div>
        <div class="debug-section">
            <h3>Derived Store Chain Depths</h3>
            <ul>
                <li>tableAttrs: {_debug.derivedStoreCount.tableAttrs}</li>
                <li>tableHeadAttrs: {_debug.derivedStoreCount.tableHeadAttrs}</li>
                <li>tableBodyAttrs: {_debug.derivedStoreCount.tableBodyAttrs}</li>
                <li>visibleColumns: {_debug.derivedStoreCount.visibleColumns}</li>
                <li>rows: {_debug.derivedStoreCount.rows}</li>
                <li>pageRows: {_debug.derivedStoreCount.pageRows}</li>
            </ul>
        </div>
        <div class="debug-section">
            <h3>Derivation Calls</h3>
            <div class="debug-controls">
                <button onclick={resetCounters}>Reset Counters</button>
            </div>
            <ul>
                {#each Object.entries(debugSnapshot) as [name, count]}
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
