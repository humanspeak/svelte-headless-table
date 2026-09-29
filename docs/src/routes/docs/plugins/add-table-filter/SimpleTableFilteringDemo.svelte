<script>
    import { createTable, Render } from '@humanspeak/svelte-headless-table'
    import { addTableFilter } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'

    const data = createSamples(30, 1, 0, { seed: 3 })

    const table = createTable(data, {
        tableFilter: addTableFilter()
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
                    accessor: 'lastName',
                    plugins: {
                        tableFilter: {
                            exclude: true
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
                    accessor: 'age'
                }),
                table.column({
                    header: 'Status',
                    accessor: 'status'
                }),
                table.column({
                    header: 'Visits',
                    accessor: 'visits'
                }),
                table.column({
                    header: 'Profile Progress',
                    accessor: 'progress'
                })
            ]
        })
    ])

    const vm = table.createViewModel(columns)
    const { pluginStates } = vm
    const { filterValue } = pluginStates.tableFilter
</script>

<pre>filterValue.current = {filterValue.current}</pre>

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
            <tr>
                <th colspan={vm.current.visibleColumns.length}>
                    <input
                        type="text"
                        bind:value={filterValue.current}
                        placeholder="Search rows..."
                    />
                </th>
            </tr>
        </thead>
        <tbody {...vm.current.tableBodyAttrs}>
            {#each vm.current.rows as row (row.id)}
                <tr {...row.current.attrs}>
                    {#each row.cells as cell (cell.id)}
                        <td
                            {...cell.current.attrs}
                            class:matches={cell.current.props.tableFilter.matches}
                        >
                            <Render of={cell.render()} />
                        </td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>

<style>
    input {
        width: 100%;
    }
    .matches {
        background: rgba(84, 219, 188, 0.2);
    }
    :global(.dark) .matches {
        background: rgba(84, 219, 188, 0.15);
    }
    .demo {
        margin: 0;
    }
</style>
