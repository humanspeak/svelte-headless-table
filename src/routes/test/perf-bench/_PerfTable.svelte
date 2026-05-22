<script lang="ts">
    /**
     * Renders the currently-mounted view-model for the perf-bench
     * fixture. Pulled out into a child component so each scenario's
     * fresh `vm` can be destructured at module scope (where the
     * `$store` auto-subscription syntax works) — the parent fixture
     * keys this component on `vm` so a scenario change forces a clean
     * remount, ensuring no stale subscriptions from the previous run.
     */
    import { Render, Subscribe } from '$lib/index.js'
    import type { TableViewModel } from '$lib/createViewModel.js'
    import type { AnyPlugins } from '$lib/types/TablePlugin.js'

    type AnyVm = TableViewModel<unknown, AnyPlugins>
    // The parent fixture keys this component on `vm` so a scenario change
    // forces a clean remount; within a single instance `vm` never changes.
    // The store references destructured below stay live for the component's
    // lifetime.
    // trunk-ignore(eslint/svelte/no-reactive-reassign)
    const { vm }: { vm: AnyVm } = $props()

    const { headerRows, pageRows, tableAttrs, tableBodyAttrs } = vm
</script>

<table {...$tableAttrs}>
    <thead>
        {#each $headerRows as headerRow (headerRow.id)}
            <Subscribe attrs={headerRow.attrs()} let:attrs>
                <tr {...attrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <Subscribe attrs={cell.attrs()} let:attrs>
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
        {#each $pageRows as row (row.id)}
            <Subscribe attrs={row.attrs()} let:attrs>
                <tr {...attrs} data-row-id={row.id} data-depth={row.depth}>
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
