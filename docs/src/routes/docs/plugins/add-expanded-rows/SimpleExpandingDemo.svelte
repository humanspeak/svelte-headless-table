<script>
    import { dev } from '$app/environment'
    import { createTable, Render, createRender } from '@humanspeak/svelte-headless-table'
    import { addSubRows, addExpandedRows } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'
    import ExpandIndicator from './ExpandIndicator.svelte'

    const data = createSamples(10, 2, 3, { seed: 6 })

    const table = createTable(data, {
        sub: addSubRows({ children: 'children' }),
        expand: addExpandedRows()
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
    const { expandedIds } = pluginStates.expand
</script>

{#if dev}
    <pre>{JSON.stringify({ expandedIds: expandedIds.current }, null, 2)}</pre>
{/if}

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
                <tr {...row.current.attrs}>
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
