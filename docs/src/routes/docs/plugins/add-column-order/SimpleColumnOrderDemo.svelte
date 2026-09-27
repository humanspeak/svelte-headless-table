<script lang="ts" context="module">
    export const getShuffled = (items: string[]): string[] => {
        items = [...items]
        const shuffled = []
        while (items.length) {
            const rand = Math.floor(Math.random() * items.length)
            shuffled.push(items.splice(rand, 1)[0])
        }
        return shuffled
    }
</script>

<script lang="ts">
    import { readable } from 'svelte/store'
    import { onMount } from 'svelte'
    import { createTable, Render } from '@humanspeak/svelte-headless-table'
    import { addColumnOrder } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'

    const data = readable(createSamples(30, 1, 0, { seed: 9 }))

    const table = createTable(data, {
        colOrder: addColumnOrder()
    })

    const columns = table.createColumns([
        table.group({
            header: 'Name',
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

    const vm = table.createViewModel(columns)
    const { pluginStates } = vm
    const { columnIdOrder } = pluginStates.colOrder

    // Initialize column order on mount
    onMount(() => {
        $columnIdOrder = vm.current.visibleColumns.map((c) => c.id)
    })
</script>

<pre>$columnIdOrder = {JSON.stringify($columnIdOrder, null, 2)}</pre>

<button onclick={() => ($columnIdOrder = getShuffled($columnIdOrder))} class="demo"
    >Shuffle columns</button
>

<div class="overflow-x-auto">
    <table class="demo mb-0" {...vm.current.tableAttrs}>
        <thead>
            {#each vm.current.headerRows as headerRow (headerRow.id)}
                <tr {...headerRow.current.attrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <th {...cell.current.attrs}>
                            <Render of={cell.render()} />
                        </th>
                    {/each}
                </tr>
            {/each}
        </thead>
        <tbody {...vm.current.tableBodyAttrs}>
            {#each vm.current.rows as row (row.id)}
                <tr {...row.current.attrs}>
                    {#each row.cells as cell (cell.id)}
                        <td {...cell.current.attrs}>
                            <Render of={cell.render()} />
                        </td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
</div>
