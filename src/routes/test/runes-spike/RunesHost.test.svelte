<script lang="ts">
    import { readable } from 'svelte/store'
    import { createTable } from '$lib/createTable.js'
    import { addResizedColumns } from '$lib/plugins/addResizedColumns.js'
    import { addSortBy } from '$lib/plugins/addSortBy.js'
    import { Render } from '$lib/render/index.js'
    import { wrapRows, type Mechanism } from './runesComponent.svelte.js'

    // Same data and plugins as src/lib/FromStoreHost.test.svelte, but every
    // row/cell is read through a runes wrapper built in <script>, never in
    // the template. No <Subscribe>, no fromStore in markup.
    const { mechanism }: { mechanism: Mechanism } = $props()

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

    // Wrappers are created here, at component init, re-created only when the
    // view model re-emits rows (e.g. a sort derivation). `mechanism` is fixed
    // for the lifetime of a host instance.
    const wrappedHeaderRows = $derived(wrapRows($headerRows, mechanism))
    const wrappedRows = $derived(wrapRows($rows, mechanism))
</script>

<table {...$tableAttrs}>
    <thead>
        {#each wrappedHeaderRows as { row, wrapper, cells } (row.id)}
            <tr {...wrapper.attrs}>
                {#each row.cells as cell (cell.id)}
                    {@const w = cells.get(cell.id)!}
                    <th
                        {...w.attrs}
                        data-testid={`th-${cell.id}`}
                        data-order={w.props.sort.order ?? 'none'}
                        onclick={w.props.sort.toggle}
                    >
                        <Render of={cell.render()} />
                    </th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody>
        {#each wrappedRows as { row, wrapper, cells } (row.id)}
            <tr {...wrapper.attrs} data-testid="row">
                {#each row.cells as cell (cell.id)}
                    {@const w = cells.get(cell.id)!}
                    <td {...w.attrs}><Render of={cell.render()} /></td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
