<script>
    import { derived, readable } from 'svelte/store'
    import { createTable, Render } from '@humanspeak/svelte-headless-table'
    import { addGridLayout } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'

    const data = readable(createSamples(10, 5, 3, { seed: 1 }))

    const table = createTable(data, {
        grid: addGridLayout()
    })

    const columns = table.createColumns([
        table.group({
            header: (_, { rows }) => derived([rows], ([_rows]) => `Name (${_rows.length} users)`),
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
</script>

<div class="overflow-x-auto">
    <table class="demo my-0" {...vm.current.tableAttrs}>
        <thead {...vm.current.tableHeadAttrs}>
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
