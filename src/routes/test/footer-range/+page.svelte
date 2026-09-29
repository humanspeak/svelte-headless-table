<script lang="ts">
    /**
     * Fixture for tests/virtual-scroll-footer.test.ts: a virtual table with a
     * "rows N-M" footer built on `viewportRange`, configured from the query
     * string so each test can pick the markup it needs.
     *
     *   sticky=1         the header is `position: sticky`
     *   measureHeader=1  the header carries `measureHeaderAction`
     *   measureRows=0    rows are not measured with `measureRowAction`
     *   variable=1       row heights differ from row to row
     *   sparse=1         sparse mode over `count` rows
     */
    import { page } from '$app/state'
    import { Render, createTable } from '../../../lib/index.js'
    import { addVirtualScroll } from '../../../lib/plugins/index.js'

    interface Item {
        id: number
        name: string
    }

    const params = page.url.searchParams
    const sticky = params.get('sticky') === '1'
    const measureHeader = params.get('measureHeader') === '1'
    const sparse = params.get('sparse') === '1'
    const rowHeight = Number(params.get('rowHeight') ?? 32)
    const estimated = Number(params.get('estimated') ?? 32)
    const bufferSize = Number(params.get('buffer') ?? 10)
    const count = Number(params.get('count') ?? 5000)

    const items: Item[] = Array.from({ length: count }, (_, id) => ({ id, name: `Row ${id}` }))

    const table = createTable(() => items, {
        virtualScroll: addVirtualScroll<Item>({
            estimatedRowHeight: estimated,
            bufferSize,
            ...(sparse ? { totalRows: count, dataOffset: 0 } : {})
        })
    })
    const columns = table.createColumns([
        table.column({ header: 'ID', accessor: 'id' }),
        table.column({ header: 'Name', accessor: 'name' })
    ])
    const viewModel = table.createViewModel(columns)
    const {
        virtualScroll,
        topSpacerHeight,
        bottomSpacerHeight,
        visibleRange,
        viewportRange,
        scrollTop,
        measureRowAction,
        measureHeaderAction
    } = viewModel.pluginStates.virtualScroll

    const variable = params.get('variable') === '1'
    const heightFor = (id: number) => (variable ? rowHeight + ((id * 7) % 23) : rowHeight)
    const measureRows = params.get('measureRows') !== '0'
    const maybeMeasureRow = (node: HTMLElement, id: string) =>
        measureRows ? measureRowAction(node, id) : undefined
    const maybeMeasureHeader = (node: HTMLElement) =>
        measureHeader ? measureHeaderAction(node) : undefined
    const pad = (value: number) => String(value).padStart(5, '0')
</script>

<div class="container" data-testid="container" use:virtualScroll>
    <table {...viewModel.current.tableAttrs}>
        <thead class:sticky use:maybeMeasureHeader>
            {#each viewModel.current.headerRows as headerRow (headerRow.id)}
                <tr {...headerRow.current.attrs}>
                    {#each headerRow.cells as cell (cell.id)}
                        <th {...cell.current.attrs}><Render of={cell.render()} /></th>
                    {/each}
                </tr>
            {/each}
        </thead>
        <tbody {...viewModel.current.tableBodyAttrs}>
            {#if topSpacerHeight.current > 0}
                <tr
                    ><td colspan="2" style="height: {topSpacerHeight.current}px; padding: 0"
                    ></td></tr
                >
            {/if}
            {#each viewModel.current.pageRows as row (row.id)}
                <tr
                    {...row.current.attrs}
                    data-row-id={row.id}
                    style="height: {heightFor(Number(row.id))}px"
                    use:maybeMeasureRow={row.id}
                >
                    {#each row.cells as cell (cell.id)}
                        <td {...cell.current.attrs}><Render of={cell.render()} /></td>
                    {/each}
                </tr>
            {/each}
            {#if bottomSpacerHeight.current > 0}
                <tr
                    ><td colspan="2" style="height: {bottomSpacerHeight.current}px; padding: 0"
                    ></td></tr
                >
            {/if}
        </tbody>
    </table>
</div>
<footer data-testid="footer">
    rows {pad(viewportRange.current.start + 1)}-{pad(viewportRange.current.end)}
</footer>
<pre data-testid="debug">{JSON.stringify({
        viewport: viewportRange.current,
        visible: visibleRange.current,
        scrollTop: scrollTop.current,
        topSpacer: topSpacerHeight.current
    })}</pre>

<style>
    .container {
        height: 400px;
        overflow: auto;
        border: 1px solid #999;
    }
    table {
        width: 100%;
        border-collapse: collapse;
    }
    th {
        height: 36px;
        background: #eee;
    }
    td {
        padding: 0 8px;
    }
    thead.sticky {
        position: sticky;
        top: 0;
    }
</style>
