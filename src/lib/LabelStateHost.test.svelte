<script lang="ts">
    import { createTable } from '$lib/createTable.js'
    import { addPagination } from '$lib/plugins/addPagination.svelte.js'
    import { Render } from '$lib/render/index.js'

    interface Item {
        name: string
    }

    // Labels receive the TableState as their second argument; its members are
    // getters, so reading one inside a label is tracked by the cell's template.
    const table = createTable(
        [{ name: 'Ada' }, { name: 'Bea' }, { name: 'Cy' }, { name: 'Di' }, { name: 'Ed' }],
        { page: addPagination<Item>({ initialPageSize: 2 }) }
    )
    const columns = table.createColumns([
        table.column({
            header: (_cell, state) => `rows:${state.pageRows().length}`,
            accessor: 'name',
            cell: ({ value }, state) =>
                `${value}@${state.pluginStates.page.pageIndex.current}/${state.pageRows().length}`
        })
    ])
    const vm = table.createViewModel(columns)

    export const pluginStates = vm.pluginStates
</script>

{#each vm.current.headerRows as headerRow (headerRow.id)}
    {#each headerRow.cells as cell (cell.id)}
        <span data-testid="header"><Render of={cell.render()} /></span>
    {/each}
{/each}
{#each vm.current.pageRows as row (row.id)}
    {#each row.cells as cell (cell.id)}
        <span data-testid="cell"><Render of={cell.render()} /></span>
    {/each}
{/each}
