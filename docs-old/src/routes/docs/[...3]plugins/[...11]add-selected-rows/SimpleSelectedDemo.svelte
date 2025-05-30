<script>
    import { derived, readable } from 'svelte/store'
    import { createTable, Subscribe, Render, createRender } from '@humanspeak/svelte-headless-table'
    import {
        addSubRows,
        addExpandedRows,
        addSelectedRows
    } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'
    import ExpandIndicator from '../[...10]add-expanded-rows/ExpandIndicator.svelte'
    import SelectIndicator from './SelectIndicator.svelte'

    const data = readable(createSamples(10, 5, 3))

    const table = createTable(data, {
        sub: addSubRows({
            children: 'children'
        }),
        select: addSelectedRows(),
        expand: addExpandedRows()
    })

    const columns = table.createColumns([
        table.display({
            id: 'selected',
            header: '',
            cell: ({ row }, { pluginStates }) => {
                const { isSomeSubRowsSelected, isSelected } = pluginStates.select.getRowState(row)
                return createRender(SelectIndicator, {
                    isSelected,
                    isSomeSubRowsSelected
                })
            }
        }),
        table.display({
            id: 'expanded',
            header: '',
            cell: ({ row }, { pluginStates }) => {
                const { isExpanded, canExpand, isAllSubRowsExpanded } =
                    pluginStates.expand.getRowState(row)
                return createRender(ExpandIndicator, {
                    depth: row.depth,
                    isExpanded,
                    canExpand,
                    isAllSubRowsExpanded
                })
            }
        }),
        table.group({
            header: (_, { rows }) => derived([rows], ([_rows]) => `Name (${_rows.length} users)`),
            columns: [
                table.column({
                    header: 'First Name',
                    accessor: 'firstName'
                }),
                table.column({
                    header: 'Last Name',
                    accessor: 'lastName'
                })
            ]
        }),
        table.group({
            header: 'Info',
            columns: [
                table.column({
                    header: 'Age',
                    accessor: 'age'
                }),
                table.column({
                    header: 'Status',
                    accessor: 'status'
                }),
                table.column({
                    header: 'Visits',
                    accessor: 'visits'
                }),
                table.column({
                    header: 'Profile Progress',
                    accessor: 'progress'
                })
            ]
        })
    ])

    const { headerRows, rows, tableAttrs, tableBodyAttrs, pluginStates } =
        table.createViewModel(columns)
    const { selectedDataIds } = pluginStates.select
</script>

<pre>{JSON.stringify(
        {
            $selectedDataIds: $selectedDataIds
        },
        null,
        2
    )}</pre>

<div class="overflow-x-auto">
    <table class="demo my-0" {...$tableAttrs}>
        <thead>
            {#each $headerRows as headerRow (headerRow.id)}
                <Subscribe rowAttrs={headerRow.attrs()} let:rowAttrs>
                    <tr>
                        {#each headerRow.cells as cell (cell.id)}
                            <Subscribe
                                attrs={cell.attrs()}
                                let:attrs
                                props={cell.props()}
                                let:props
                            >
                                <th {...attrs}>
                                    <Render of={cell.render()} />
                                </th>
                            </Subscribe>
                        {/each}
                    </tr>
                </Subscribe>
            {/each}
        </thead>
        <tbody {...$tableBodyAttrs}>
            {#each $rows as row (row.id)}
                <Subscribe rowProps={row.props()} let:rowProps>
                    <tr class:selected={rowProps.select.selected}>
                        {#each row.cells as cell (cell.id)}
                            <Subscribe attrs={cell.attrs()} let:attrs>
                                <td {...attrs}>
                                    <Render of={cell.render()} />
                                </td>
                            </Subscribe>
                        {/each}
                    </tr>
                </Subscribe>
            {/each}
        </tbody>
    </table>
</div>

<style>
    .selected {
        background: rgb(148, 205, 255, 0.2);
    }
</style>
