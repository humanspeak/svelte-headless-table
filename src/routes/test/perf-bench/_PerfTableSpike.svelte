<script lang="ts">
    /**
     * v7 design spike renderer (plan 001), selected with `?renderer=spike`.
     * Same markup as `_PerfTable.svelte`, but the rows come from the spike's
     * getter-based view model (`src/routes/test/v7-spike/`) and every row and
     * cell reads the memo-free `current.attrs`. The parent passes the
     * scenario's raw data; the scenario's `vm` is used only for its column
     * list, page size and sort keys (mirrored into the spike so the
     * sort-cycle interaction drives it). The parent falls back to the default
     * renderer for presets whose plugins the spike does not model.
     * Throwaway: deleted by plan 004.
     */
    import { onDestroy, untrack } from 'svelte'
    import { get, type Readable } from 'svelte/store'
    import { Render } from '$lib/index.js'
    import type { TableViewModel } from '$lib/createViewModel.svelte.js'
    import { box, type Getter } from '../v7-spike/reactivity.svelte.js'
    import {
        addSpikePagination,
        addSpikeSort,
        createSpikeViewModel,
        type SortKey,
        type SpikeColumn,
        type SpikePlugin,
        type SpikeRow
    } from '../v7-spike/spikeViewModel.svelte.js'

    type AnyVm = TableViewModel<unknown>
    type Item = Record<string, unknown>
    // Keyed on `vm` by the parent, so neither prop changes within an instance.
    const { vm, data }: { vm: AnyVm; data: Item[] } = $props()

    const source = untrack(() => vm)
    const states = source.pluginStates as {
        sort?: { sortKeys: Readable<SortKey[]> }
        filter?: unknown
        page?: { pageSize: Readable<number> }
    }

    const columns: SpikeColumn<Item>[] = source.flatColumns.map((column) => {
        const key = (column as { accessorKey?: string }).accessorKey ?? column.id
        return {
            id: column.id,
            header: typeof column.header === 'string' ? column.header : column.id,
            accessor: (item: Item) => item[key]
        }
    })

    // A pass-through stand-in for addTableFilter (the presets never set a
    // filter value) so the per-cell hook fan-out matches the scenario.
    const addPassThroughFilter = (): SpikePlugin<Item, { filterValue: { current: string } }> => {
        const filterValue = box('')
        return {
            pluginState: { filterValue },
            deriveRows: (rows: Getter<SpikeRow<Item>[]>) => {
                const filtered = $derived.by(() => {
                    const value = filterValue.current.toLowerCase()
                    const all = rows()
                    if (value === '') return all
                    return all.filter((row) =>
                        row.cells.some((cell) => String(cell.value).toLowerCase().startsWith(value))
                    )
                })
                return () => filtered
            },
            hooks: {
                // Reads filter state like v6's per-cell `matches` derived; the
                // value is always empty in the presets, so nothing matches.
                'tbody.tr.td': () => ({ props: () => ({ matches: filterValue.current !== '' }) })
            }
        }
    }

    const sort = addSpikeSort<Item>({
        initialSortKeys: states.sort ? get(states.sort.sortKeys) : []
    })
    const plugins: Record<string, SpikePlugin<Item, unknown>> = { sort }
    if (states.filter !== undefined) plugins.filter = addPassThroughFilter()
    plugins.page = addSpikePagination<Item>({
        initialPageSize: states.page ? get(states.page.pageSize) : 10
    })
    const spike = createSpikeViewModel(() => data, columns, plugins)

    // The sort-cycle preset drives the scenario vm's `sortKeys` store; mirror
    // it into the spike's box (outside any derivation, so the write is legal).
    const unsubscribe = states.sort?.sortKeys.subscribe((keys) => {
        if (keys !== sort.pluginState.sortKeys.current) sort.pluginState.sortKeys.current = keys
    })
    onDestroy(() => unsubscribe?.())
</script>

<table data-renderer="spike">
    <thead>
        {#each spike.current.headerRows as headerRow (headerRow.id)}
            <tr {...headerRow.current.attrs}>
                {#each headerRow.cells as cell (cell.id)}
                    <th {...cell.current.attrs}>
                        <Render of={cell.label} />
                    </th>
                {/each}
            </tr>
        {/each}
    </thead>
    <tbody>
        {#each spike.current.pageRows as row (row.id)}
            <tr {...row.current.attrs} data-row-id={row.id} data-depth={0}>
                {#each row.cells as cell (cell.id)}
                    <td {...cell.current.attrs}>
                        <Render of={String(cell.value)} />
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
