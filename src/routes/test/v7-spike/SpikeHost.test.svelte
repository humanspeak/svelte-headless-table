<script lang="ts">
    // v7 design spike (plan 001) host: a table rendered from the spike view
    // model through `current.*` only. Throwaway: deleted by plan 004.
    import {
        addSpikePagination,
        addSpikeSort,
        createSpikeViewModel,
        type SortKey
    } from './spikeViewModel.svelte.js'

    interface HostItem {
        name: string
        age: number
    }

    const data: HostItem[] = [
        { name: 'Grace', age: 45 },
        { name: 'Ada', age: 36 }
    ]
    export const vm = createSpikeViewModel(
        () => data,
        [
            { id: 'name', header: 'Name', accessor: (item: HostItem) => item.name },
            { id: 'age', header: 'Age', accessor: (item: HostItem) => item.age }
        ],
        { sort: addSpikeSort<HostItem>(), page: addSpikePagination<HostItem>() }
    )

    type SortProps = { order?: SortKey['order']; toggle: () => void }
    const sortOf = (props: Record<string, unknown>) => props.sort as SortProps
</script>

<table>
    <thead>
        {#each vm.current.headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th
                        {...cell.current.attrs}
                        data-testid={`th-${cell.id}`}
                        data-order={sortOf(cell.current.props).order ?? 'none'}
                        onclick={sortOf(cell.current.props).toggle}
                    >
                        {cell.label}
                    </th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody>
        {#each vm.current.pageRows as row (row.id)}
            <tr {...row.current.attrs} data-testid="row">
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}>{cell.value}</td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
