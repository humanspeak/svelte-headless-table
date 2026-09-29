<script lang="ts">
    import { createTable } from '$lib/createTable.js'
    import { addSortBy } from '$lib/plugins/addSortBy.svelte.js'
    import { box, type Box } from '$lib/reactivity.svelte.js'
    import { Render } from '$lib/render/index.js'
    import type {
        NewTableAttributeSet,
        NewTablePropSet,
        TablePlugin
    } from '$lib/types/TablePlugin.js'

    interface Item {
        name: string
        age: number
    }

    // A minimal v7 column-width plugin (a `thead.tr.th` attrs hook over a
    // record box). A minimal plugin keeps this host independent of addResizedColumns.
    const addTestWidths =
        (): TablePlugin<
            Item,
            { columnWidths: Box<Record<string, number>> },
            Record<string, never>,
            NewTablePropSet<{ 'thead.tr.th': { width: number | undefined } }>,
            NewTableAttributeSet<{ 'thead.tr.th': { style?: { width: string } } }>
        > =>
        () => {
            const columnWidths = box<Record<string, number>>({})
            return {
                pluginState: { columnWidths },
                hooks: {
                    'thead.tr.th': (cell) => ({
                        props: () => ({ width: columnWidths.current[cell.id] }),
                        attrs: () => {
                            const widths = columnWidths.current
                            return Object.hasOwn(widths, cell.id)
                                ? { style: { width: `${String(widths[cell.id])}px` } }
                                : {}
                        }
                    })
                }
            }
        }

    // The runes-native idiom: attrs and props read as plain reactive values
    // from `current`.
    const table = createTable(
        [
            { name: 'Grace', age: 45 },
            { name: 'Ada', age: 36 }
        ],
        { sort: addSortBy<Item>(), resize: addTestWidths() }
    )
    const columns = table.createColumns([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    const vm = table.createViewModel(columns)

    export const pluginStates = vm.pluginStates
    export const viewModel = vm
</script>

<table {...vm.current.tableAttrs}>
    <thead>
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
    <tbody>
        {#each vm.current.rows as row (row.id)}
            <tr {...row.current.attrs} data-testid="row">
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}><Render of={cell.render()} /></td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
