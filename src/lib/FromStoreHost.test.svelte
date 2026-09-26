<script lang="ts">
    import { fromStore, readable } from 'svelte/store'
    import { createTable } from '$lib/createTable.js'
    import { addResizedColumns } from '$lib/plugins/addResizedColumns.js'
    import { addSortBy } from '$lib/plugins/addSortBy.js'
    import { Render } from '$lib/render/index.js'

    // The idiom documented in the quick-start and README: no Subscribe,
    // stores read through Svelte's own fromStore inside {#each}.
    const data = readable([
        { name: 'Grace', age: 45 },
        { name: 'Ada', age: 36 }
    ])
    const table = createTable(data, { sort: addSortBy(), resize: addResizedColumns() })
    const columns = table.createColumns([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    const vm = table.createViewModel(columns)
    const { headerRows, rows, tableAttrs } = vm

    export const pluginStates = vm.pluginStates
</script>

<table {...$tableAttrs}>
    <thead>
        {#each $headerRows as headerRow (headerRow.id)}
            {@const rowAttrs = fromStore(headerRow.attrs())}
            <tr {...rowAttrs.current}>
                {#each headerRow.cells as cell (cell.id)}
                    {@const attrs = fromStore(cell.attrs())}
                    {@const props = fromStore(cell.props())}
                    <th
                        {...attrs.current}
                        data-testid={`th-${cell.id}`}
                        data-order={props.current.sort.order ?? 'none'}
                        onclick={props.current.sort.toggle}
                    >
                        <Render of={cell.render()} />
                    </th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody>
        {#each $rows as row (row.id)}
            {@const rowAttrs = fromStore(row.attrs())}
            <tr {...rowAttrs.current} data-testid="row">
                {#each row.cells as cell (cell.id)}
                    {@const attrs = fromStore(cell.attrs())}
                    <td {...attrs.current}><Render of={cell.render()} /></td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
