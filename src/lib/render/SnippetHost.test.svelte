<script lang="ts" module>
    export { textSnippet }
</script>

<script lang="ts">
    import { createTable } from '$lib/createTable.js'
    import { Render, createSnippetRender } from './index.js'

    const table = createTable([{ name: 'Ada', age: 36 }])
    const columns = table.createColumns([
        table.column({
            header: 'Name',
            accessor: 'name',
            cell: ({ value }) => createSnippetRender(nameCell, value)
        }),
        table.column({
            header: () => createSnippetRender(ageHeader),
            accessor: 'age'
        })
    ])
    const vm = table.createViewModel(columns)
</script>

{#snippet nameCell(name: string)}
    <strong data-testid="name-cell">{name.toUpperCase()}</strong>
{/snippet}

{#snippet ageHeader()}
    <em data-testid="age-header">Age</em>
{/snippet}

{#snippet textSnippet(text: string)}
    <span data-testid="text-snippet">{text}</span>
{/snippet}

{#each vm.current.headerRows as headerRow (headerRow.id)}
    {#each headerRow.cells as cell (cell.id)}
        <span data-testid={`header-${cell.id}`}><Render of={cell.render()} /></span>
    {/each}
{/each}

{#each vm.current.rows as row (row.id)}
    {#each row.cells as cell (cell.id)}
        <span data-testid={`cell-${cell.id}`}><Render of={cell.render()} /></span>
    {/each}
{/each}
