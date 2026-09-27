<script>
    import { readable } from 'svelte/store'
    import { createTable, Render } from '@humanspeak/svelte-headless-table'
    import { addSortBy } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'

    const data = readable(createSamples(30, 1, 0, { seed: 2 }))

    const table = createTable(data, {
        sort: addSortBy()
    })

    const columns = table.createColumns([
        table.group({
            header: 'Name',
            columns: [
                table.column({
                    header: 'First Name',
                    accessor: 'firstName'
                }),
                table.column({
                    header: 'Last Name',
                    accessor: 'lastName'
                })
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
    const { sortKeys } = pluginStates.sort
</script>

<pre>$sortKeys = {JSON.stringify($sortKeys, null, 2)}</pre>

<div class="overflow-x-auto">
    <table class="demo my-0" {...vm.current.tableAttrs}>
        <thead>
            {#each vm.current.headerRows as headerRow (headerRow.id)}
                <tr {...headerRow.current.attrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <th {...cell.current.attrs} onclick={cell.current.props.sort.toggle}>
                            <Render of={cell.render()} />
                            {#if cell.current.props.sort.order === 'asc'}
                                ⬇️
                            {:else if cell.current.props.sort.order === 'desc'}
                                ⬆️
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
                        <td {...cell.current.attrs}>
                            <Render of={cell.render()} />
                        </td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>
