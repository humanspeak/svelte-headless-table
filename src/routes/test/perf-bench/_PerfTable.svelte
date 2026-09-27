<script lang="ts">
    /**
     * Default renderer for the perf-bench fixture. Reads every row's and
     * cell's attrs through the runes-backed `current.attrs` getter and spreads
     * them directly, with no store-subscription wrapper component. The
     * store-path control lives in `_PerfTableStore.svelte` (`?renderer=store`).
     *
     * The parent fixture keys this component on `vm` so a scenario change
     * forces a clean remount, ensuring no stale subscriptions from the
     * previous run.
     */
    import { Render } from '$lib/index.js'
    import type { TableViewModel } from '$lib/createViewModel.js'
    import type { AnyPlugins } from '$lib/types/TablePlugin.js'

    type AnyVm = TableViewModel<unknown, AnyPlugins>
    // Keyed on `vm` by the parent, so `vm` never changes within an instance.
    const { vm }: { vm: AnyVm } = $props()

    const { headerRows, pageRows, tableAttrs, tableBodyAttrs } = vm
</script>

<table {...$tableAttrs}>
    <thead>
        {#each $headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th {...cell.current.attrs}>
                        <Render of={cell.render()} />
                    </th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody {...$tableBodyAttrs}>
        {#each $pageRows as row (row.id)}
            <tr {...row.current.attrs} data-row-id={row.id} data-depth={row.depth}>
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}>
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
