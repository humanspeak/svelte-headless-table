<script lang="ts">
    // v7 design spike (plan 001) SSR probe: the spike view model built in a
    // page component and server-rendered through `current.*`. Throwaway:
    // deleted by plan 004.
    import {
        addSpikePagination,
        addSpikeSort,
        createSpikeViewModel
    } from './spikeViewModel.svelte.js'

    interface ProbeItem {
        name: string
        age: number
    }

    const data: ProbeItem[] = [
        { name: 'Grace', age: 45 },
        { name: 'Ada', age: 36 },
        { name: 'Linus', age: 54 }
    ]
    const vm = createSpikeViewModel(
        () => data,
        [
            { id: 'name', header: 'Name', accessor: (item: ProbeItem) => item.name },
            { id: 'age', header: 'Age', accessor: (item: ProbeItem) => item.age }
        ],
        {
            sort: addSpikeSort<ProbeItem>({ initialSortKeys: [{ id: 'name', order: 'asc' }] }),
            page: addSpikePagination<ProbeItem>({ initialPageSize: 10 })
        }
    )
</script>

<p data-testid="page-rows">pageRows: {vm.current.pageRows.length}</p>
<p data-testid="first-cell">first cell: {vm.current.pageRows[0]?.cells[0]?.value}</p>

<table>
    <thead>
        {#each vm.current.headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th {...cell.current.attrs}>{cell.label}</th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody>
        {#each vm.current.pageRows as row (row.id)}
            <tr {...row.current.attrs}>
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}>{cell.value}</td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
