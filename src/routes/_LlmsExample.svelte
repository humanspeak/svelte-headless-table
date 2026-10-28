<script lang="ts">
    import { Render, createTable } from '$lib/index.js'
    import { addSortBy, addPagination } from '$lib/plugins/index.js'

    let people = $state.raw([
        { name: 'Ada Lovelace', role: 'Engineer' },
        { name: 'Grace Hopper', role: 'Engineer' }
    ])

    const table = createTable(() => people, {
        sort: addSortBy(),
        page: addPagination({ initialPageSize: 20 })
    })

    const columns = table.createColumns([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Role', accessor: 'role' })
    ])

    const vm = table.createViewModel(columns)
    const { pageIndex, pageCount } = vm.pluginStates.page
</script>

<table {...vm.current.tableAttrs}>
    <thead>
        {#each vm.current.headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th {...cell.current.attrs} onclick={cell.current.props.sort.toggle}>
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

<button onclick={() => (people = [...people, { name: 'Edsger Dijkstra', role: 'Scientist' }])}>
    Add row
</button>
<button onclick={() => (pageIndex.current -= 1)}>Prev</button>
{pageIndex.current + 1} / {pageCount.current}
<button onclick={() => (pageIndex.current += 1)}>Next</button>
