<script lang="ts">
    import { readable } from 'svelte/store'
    import { createTable } from '$lib/createTable.js'
    import { addResizedColumns } from '$lib/plugins/addResizedColumns.js'
    import { addSortBy } from '$lib/plugins/addSortBy.js'
    import { Render } from '$lib/render/index.js'

    // The runes-native idiom: no Subscribe and no fromStore, attrs and props
    // read as plain reactive values from `current`.
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
    export const viewHeaderRows = vm.headerRows
</script>

<table {...$tableAttrs}>
    <thead>
        {#each $headerRows as headerRow (headerRow.id)}
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
    <tbody>
        {#each $rows as row (row.id)}
            <tr {...row.current.attrs} data-testid="row">
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}><Render of={cell.render()} /></td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
