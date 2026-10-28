<script lang="ts">
    import {
        FlexRender,
        columnFilteringFeature,
        createFilteredRowModel,
        createPaginatedRowModel,
        createSortedRowModel,
        createTable,
        filterFn_includesString as includesString,
        globalFilteringFeature,
        rowPaginationFeature,
        rowSortingFeature,
        sortFn_basic as basic,
        tableFeatures
    } from '@tanstack/svelte-table'
    import { untrack } from 'svelte'
    import { COLUMN_IDS, type BenchApi, type Row } from './_data.js'

    const {
        data,
        pageSize,
        onReady
    }: { data: Row[]; pageSize: number; onReady: (api: BenchApi) => void } = $props()

    // Same work as the humanspeak adapter: case-insensitive substring global
    // filter over every column, single-column sort with a plain comparator
    // (`basic`, like our `compare`), client-side pagination.
    const features = tableFeatures({
        columnFilteringFeature,
        globalFilteringFeature,
        rowSortingFeature,
        rowPaginationFeature,
        filteredRowModel: createFilteredRowModel(),
        sortedRowModel: createSortedRowModel(),
        paginatedRowModel: createPaginatedRowModel(),
        filterFns: { includesString },
        sortFns: { basic }
    })
    const columns = COLUMN_IDS.map((id) => ({
        accessorKey: id,
        header: id,
        sortFn: 'basic' as const
    }))

    const table = createTable({
        features,
        columns,
        get data() {
            return data
        },
        globalFilterFn: 'includesString',
        enableMultiSort: false,
        initialState: { pagination: { pageIndex: 0, pageSize: untrack(() => pageSize) } }
    })

    untrack(() => onReady)({
        setSort: (id, desc) => table.setSorting([{ id, desc }]),
        setFilter: (value) => table.setGlobalFilter(value),
        nextPage: () => table.nextPage()
    })
</script>

<table>
    <thead>
        {#each table.getHeaderGroups() as group (group.id)}
            <tr>
                {#each group.headers as header (header.id)}
                    <th
                        >{#if !header.isPlaceholder}<FlexRender {header} />{/if}</th
                    >
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody>
        {#each table.getRowModel().rows as row (row.id)}
            <tr>
                {#each row.getAllCells() as cell (cell.id)}
                    <td><FlexRender {cell} /></td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
