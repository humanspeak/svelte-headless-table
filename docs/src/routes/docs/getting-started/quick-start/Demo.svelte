<script>
    import { createTable, Render } from '@humanspeak/svelte-headless-table'

    const data = [
        { name: 'Ada Lovelace', age: 21 },
        { name: 'Barbara Liskov', age: 52 },
        { name: 'Richard Hamming', age: 38 }
    ]

    const table = createTable(data)

    const columns = table.createColumns([
        table.column({
            header: 'Name',
            accessor: 'name'
        }),
        table.column({
            header: 'Age',
            accessor: 'age'
        })
    ])

    const vm = table.createViewModel(columns)
</script>

<table class="demo" {...vm.current.tableAttrs}>
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
        {#each vm.current.pageRows as row (row.id)}
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
