<script lang="ts" module>
    const textPrefixFilter: ColumnFilterFn = ({ filterValue, value }) => {
        return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase())
    }
    const minFilter: ColumnFilterFn = ({ filterValue, value }) => {
        if (typeof value !== 'number' || typeof filterValue !== 'number') return true
        return filterValue <= value
    }
    const numberRangeFilter: ColumnFilterFn = ({ filterValue, value }) => {
        if (!Array.isArray(filterValue) || typeof value !== 'number') return true
        const [min, max] = filterValue
        if (min === null && max === null) return true
        if (min === null) return value <= max
        if (max === null) return min <= value

        return min <= value && value <= max
    }
    const matchFilter: ColumnFilterFn = ({ filterValue, value }) => {
        if (filterValue === undefined) return true
        return filterValue === value
    }
</script>

<script lang="ts">
    import { createRender, createTable, Render } from '@humanspeak/svelte-headless-table'
    import {
        addColumnFilters,
        type ColumnFilterFn
    } from '@humanspeak/svelte-headless-table/plugins'
    import TextFilter from './TextFilter.svelte'
    import SelectFilter from './SelectFilter.svelte'
    import NumberRangeFilter from './NumberRangeFilter.svelte'
    import SliderFilter from './SliderFilter.svelte'
    import { createSamples } from '$lib/utils/createSamples'

    const data = createSamples(30, 1, 0, { seed: 5 })

    const table = createTable(data, {
        filter: addColumnFilters()
    })

    const columns = table.createColumns([
        table.group({
            header: 'Name',
            columns: [
                table.column({
                    header: 'First Name',
                    accessor: 'firstName',
                    plugins: {
                        filter: {
                            fn: textPrefixFilter,
                            initialFilterValue: '',
                            render: ({ filterValue, values, preFilteredValues }) =>
                                createRender(TextFilter, { filterValue, values, preFilteredValues })
                        }
                    }
                }),
                table.column({
                    header: 'Last Name',
                    accessor: 'lastName',
                    plugins: {
                        filter: {
                            fn: textPrefixFilter,
                            initialFilterValue: '',
                            render: ({ filterValue, values, preFilteredValues }) =>
                                createRender(TextFilter, { filterValue, values, preFilteredValues })
                        }
                    }
                })
            ]
        }),
        table.group({
            header: 'Info',
            columns: [
                table.column({
                    header: 'Age',
                    accessor: 'age',
                    plugins: {
                        filter: {
                            fn: numberRangeFilter,
                            initialFilterValue: [null, null],
                            render: ({ filterValue, values }) =>
                                createRender(NumberRangeFilter, { filterValue, values })
                        }
                    }
                }),
                table.column({
                    header: 'Status',
                    accessor: 'status',
                    plugins: {
                        filter: {
                            fn: matchFilter,
                            render: ({ filterValue, preFilteredValues }) =>
                                createRender(SelectFilter, { filterValue, preFilteredValues })
                        }
                    }
                }),
                table.column({
                    header: 'Visits',
                    accessor: 'visits',
                    plugins: {
                        filter: {
                            fn: minFilter,
                            initialFilterValue: 0,
                            render: ({ filterValue, preFilteredValues }) =>
                                createRender(SliderFilter, { filterValue, preFilteredValues })
                        }
                    }
                }),
                table.column({
                    header: 'Profile Progress',
                    accessor: 'progress'
                })
            ]
        })
    ])

    const vm = table.createViewModel(columns)
    const { pluginStates } = vm
    const { filterValues } = pluginStates.filter
</script>

<pre>filterValues.current = {JSON.stringify(filterValues.current, null, 2)}</pre>

<div class="overflow-x-auto">
    <table class="demo my-0" {...vm.current.tableAttrs}>
        <thead>
            {#each vm.current.headerRows as headerRow (headerRow.id)}
                <tr {...headerRow.current.attrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <th {...cell.current.attrs}>
                            <Render of={cell.render()} />
                            {#if cell.current.props.filter?.render}
                                <div>
                                    <Render of={cell.current.props.filter.render} />
                                </div>
                            {/if}
                        </th>
                    {/each}
                </tr>
            {/each}
        </thead>
        <tbody {...vm.current.tableBodyAttrs}>
            {#each vm.current.rows as row (row.id)}
                <tr {...row.current.attrs}>
                    {#each row.cells as cell (cell.id)}
                        <td><Render of={cell.render()} /></td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>
