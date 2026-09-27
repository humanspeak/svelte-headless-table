<script lang="ts">
    /**
     * Runes renderer for the perf-bench fixture (plan runes-core/001 spike).
     * Same markup as `_PerfTable.svelte`, but every row and cell reads its
     * attrs through a mechanism-A wrapper (`$derived(fromStore(...).current)`
     * in a class) built in <script>, spread directly with no `<Subscribe>`.
     * Selected with `/test/perf-bench?renderer=runes`.
     */
    import { Render } from '$lib/index.js'
    import type { TableViewModel } from '$lib/createViewModel.js'
    import type { AnyPlugins } from '$lib/types/TablePlugin.js'
    import { wrapRows } from '../runes-spike/runesComponent.svelte.js'

    type AnyVm = TableViewModel<unknown, AnyPlugins>
    // Keyed on `vm` by the parent, so `vm` never changes within an instance.
    const { vm }: { vm: AnyVm } = $props()

    const { headerRows, pageRows, tableAttrs, tableBodyAttrs } = vm

    const wrappedHeaderRows = $derived(wrapRows($headerRows, 'fromStore'))
    const wrappedPageRows = $derived(wrapRows($pageRows, 'fromStore'))
</script>

<table {...$tableAttrs}>
    <thead>
        {#each wrappedHeaderRows as { row: headerRow, wrapper, cells } (headerRow.id)}
            <tr {...wrapper.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th {...cells.get(cell.id)!.attrs}>
                        <Render of={cell.render()} />
                    </th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody {...$tableBodyAttrs}>
        {#each wrappedPageRows as { row, wrapper, cells } (row.id)}
            <tr {...wrapper.attrs} data-row-id={row.id} data-depth={row.depth}>
                {#each row.cells as cell (cell.id)}
                    <td {...cells.get(cell.id)!.attrs}>
                        <Render of={cell.render()} />
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>

<style>
    table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 0.75rem;
    }
    th,
    td {
        padding: 0.25rem 0.5rem;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    th {
        background: #f7fafc;
        font-weight: 600;
    }
</style>
