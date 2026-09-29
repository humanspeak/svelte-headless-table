import { createTable } from './createTable.js'
import { addPagination } from './plugins/addPagination.svelte.js'
import { addSortBy } from './plugins/addSortBy.svelte.js'
import type { TablePlugin } from './types/TablePlugin.js'

interface Item {
    name: string
    age: number
}
const items: Item[] = [
    { name: 'b', age: 2 },
    { name: 'a', age: 1 },
    { name: 'c', age: 3 }
]
const names = (rows: { isData(): boolean }[]) =>
    rows.map((row) => (row.isData() ? (row as unknown as { original: Item }).original.name : '?'))

it('gives a plugin the rows that enter its position in the chain', () => {
    let seen: (() => unknown[]) | undefined
    const spy: TablePlugin<Item, Record<string, never>, Record<string, never>> = ({ upstream }) => {
        seen = upstream.rows
        return { pluginState: {}, deriveRows: (rows) => rows }
    }
    const table = createTable(items, {
        sort: addSortBy({ initialSortKeys: [{ id: 'age', order: 'asc' }] }),
        spy
    })
    const vm = table.createViewModel([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    // The spy sits after sort, so its upstream is the sorted rows.
    expect(names(seen?.() as never)).toEqual(['a', 'b', 'c'])
    expect(names(vm.pluginStates.sort.preSortedRows.current)).toEqual(['b', 'a', 'c'])
})

it('is readable as soon as the plugin is created, before anything reads the view model', () => {
    const spy: TablePlugin<
        Item,
        { upstreamCount: { readonly current: number } },
        Record<string, never>
    > = ({ upstream }) => ({
        // No deriveRows: nothing captures a getter, only `upstream` is read.
        pluginState: {
            upstreamCount: {
                get current() {
                    return upstream.rows().length
                }
            }
        }
    })
    const table = createTable(items, { spy })
    const vm = table.createViewModel([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    // Read before `vm.current` (and so before any chain derivation) is touched.
    expect(vm.pluginStates.spy.upstreamCount.current).toBe(3)
})

it('gives page-row plugins the rows entering derivePageRows', () => {
    let seen: (() => unknown[]) | undefined
    const spy: TablePlugin<Item, Record<string, never>, Record<string, never>> = ({ upstream }) => {
        seen = upstream.pageRows
        return { pluginState: {}, derivePageRows: (rows) => rows }
    }
    const table = createTable(items, {
        page: addPagination({ initialPageSize: 2 }),
        spy
    })
    const vm = table.createViewModel([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    expect(names(seen?.() as never)).toEqual(['b', 'a'])
    expect(vm.pluginStates.page.pageCount.current).toBe(2)
    expect(names(vm.current.pageRows)).toEqual(['b', 'a'])
})

it('a plugin with no deriveRows still sees the rows at its position', () => {
    let seen: (() => unknown[]) | undefined
    const spy: TablePlugin<Item, Record<string, never>, Record<string, never>> = ({ upstream }) => {
        seen = upstream.rows
        return { pluginState: {} }
    }
    const table = createTable(items, {
        sort: addSortBy({ initialSortKeys: [{ id: 'age', order: 'asc' }] }),
        spy
    })
    table.createViewModel([
        table.column({ header: 'Name', accessor: 'name' }),
        table.column({ header: 'Age', accessor: 'age' })
    ])
    expect(names(seen?.() as never)).toEqual(['a', 'b', 'c'])
})
