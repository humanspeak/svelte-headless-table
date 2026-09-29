import { expectTypeOf } from 'vitest'
import type { DataBodyCell } from './bodyCells.js'
import type { BodyRow, DataBodyRow } from './bodyRows.js'
import { createTable } from './createTable.js'
import { addPagination } from './plugins/addPagination.svelte.js'
import { addSelectedRows } from './plugins/addSelectedRows.svelte.js'
import { addSortBy, type SortKey } from './plugins/addSortBy.svelte.js'
import type { Box, RecordSet } from './reactivity.svelte.js'
import type { NewTablePropSet, TablePlugin } from './types/TablePlugin.js'

// Compile-time pins of the v7 public API. `pnpm check` type-checks this file;
// vitest also runs it, so every call below must be valid at runtime too.

type Item = { name: string; age: number }
const items: Item[] = [
    { name: 'a', age: 1 },
    { name: 'b', age: 2 }
]

it('createTable accepts an array or a getter, and rejects a store', () => {
    expectTypeOf(createTable(items).data).toEqualTypeOf<() => Item[]>()
    expectTypeOf(createTable(() => items).data).toEqualTypeOf<() => Item[]>()

    // A Readable-shaped object (the v6 input). Hand-written so the library
    // test suite still has no Svelte store import.
    const store = {
        subscribe: (run: (_value: Item[]) => void) => {
            run(items)
            return () => {}
        }
    }
    // @ts-expect-error: v7 takes an array or a getter, never a store.
    expect(() => createTable(store)).toThrow(/Svelte stores are not accepted in v7/)
})

it('exposes the view model and plugin state as boxes', () => {
    const table = createTable(items, {
        sort: addSortBy(),
        page: addPagination(),
        select: addSelectedRows()
    })
    const columns = table.createColumns([table.column({ header: 'Name', accessor: 'name' })])
    const vm = table.createViewModel(columns)
    type Plugins = typeof table.plugins

    expectTypeOf(vm.current.pageRows).toEqualTypeOf<DataBodyRow<Item, Plugins>[]>()
    expectTypeOf(vm.current.pageRows).toExtend<BodyRow<Item, Plugins>[]>()
    expectTypeOf(vm.pluginStates.page.pageIndex).toEqualTypeOf<Box<number>>()
    expectTypeOf(vm.pluginStates.sort.sortKeys.current).toEqualTypeOf<SortKey[]>()
    expectTypeOf(vm.pluginStates.select.selectedDataIds).toEqualTypeOf<RecordSet>()

    expect(vm.current.pageRows).toHaveLength(2)
})

it('accepts a hand-written plugin on the v7 contract', () => {
    type CustomPropSet = NewTablePropSet<{ 'tbody.tr': { x: number } }>
    const custom: TablePlugin<
        Item,
        Record<string, never>,
        Record<string, never>,
        CustomPropSet
    > = () => ({
        pluginState: {},
        deriveRows: (rows) => rows,
        hooks: {
            'tbody.tr': () => ({ props: () => ({ x: 1 }) })
        }
    })

    const table = createTable(items, { custom })
    const columns = table.createColumns([table.column({ header: 'Age', accessor: 'age' })])
    const vm = table.createViewModel(columns)
    const row = vm.current.pageRows[0]

    expectTypeOf(row.current.props.custom).toEqualTypeOf<{ x: number }>()
    expect(row.current.props.custom.x).toBe(1)
})

it('keeps the view model plumbing off rows and cells', () => {
    expectTypeOf<BodyRow<Item>>().not.toHaveProperty('applyHook')
    expectTypeOf<BodyRow<Item>>().not.toHaveProperty('injectState')
    expectTypeOf<DataBodyCell<Item>>().not.toHaveProperty('state')
})
