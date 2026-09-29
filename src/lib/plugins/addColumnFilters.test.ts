import { describe, expect, test } from 'vitest'
import { createTable } from '../createTable.js'
import type { Box } from '../reactivity.svelte.js'
import {
    addColumnFilters,
    matchFilter,
    numberRangeFilter,
    textPrefixFilter
} from './addColumnFilters.svelte.js'
import { addSubRows } from './addSubRows.svelte.js'

interface Item {
    name: string
    age: number
    status: string
}

const sampleData: Item[] = [
    { name: 'Alice', age: 25, status: 'active' },
    { name: 'Bob', age: 30, status: 'inactive' },
    { name: 'Charlie', age: 35, status: 'active' },
    { name: 'Dave', age: 40, status: 'inactive' }
]

describe('unit tests for exported filter functions', () => {
    test('matchFilter: undefined filterValue returns true', () => {
        expect(matchFilter({ filterValue: undefined, value: 'anything' })).toBe(true)
    })

    test('matchFilter: exact match returns true', () => {
        expect(matchFilter({ filterValue: 'active', value: 'active' })).toBe(true)
    })

    test('matchFilter: mismatch returns false', () => {
        expect(matchFilter({ filterValue: 'active', value: 'inactive' })).toBe(false)
    })

    test('textPrefixFilter: empty string returns true', () => {
        expect(textPrefixFilter({ filterValue: '', value: 'anything' })).toBe(true)
    })

    test('textPrefixFilter: case-insensitive prefix match returns true', () => {
        expect(textPrefixFilter({ filterValue: 'ali', value: 'Alice' })).toBe(true)
        expect(textPrefixFilter({ filterValue: 'ALI', value: 'alice' })).toBe(true)
    })

    test('textPrefixFilter: non-prefix returns false', () => {
        expect(textPrefixFilter({ filterValue: 'bob', value: 'Alice' })).toBe(false)
        expect(textPrefixFilter({ filterValue: 'lice', value: 'Alice' })).toBe(false)
    })

    test('numberRangeFilter: in range returns true', () => {
        expect(numberRangeFilter({ filterValue: [10, 50], value: 25 })).toBe(true)
        expect(numberRangeFilter({ filterValue: [25, 25], value: 25 })).toBe(true)
    })

    test('numberRangeFilter: null min (unbounded low) returns true', () => {
        expect(numberRangeFilter({ filterValue: [null, 50], value: 25 })).toBe(true)
        expect(numberRangeFilter({ filterValue: [null, 50], value: -100 })).toBe(true)
    })

    test('numberRangeFilter: null max (unbounded high) returns true', () => {
        expect(numberRangeFilter({ filterValue: [10, null], value: 9999 })).toBe(true)
    })

    test('numberRangeFilter: out of range returns false', () => {
        expect(numberRangeFilter({ filterValue: [10, 50], value: 5 })).toBe(false)
        expect(numberRangeFilter({ filterValue: [10, 50], value: 55 })).toBe(false)
    })
})

describe('integration tests', () => {
    test('filters rows by column with matchFilter', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name'
            }),
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: { fn: matchFilter }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        vm.pluginStates.colFilter.filterValues.current = { status: 'active' }
        const rows = vm.current.rows
        expect(rows).toHaveLength(2)
        expect(rows[0].isData() && rows[0].original.name).toBe('Alice')
        expect(rows[1].isData() && rows[1].original.name).toBe('Charlie')
    })

    test('AND logic across multiple column filters', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: {
                    colFilter: { fn: textPrefixFilter }
                }
            }),
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: { fn: matchFilter }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        vm.pluginStates.colFilter.filterValues.current = {
            name: 'a',
            status: 'active'
        }
        const rows = vm.current.rows
        // Only Alice matches both: name starts with 'a' AND status is 'active'
        expect(rows).toHaveLength(1)
        expect(rows[0].isData() && rows[0].original.name).toBe('Alice')
    })

    test('unset filterValue does not filter', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: { fn: matchFilter }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        // filterValues is empty, so no filtering should occur
        const rows = vm.current.rows
        expect(rows).toHaveLength(4)
    })

    test('serverSide mode returns all rows', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters({ serverSide: true })
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: { fn: matchFilter }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        vm.pluginStates.colFilter.filterValues.current = { status: 'active' }
        const rows = vm.current.rows
        expect(rows).toHaveLength(4)
    })

    test('preFilteredRows contains rows before filtering', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: { fn: matchFilter }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        vm.pluginStates.colFilter.filterValues.current = { status: 'active' }
        // Trigger derivation
        expect(vm.current.rows).toBeDefined()
        const preFiltered = vm.pluginStates.colFilter.preFilteredRows.current
        expect(preFiltered).toHaveLength(4)
    })

    test('filterValues state is writable and reactive', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: { fn: matchFilter }
                }
            })
        ])
        const vm = table.createViewModel(columns)

        // Initially no filter
        let rows = vm.current.rows
        expect(rows).toHaveLength(4)

        // Apply filter
        vm.pluginStates.colFilter.filterValues.current = { status: 'active' }
        rows = vm.current.rows
        expect(rows).toHaveLength(2)

        // Clear filter
        vm.pluginStates.colFilter.filterValues.current = {}
        rows = vm.current.rows
        expect(rows).toHaveLength(4)
    })

    test('subRow recursive filtering: parent kept when subRows remain', () => {
        interface TreeItem {
            name: string
            status: string
            children?: TreeItem[]
        }
        const treeData: TreeItem[] = [
            {
                name: 'Parent',
                status: 'inactive',
                children: [
                    { name: 'Child1', status: 'active' },
                    { name: 'Child2', status: 'inactive' }
                ]
            },
            { name: 'Leaf', status: 'inactive' }
        ]
        const data = treeData
        const table = createTable(data, {
            sub: addSubRows({ children: 'children' }),
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name'
            }),
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: { fn: matchFilter }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        vm.pluginStates.colFilter.filterValues.current = { status: 'active' }
        const rows = vm.current.rows
        // Parent should remain because it has an active child
        // Leaf should be removed because it's inactive with no children
        expect(rows).toHaveLength(1)
        expect(rows[0].isData() && rows[0].original.name).toBe('Parent')
        // Check that only the active child remains
        expect(rows[0].subRows).toHaveLength(1)
        expect(rows[0].subRows![0].isData() && rows[0].subRows![0].original.name).toBe('Child1')
    })

    test('header cell props include render when render function provided', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: {
                        fn: matchFilter,
                        render: (({ filterValue }: any) => ({
                            component: 'input' as unknown as never,
                            props: { value: filterValue }
                        })) as any
                    }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        const headerRows = vm.current.headerRows
        const props = headerRows[0].cells[0].current.props
        expect(props.colFilter).toBeDefined()
        expect(props.colFilter?.render).toBeDefined()
    })

    test('column without colFilter plugin returns undefined props', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name'
                // No colFilter plugin options
            })
        ])
        const vm = table.createViewModel(columns)
        const headerRows = vm.current.headerRows
        const props = headerRows[0].cells[0].current.props
        expect(props.colFilter).toBeUndefined()
    })

    test('initialFilterValue sets initial filter on init', () => {
        const data = sampleData
        const table = createTable(data, {
            colFilter: addColumnFilters()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: {
                    colFilter: {
                        fn: matchFilter,
                        initialFilterValue: 'active'
                    }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        // v7 applies initialFilterValue when the view model creates the plugin,
        // so no header cell needs to be read first.
        const rows = vm.current.rows
        expect(rows).toHaveLength(2)
    })
})

describe('column ids containing dots (regression)', () => {
    test('setting a filter on a column whose id contains a dot does not throw and filters', () => {
        const table = createTable(sampleData, { colFilter: addColumnFilters() })
        // The header-cell props expose only `render`; the filter-value box is
        // handed to the column's `render` callback, so capture it there.
        let filterValue: Box<unknown> | undefined
        const columns = table.createColumns([
            table.column({
                accessor: 'status',
                id: 'status.v1',
                header: 'Status v1',
                plugins: {
                    colFilter: {
                        fn: matchFilter,
                        render: ((args: any) => {
                            filterValue = args.filterValue
                            return { component: 'input' as unknown as never, props: {} }
                        }) as any
                    }
                }
            })
        ])
        const vm = table.createViewModel(columns)
        const headerCell = vm.current.headerRows[0].cells[0]
        expect(headerCell.current.props).toBeDefined()

        expect(filterValue).toBeDefined()
        expect(() => {
            filterValue!.current = 'active'
        }).not.toThrow()
        expect(vm.pluginStates.colFilter.filterValues.current).toEqual({ 'status.v1': 'active' })
        expect(vm.current.rows.map((r) => r.isData() && r.original.status)).toEqual([
            'active',
            'active'
        ])
    })
})

describe('matchMode with sub-rows', () => {
    const treeData = [
        {
            name: 'Alice',
            age: 25,
            status: 'inactive',
            children: [{ name: 'Amy', age: 3, status: 'active' }]
        },
        {
            name: 'Bob',
            age: 30,
            status: 'active',
            children: [{ name: 'Ben', age: 5, status: 'inactive' }]
        },
        { name: 'Cara', age: 35, status: 'inactive', children: [] }
    ]
    const build = (config?: { matchMode?: 'self-or-descendants' | 'self' }) => {
        const table = createTable(treeData, {
            sub: addSubRows({ children: 'children' }),
            colFilter: addColumnFilters(config)
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
        vm.pluginStates.colFilter.filterValues.current = { status: 'active' }
        return vm.current.rows.map((r) => ({
            name: r.isData() ? r.original.name : '?',
            subs: (r.subRows ?? []).map((s) => (s.isData() ? s.original.name : '?'))
        }))
    }

    test('default keeps a parent whose descendant matches even if the parent does not', () => {
        expect(build()).toEqual([
            { name: 'Alice', subs: ['Amy'] },
            { name: 'Bob', subs: [] }
        ])
    })

    test('matchMode self requires every kept row to match on its own values', () => {
        expect(build({ matchMode: 'self' })).toEqual([{ name: 'Bob', subs: [] }])
    })
})
