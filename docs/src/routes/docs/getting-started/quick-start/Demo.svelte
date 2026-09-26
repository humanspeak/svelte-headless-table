<script>
    import { fromStore, readable } from 'svelte/store'
    import { createTable, Render } from '@humanspeak/svelte-headless-table'

    const data = readable([
        { name: 'Ada Lovelace', age: 21 },
        { name: 'Barbara Liskov', age: 52 },
        { name: 'Richard Hamming', age: 38 }
    ])

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

    const { headerRows, rows, tableAttrs, tableBodyAttrs } = table.createViewModel(columns)
</script>

<table class="demo" {...$tableAttrs}>
    <thead>
        {#each $headerRows as headerRow (headerRow.id)}
            {@const rowAttrs = fromStore(headerRow.attrs())}
            <tr {...rowAttrs.current}>
                {#each headerRow.cells as cell (cell.id)}
                    {@const attrs = fromStore(cell.attrs())}
                    <th {...attrs.current}>
                        <Render of={cell.render()} />
                    </th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody {...$tableBodyAttrs}>
        {#each $rows as row (row.id)}
            {@const rowAttrs = fromStore(row.attrs())}
            <tr {...rowAttrs.current}>
                {#each row.cells as cell (cell.id)}
                    {@const attrs = fromStore(cell.attrs())}
                    <td {...attrs.current}>
                        <Render of={cell.render()} />
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
