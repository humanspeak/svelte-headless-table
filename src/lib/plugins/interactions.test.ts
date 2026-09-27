import { get, readable } from 'svelte/store'
import { describe, expect, test } from 'vitest'
import { createTable } from '../createTable.js'
import { addColumnFilters, matchFilter, textPrefixFilter } from './addColumnFilters.js'
import { addExpandedRows } from './addExpandedRows.js'
import { addGroupBy } from './addGroupBy.js'
import { addHiddenColumns } from './addHiddenColumns.js'
import { addPagination } from './addPagination.js'
import { addSelectedRows } from './addSelectedRows.js'
import { addSortBy } from './addSortBy.js'
import { addSubRows } from './addSubRows.js'
import { addTableFilter } from './addTableFilter.js'

// Plugins compose through the derivation chain in the order they are
// declared. These tests pin the observable semantics of the combinations
// users ask about most, so a change in behaviour is a deliberate one.

interface Item {
    name: string
    status: string
    age: number
    children?: Item[]
}

const flat: Item[] = [
    { name: 'Alice', status: 'active', age: 30 },
    { name: 'Bob', status: 'inactive', age: 40 },
    { name: 'Cara', status: 'active', age: 50 },
    { name: 'Dan', status: 'inactive', age: 60 },
    { name: 'Eve', status: 'active', age: 70 }
]

const tree: Item[] = [
    {
        name: 'Alice',
        status: 'inactive',
        age: 30,
        children: [{ name: 'Amy', status: 'active', age: 3 }]
    },
    {
        name: 'Bob',
        status: 'active',
        age: 40,
        children: [
            { name: 'Ben', status: 'inactive', age: 5 },
            { name: 'Bea', status: 'active', age: 4 }
        ]
    }
]

const names = (rows: { isData(): boolean; original?: Item }[]) =>
    rows.map((r) => (r.isData() ? (r as { original: Item }).original.name : '(group)'))

describe('column filters with hidden columns', () => {
    test('a filter on a hidden column still applies (hidden cells stay reachable through cellForId)', () => {
        const table = createTable(readable(flat), {
            hide: addHiddenColumns({ initialHiddenColumnIds: ['status'] }),
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({ accessor: 'name', header: 'Name' }),
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: { colFilter: { fn: matchFilter } }
            })
        ])
        const vm = table.createViewModel(columns)
        expect(get(vm.visibleColumns).map((c) => c.id)).toEqual(['name'])
        vm.pluginStates.colFilter.filterValues.set({ status: 'active' })
        expect(names(get(vm.rows))).toEqual(['Alice', 'Cara', 'Eve'])
    })
})

describe('table filter with hidden columns', () => {
    test('hidden columns are excluded from the table filter by default and included with includeHiddenColumns', () => {
        const build = (includeHiddenColumns: boolean) => {
            const table = createTable(readable(flat), {
                hide: addHiddenColumns({ initialHiddenColumnIds: ['status'] }),
                tableFilter: addTableFilter({ fn: textPrefixFilter, includeHiddenColumns })
            })
            const columns = table.createColumns([
                table.column({ accessor: 'name', header: 'Name' }),
                table.column({ accessor: 'status', header: 'Status' })
            ])
            const vm = table.createViewModel(columns)
            vm.pluginStates.tableFilter.filterValue.set('inact')
            return names(get(vm.rows))
        }
        expect(build(false)).toEqual([])
        expect(build(true)).toEqual(['Bob', 'Dan'])
    })
})

describe('expanded rows with column filters', () => {
    // The plugin set differs per test, so the column helper is typed loosely on purpose.
    const columnsFor = (table: any) =>
        table.createColumns([
            table.column({ accessor: 'name', header: 'Name' }),
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: { colFilter: { fn: matchFilter } }
            })
        ])

    test('filter declared before expand: children are filtered inside their parent, then expanded', () => {
        const table = createTable(readable(tree), {
            sub: addSubRows({ children: 'children' }),
            colFilter: addColumnFilters(),
            expand: addExpandedRows({ initialExpandedIds: { '0': true, '1': true } })
        })
        const vm = table.createViewModel(columnsFor(table))
        vm.pluginStates.colFilter.filterValues.set({ status: 'active' })
        // Alice does not match but Amy does, so Alice stays (default matchMode) with only Amy beneath her;
        // Bob matches and keeps only Bea.
        expect(names(get(vm.rows))).toEqual(['Alice', 'Amy', 'Bob', 'Bea'])
    })

    test('expand declared before filter: expanded children become top-level rows and are filtered individually', () => {
        const table = createTable(readable(tree), {
            sub: addSubRows({ children: 'children' }),
            expand: addExpandedRows({ initialExpandedIds: { '0': true, '1': true } }),
            colFilter: addColumnFilters()
        })
        const vm = table.createViewModel(columnsFor(table))
        vm.pluginStates.colFilter.filterValues.set({ status: 'active' })
        const rows = get(vm.rows)
        // Alice is kept only because her subtree still contains a match; Amy, Bob and Bea appear as their own rows.
        expect(names(rows)).toEqual(['Alice', 'Amy', 'Bob', 'Bea'])
    })
})

describe('group by with pagination', () => {
    test('page size counts group rows, not the leaf rows inside them', () => {
        const table = createTable(readable(flat), {
            group: addGroupBy({ initialGroupByIds: ['status'] }),
            page: addPagination({ initialPageSize: 1 })
        })
        const columns = table.createColumns([
            table.column({ accessor: 'name', header: 'Name' }),
            table.column({ accessor: 'status', header: 'Status' })
        ])
        const vm = table.createViewModel(columns)
        const page = get(vm.pageRows)
        expect(page).toHaveLength(1)
        expect(page[0].isData()).toBe(false)
        expect(page[0].subRows?.length).toBe(3) // the three "active" leaves ride inside the one group row
        expect(get(vm.pluginStates.page.pageCount)).toBe(2)
    })
})

describe('selected rows with pagination', () => {
    test('allPageRowsSelected reflects and sets only the current page', () => {
        const table = createTable(readable(flat), {
            page: addPagination({ initialPageSize: 2 }),
            select: addSelectedRows()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        // Page-scoped plugin state reads the view model's `pageRows` store, which is
        // only populated while something subscribes to it (a template does; a bare
        // test must read it first). Keep the subscription open for the assertions.
        const unsubscribe = vm.pageRows.subscribe(() => {})
        vm.pluginStates.select.allPageRowsSelected.set(true)
        expect(Object.keys(get(vm.pluginStates.select.selectedDataIds)).sort()).toEqual(['0', '1'])
        vm.pluginStates.page.pageIndex.set(1)
        expect(get(vm.pluginStates.select.allPageRowsSelected)).toBe(false)
        expect(get(vm.pluginStates.select.someRowsSelected)).toBe(true)
        vm.pluginStates.select.allPageRowsSelected.set(true)
        expect(Object.keys(get(vm.pluginStates.select.selectedDataIds)).sort()).toEqual([
            '0',
            '1',
            '2',
            '3'
        ])
        unsubscribe()
    })
})

describe('sort by with sub-rows', () => {
    test('sub-rows are sorted within their parent, parents among themselves', () => {
        const table = createTable(readable(tree), {
            sub: addSubRows({ children: 'children' }),
            sort: addSortBy({ initialSortKeys: [{ id: 'name', order: 'desc' }] })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const rows = get(vm.rows)
        expect(names(rows)).toEqual(['Bob', 'Alice'])
        expect(names(rows[0].subRows ?? [])).toEqual(['Ben', 'Bea'])
    })
})

describe('table filter with sub-rows', () => {
    test('a parent is kept when any descendant matches, with only matching descendants beneath it', () => {
        const table = createTable(readable(tree), {
            sub: addSubRows({ children: 'children' }),
            tableFilter: addTableFilter({ fn: textPrefixFilter })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        vm.pluginStates.tableFilter.filterValue.set('Be')
        const rows = get(vm.rows)
        expect(names(rows)).toEqual(['Bob'])
        expect(names(rows[0].subRows ?? [])).toEqual(['Ben', 'Bea'])
    })
})
