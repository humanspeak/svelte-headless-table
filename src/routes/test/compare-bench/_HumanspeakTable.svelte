<script lang="ts">
    import { untrack } from 'svelte'
    import { Render, createTable } from '$lib/index.js'
    import { addPagination, addSortBy, addTableFilter } from '$lib/plugins/index.js'
    import { COLUMN_IDS, includesIgnoreCase, type BenchApi, type Row } from './_data.js'

    const {
        data,
        pageSize,
        onReady
    }: { data: Row[]; pageSize: number; onReady: (api: BenchApi) => void } = $props()

    // pageSize and onReady are fixed for the bench's lifetime.
    const initialPageSize = untrack(() => pageSize)

    const table = createTable(() => data, {
        filter: addTableFilter({
            fn: ({ value, filterValue }) => includesIgnoreCase(value, filterValue)
        }),
        sort: addSortBy({ disableMultiSort: true }),
        page: addPagination({ initialPageSize })
    })
    const columns = table.createColumns(
        COLUMN_IDS.map((id) => table.column({ header: id, accessor: id }))
    )
    const vm = table.createViewModel(columns)
    const { filter, sort, page } = vm.pluginStates

    untrack(() => onReady)({
        setSort: (id, desc) => (sort.sortKeys.current = [{ id, order: desc ? 'desc' : 'asc' }]),
        setFilter: (value) => (filter.filterValue.current = value),
        nextPage: () => (page.pageIndex.current += 1)
    })
</script>

<table {...vm.current.tableAttrs}>
    <thead>
        {#each vm.current.headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th {...cell.current.attrs}><Render of={cell.render()} /></th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody {...vm.current.tableBodyAttrs}>
        {#each vm.current.pageRows as row (row.id)}
            <tr {...row.current.attrs}>
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}><Render of={cell.render()} /></td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
