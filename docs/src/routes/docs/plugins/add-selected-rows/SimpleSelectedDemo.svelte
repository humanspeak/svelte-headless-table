<script>
    import { derived, readable } from 'svelte/store'
    import { createTable, Render, createRender } from '@humanspeak/svelte-headless-table'
    import {
        addSubRows,
        addExpandedRows,
        addSelectedRows
    } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'
    import ExpandIndicator from '../add-expanded-rows/ExpandIndicator.svelte'
    import SelectIndicator from './SelectIndicator.svelte'

    const data = readable(createSamples(3, 2, 2, { seed: 8 }))

    const table = createTable(data, {
        sub: addSubRows({ children: 'children' }),
        select: addSelectedRows(),
        expand: addExpandedRows()
    })

    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: '',
            cell: ({ row }, { pluginStates }) => {
                const { isSomeSubRowsSelected, isSelected } = pluginStates.select.getRowState(row)
                return createRender(SelectIndicator, { isSelected, isSomeSubRowsSelected })
            }
        }),
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
            header: (_, { rows }) => derived(rows, (_rows) => `Name (${_rows.length} users)`),
            columns: [
                table.column({ header: 'First Name', accessor: 'firstName' }),
                table.column({ header: 'Last Name', accessor: 'lastName' })
            ]
        }),
        table.group({
            header: 'Info',
            columns: [
                table.column({ header: 'Age', accessor: 'age' }),
                table.column({ header: 'Status', accessor: 'status' }),
                table.column({ header: 'Visits', accessor: 'visits' }),
                table.column({ header: 'Profile Progress', accessor: 'progress' })
            ]
        })
    ])

    const vm = table.createViewModel(columns)
    const { pluginStates } = vm
    const { selectedDataIds } = pluginStates.select
</script>

<div class="overflow-x-auto">
    <table class="demo my-0" {...vm.current.tableAttrs}>
        <thead>
            {#each vm.current.headerRows as headerRow (headerRow.id)}
                <tr {...headerRow.current.attrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <th {...cell.current.attrs}>
                            <Render of={cell.render()} />
                        </th>
                    {/each}
                </tr>
            {/each}
        </thead>
        <tbody {...vm.current.tableBodyAttrs}>
            {#each vm.current.rows as row (row.id)}
                <tr class:selected={row.current.props.select.selected}>
                    {#each row.cells as cell (cell.id)}
                        <td {...cell.current.attrs}>
                            <Render of={cell.render()} />
                        </td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<pre>{JSON.stringify({ $selectedDataIds }, null, 2)}</pre>

<style>
    .selected {
        background: rgb(148, 205, 255, 0.2);
    }
</style>
