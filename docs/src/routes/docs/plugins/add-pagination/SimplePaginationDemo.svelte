<script>
    import { createTable, Render } from '@humanspeak/svelte-headless-table'
    import { addPagination } from '@humanspeak/svelte-headless-table/plugins'
    import { createSamples } from '$lib/utils/createSamples'

    const data = createSamples(100, 1, 0, { seed: 10 })

    const table = createTable(data, {
        page: addPagination()
    })

    const columns = table.createColumns([
        table.group({
            header:
                (_, { pageRows }) =>
                () =>
                    `Name (${pageRows().length} on page)`,
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
    const { pageIndex, pageCount, pageSize, hasNextPage, hasPreviousPage } = pluginStates.page
</script>

<pre>{JSON.stringify(
        {
            pageIndex: pageIndex.current,
            pageCount: pageCount.current,
            pageSize: pageSize.current
        },
        null,
        2
    )}</pre>

<div class="mb-4 flex items-baseline gap-4">
    <button
        onclick={() => (pageIndex.current -= 1)}
        disabled={!hasPreviousPage.current}
        class="demo">Previous page</button
    >
    {pageIndex.current + 1} out of {pageCount.current}
    <button onclick={() => (pageIndex.current += 1)} disabled={!hasNextPage.current} class="demo"
        >Next page</button
    >
</div>
<label for="page-size">Page size</label>
<input id="page-size" type="number" min={1} bind:value={pageSize.current} class="demo mb-4" />

<div class="overflow-x-auto">
    <table class="demo my-0" {...vm.current.tableAttrs}>
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
            {#each vm.current.pageRows as row (row.id)}
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
