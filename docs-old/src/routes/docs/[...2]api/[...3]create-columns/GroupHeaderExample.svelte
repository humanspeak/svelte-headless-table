<script>
    import { derived, readable } from 'svelte/store'
    import { createTable, Render, Subscribe, createRender } from '@humanspeak/svelte-headless-table'
    import Italic from './Italic.svelte'

    const data = readable([
        { firstName: 'Ada', lastName: 'Lovelace', info: { age: 21 } },
        { firstName: 'Barbara', lastName: 'Liskov', info: { age: 52 } },
        { firstName: 'Richard', lastName: 'Hamming', info: { age: 38 } }
    ])
    const table = createTable(data)
    const columns = table.createColumns([
        table.group({
            header: (_, { rows }) => derived(rows, (r) => `Name (${r.length} people)`),
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
            header: createRender(Italic, { text: 'Info' }),
            columns: [
                table.column({
                    header: createRender(Italic, { text: 'Age' }),
                    accessor: (item) => item.info.age,
                    id: 'age'
                })
            ]
        })
    ])
    const { headerRows, rows, tableAttrs, tableBodyAttrs } = table.createViewModel(columns)
</script>

<table class="demo" {...$tableAttrs}>
    <thead>
        {#each $headerRows as headerRow (headerRow.id)}
            <Subscribe rowAttrs={headerRow.attrs()} let:rowAttrs>
                <tr {...rowAttrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <Subscribe attrs={cell.attrs()} let:attrs>
                            <th {...attrs}>
                                <Render of={cell.render()} />
                            </th>
                        </Subscribe>
                    {/each}
                </tr>
            </Subscribe>
        {/each}
    </thead>
    <tbody {...$tableBodyAttrs}>
        {#each $rows as row (row.id)}
            <Subscribe rowAttrs={row.attrs()} let:rowAttrs>
                <tr {...rowAttrs}>
                    {#each row.cells as cell (cell.id)}
                        <Subscribe attrs={cell.attrs()} let:attrs>
                            <td {...attrs}>
                                <Render of={cell.render()} />
                            </td>
                        </Subscribe>
                    {/each}
                </tr>
            </Subscribe>
        {/each}
    </tbody>
</table>
