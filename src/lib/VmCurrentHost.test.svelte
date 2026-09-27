<script lang="ts">
    import { readable } from 'svelte/store'
    import { createTable } from '$lib/createTable.js'
    import { addPagination } from '$lib/plugins/addPagination.js'
    import { addSelectedRows } from '$lib/plugins/addSelectedRows.js'
    import { addSortBy } from '$lib/plugins/addSortBy.js'
    import { Render } from '$lib/render/index.js'

    // A whole table rendered with zero store syntax: table-level values come
    // from `vm.current`, row and cell values from `row.current` / `cell.current`.
    const data = readable([
        { name: 'Ada', age: 36 },
        { name: 'Bea', age: 41 },
        { name: 'Cy', age: 29 },
        { name: 'Di', age: 52 },
        { name: 'Ed', age: 23 }
    ])
    const table = createTable(data, {
        sort: addSortBy(),
        page: addPagination({ initialPageSize: 2 }),
        select: addSelectedRows()
    })
    const columns = table.createColumns([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    const vm = table.createViewModel(columns)

    export const pluginStates = vm.pluginStates
    export const viewModel = vm
</script>

<table {...vm.current.tableAttrs} data-testid="table">
    <thead {...vm.current.tableHeadAttrs}>
        {#each vm.current.headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th
                        {...cell.current.attrs}
                        data-testid={`th-${cell.id}`}
                        data-order={cell.current.props.sort.order ?? 'none'}
                        onclick={cell.current.props.sort.toggle}
                    >
                        <Render of={cell.render()} />
                    </th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody {...vm.current.tableBodyAttrs}>
        {#each vm.current.pageRows as row (row.id)}
            <tr
                {...row.current.attrs}
                data-testid="row"
                data-selected={String(row.current.props.select.selected)}
            >
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}><Render of={cell.render()} /></td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
