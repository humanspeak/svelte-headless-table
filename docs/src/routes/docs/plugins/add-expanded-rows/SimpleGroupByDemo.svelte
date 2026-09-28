<script lang="ts">
    import { createTable, Render, createRender } from '@humanspeak/svelte-headless-table'
    import {
        addGroupBy,
        addExpandedRows,
        addColumnOrder
    } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'
    import ExpandIndicator from './ExpandIndicator.svelte'
    import { getDistinct } from '$lib/utils/array'
    import { mean, sum } from '$lib/utils/math'

    const data = createSamples(30, 1, 0, { seed: 7 })

    const table = createTable(data, {
        group: addGroupBy(),
        expand: addExpandedRows(),
        colOrder: addColumnOrder()
    })

    const columns = table.createColumns([
        table.display({
            id: 'expanded',
            header: '',
            cell: ({ row }, { pluginStates }) => {
                const { isExpanded, canExpand, isAllSubRowsExpanded } =
                    pluginStates.expand.getRowState(row)
                return createRender(ExpandIndicator, {
                    depth: row.depth,
                    isExpanded,
                    canExpand,
                    isAllSubRowsExpanded
                })
            }
        }),
        table.group({
            header:
                (_, { rows }) =>
                () =>
                    `Name (${rows().length} users)`,
            columns: [
                table.column({
                    header: 'First Name',
                    accessor: 'firstName',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => getDistinct(values).length,
                            cell: ({ value }) => `${value} unique`
                        }
                    }
                }),
                table.column({
                    header: 'Last Name',
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
            header: 'Info',
            columns: [
                table.column({
                    header: 'Age',
                    accessor: 'age',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => mean(values),
                            cell: ({ value }) => `${(value as number).toFixed(1)} (avg)`
                        }
                    }
                }),
                table.column({ header: 'Status', accessor: 'status' }),
                table.column({
                    header: 'Visits',
                    accessor: 'visits',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => sum(values),
                            cell: ({ value }) => `${value} (total)`
                        }
                    }
                }),
                table.column({
                    header: 'Profile Progress',
                    accessor: 'progress',
                    plugins: {
                        group: {
                            getAggregateValue: (values) => mean(values),
                            cell: ({ value }) => `${(value as number).toFixed(1)} (avg)`
                        }
                    }
                })
            ]
        })
    ])

    const vm = table.createViewModel(columns)
    const { pluginStates } = vm
    const { groupByIds } = pluginStates.group
</script>

<pre>{JSON.stringify({ groupByIds: groupByIds.current }, null, 2)}</pre>

<div class="overflow-x-auto">
    <table class="demo my-0" {...vm.current.tableAttrs}>
        <thead>
            {#each vm.current.headerRows as headerRow (headerRow.id)}
                <tr {...headerRow.current.attrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <th {...cell.current.attrs}>
                            <Render of={cell.render()} />
                            {#if !cell.current.props.group.disabled}
                                <button onclick={cell.current.props.group.toggle} class="demo">
                                    {#if cell.current.props.group.grouped}
                                        ungroup
                                    {:else}
                                        group
                                    {/if}
                                </button>
                            {/if}
                        </th>
                    {/each}
                </tr>
            {/each}
        </thead>
        <tbody {...vm.current.tableBodyAttrs}>
            {#each vm.current.rows as row (row.id)}
                <tr {...row.current.attrs}>
                    {#each row.cells as cell (cell.id)}
                        <td
                            {...cell.current.attrs}
                            class:group={cell.current.props.group.grouped}
                            class:aggregate={cell.current.props.group.aggregated}
                            class:repeat={cell.current.props.group.repeated}
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
</div>

<style>
    .group {
        background: rgb(144, 191, 148, 0.2);
    }
    .aggregate {
        background: rgb(238, 212, 100, 0.2);
    }
    .repeat {
        background: rgb(255, 139, 139, 0.2);
    }
</style>
