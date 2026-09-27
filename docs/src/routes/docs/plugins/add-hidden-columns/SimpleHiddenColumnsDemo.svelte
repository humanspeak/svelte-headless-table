<script lang="ts">
    import { readable } from 'svelte/store'
    import { createTable, Render } from '@humanspeak/svelte-headless-table'
    import { addHiddenColumns } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'

    const data = readable(createSamples(30, 1, 0, { seed: 4 }))

    const table = createTable(data, {
        hideCols: addHiddenColumns()
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
    const { flatColumns, pluginStates } = vm
    const { hiddenColumnIds } = pluginStates.hideCols
    const ids = flatColumns.map((c) => c.id)

    // Use $state for reactive checkbox bindings
    const hideForId: Record<string, boolean> = $state(
        Object.fromEntries(ids.map((id) => [id, false]))
    )

    // Update hidden columns when checkboxes change
    $effect(() => {
        $hiddenColumnIds = Object.entries(hideForId)
            .filter(([, hide]) => hide)
            .map(([id]) => id)
    })
</script>

<pre>$hiddenColumnIds = {JSON.stringify($hiddenColumnIds, null, 2)}</pre>

{#each ids as id (id)}
    <div class="flex items-center gap-4">
        <input id="hide-{id}" type="checkbox" bind:checked={hideForId[id]} />
        <label for="hide-{id}">{id}</label>
    </div>
{/each}

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
