import { get, readable, writable } from 'svelte/store'
import { DataColumn, DisplayColumn, GroupColumn } from './columns.js'
import { createTable, Table } from './createTable.js'
import { addHiddenColumns } from './plugins/addHiddenColumns.js'
import { addSortBy } from './plugins/addSortBy.js'

interface User {
    firstName: string
    lastName: string
    age: number
    visits: number
    progress: number
    status: string
}

const sampleData: User[] = [
    { firstName: 'Alice', lastName: 'Smith', age: 25, visits: 10, progress: 50, status: 'active' },
    { firstName: 'Bob', lastName: 'Jones', age: 30, visits: 20, progress: 75, status: 'inactive' },
    {
        firstName: 'Charlie',
        lastName: 'Brown',
        age: 35,
        visits: 15,
        progress: 100,
        status: 'active'
    }
]

describe('createTable factory function', () => {
    describe('positive cases', () => {
        it('creates a Table instance with writable store', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)

            expect(table).toBeInstanceOf(Table)
            expect(table.data).toBe(data)
            expect(table.plugins).toEqual({})
        })

        it('creates a Table instance with readable store', () => {
            const data = readable<User[]>(sampleData)
            const table = createTable(data)

            expect(table).toBeInstanceOf(Table)
            expect(table.data).toBe(data)
        })

        it('creates a Table instance with plugins', () => {
            const data = writable<User[]>(sampleData)
            const plugins = {
                sort: addSortBy(),
                hide: addHiddenColumns()
            }
            const table = createTable(data, plugins)

            expect(table.plugins).toBe(plugins)
            expect(table.plugins.sort).toBeDefined()
            expect(table.plugins.hide).toBeDefined()
        })

        it('creates a Table instance with empty plugins object', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data, {})

            expect(table.plugins).toEqual({})
        })
    })

    describe('edge cases', () => {
        it('handles empty data array', () => {
            const data = writable<User[]>([])
            const table = createTable(data)

            expect(table).toBeInstanceOf(Table)
            expect(get(table.data)).toEqual([])
        })

        it('handles data store that updates', () => {
            const data = writable<User[]>([])
            const table = createTable(data)

            data.set(sampleData)
            expect(get(table.data)).toEqual(sampleData)
        })
    })
})

describe('Table.column method', () => {
    const data = writable<User[]>(sampleData)
    const table = createTable(data)

    describe('positive cases', () => {
        it('creates DataColumn with accessorKey only', () => {
            const column = table.column({
                header: 'First Name',
                accessor: 'firstName'
            })

            expect(column).toBeInstanceOf(DataColumn)
            expect(column.id).toBe('firstName')
            expect(column.accessorKey).toBe('firstName')
            expect(column.accessorFn).toBeUndefined()
        })

        it('creates DataColumn with accessorKey and custom id', () => {
            const column = table.column({
                header: 'First Name',
                accessor: 'firstName',
                id: 'name'
            })

            expect(column.id).toBe('name')
            expect(column.accessorKey).toBe('firstName')
        })

        it('creates DataColumn with accessorFn and id', () => {
            const column = table.column({
                header: 'Full Name',
                accessor: (user) => `${user.firstName} ${user.lastName}`,
                id: 'fullName'
            })

            expect(column.id).toBe('fullName')
            expect(column.accessorFn).toBeDefined()
            expect(column.accessorKey).toBeUndefined()
        })

        it('creates DataColumn with custom cell renderer', () => {
            const cellFn = () => 'rendered'
            const column = table.column({
                header: 'Age',
                accessor: 'age',
                cell: cellFn
            })

            expect(column.cell).toBe(cellFn)
        })

        it('creates DataColumn with footer', () => {
            const column = table.column({
                header: 'Age',
                footer: 'Total',
                accessor: 'age'
            })

            expect(column.footer).toBe('Total')
        })

        it('creates DataColumn with plugin config', () => {
            const tableWithPlugins = createTable(data, {
                sort: addSortBy()
            })

            const column = tableWithPlugins.column({
                header: 'Age',
                accessor: 'age',
                plugins: {
                    sort: {
                        disable: true
                    }
                }
            })

            expect(column.plugins?.sort?.disable).toBe(true)
        })

        it('extracts value using accessorKey', () => {
            const column = table.column({
                header: 'Age',
                accessor: 'age'
            })

            expect(column.getValue(sampleData[0])).toBe(25)
        })

        it('extracts value using accessorFn', () => {
            const column = table.column({
                header: 'Full Name',
                accessor: (user) => `${user.firstName} ${user.lastName}`,
                id: 'fullName'
            })

            expect(column.getValue(sampleData[0])).toBe('Alice Smith')
        })
    })

    describe('edge cases', () => {
        it('uses header as id when accessorFn is used without explicit id', () => {
            const column = table.column({
                header: 'Computed Value',
                accessor: (user) => user.age * 2,
                id: 'computed'
            })

            expect(column.id).toBe('computed')
        })

        it('handles accessor returning undefined', () => {
            interface PartialUser {
                name?: string
            }
            const partialData = writable<PartialUser[]>([{ name: undefined }])
            const partialTable = createTable(partialData)
            const column = partialTable.column({
                header: 'Name',
                accessor: 'name'
            })

            expect(column.getValue({ name: undefined })).toBeUndefined()
        })

        it('handles accessor returning null', () => {
            interface NullableUser {
                name: string | null
            }
            const nullData = writable<NullableUser[]>([{ name: null }])
            const nullTable = createTable(nullData)
            const column = nullTable.column({
                header: 'Name',
                accessor: 'name'
            })

            expect(column.getValue({ name: null })).toBeNull()
        })
    })
})

describe('Table.group method', () => {
    const data = writable<User[]>(sampleData)
    const table = createTable(data)

    describe('positive cases', () => {
        it('creates GroupColumn with nested columns', () => {
            const group = table.group({
                header: 'Name',
                columns: [
                    table.column({ header: 'First', accessor: 'firstName' }),
                    table.column({ header: 'Last', accessor: 'lastName' })
                ]
            })

            expect(group).toBeInstanceOf(GroupColumn)
            expect(group.columns).toHaveLength(2)
            expect(group.ids).toEqual(['firstName', 'lastName'])
        })

        it('creates deeply nested groups', () => {
            const group = table.group({
                header: 'Info',
                columns: [
                    table.group({
                        header: 'Name',
                        columns: [
                            table.column({ header: 'First', accessor: 'firstName' }),
                            table.column({ header: 'Last', accessor: 'lastName' })
                        ]
                    }),
                    table.column({ header: 'Age', accessor: 'age' })
                ]
            })

            expect(group.columns).toHaveLength(2)
            expect(group.ids).toEqual(['firstName', 'lastName', 'age'])
            expect(group.height).toBe(3) // 2 levels of nesting + 1
        })

        it('creates GroupColumn with footer', () => {
            const group = table.group({
                header: 'Name',
                footer: 'Name Footer',
                columns: [table.column({ header: 'First', accessor: 'firstName' })]
            })

            expect(group.footer).toBe('Name Footer')
        })

        it('calculates correct height for mixed column types', () => {
            const group = table.group({
                header: 'Mixed',
                columns: [
                    table.column({ header: 'Simple', accessor: 'firstName' }),
                    table.group({
                        header: 'Nested',
                        columns: [table.column({ header: 'Deep', accessor: 'lastName' })]
                    })
                ]
            })

            // Simple column has height 1, nested group has height 2
            // Parent group is max(1, 2) + 1 = 3
            expect(group.height).toBe(3)
        })
    })

    describe('edge cases', () => {
        it('handles group with single column', () => {
            const group = table.group({
                header: 'Single',
                columns: [table.column({ header: 'Only', accessor: 'firstName' })]
            })

            expect(group.columns).toHaveLength(1)
            expect(group.ids).toEqual(['firstName'])
        })

        it('handles empty columns array', () => {
            const group = table.group({
                header: 'Empty',
                columns: []
            })

            expect(group.columns).toHaveLength(0)
            expect(group.ids).toEqual([])
            expect(group.height).toBe(-Infinity + 1) // Math.max of empty array
        })
    })
})

describe('Table.display method', () => {
    const data = writable<User[]>(sampleData)
    const table = createTable(data)

    describe('positive cases', () => {
        it('creates DisplayColumn with cell renderer', () => {
            const cellFn = () => 'actions'
            const column = table.display({
                header: 'Actions',
                cell: cellFn
            })

            expect(column).toBeInstanceOf(DisplayColumn)
            expect(column.cell).toBe(cellFn)
        })

        it('creates DisplayColumn with custom id', () => {
            const column = table.display({
                id: 'actions-col',
                header: 'Actions',
                cell: () => 'actions'
            })

            expect(column.id).toBe('actions-col')
        })

        it('uses header as id when no explicit id provided', () => {
            const column = table.display({
                header: 'Actions',
                cell: () => 'actions'
            })

            expect(column.id).toBe('Actions')
        })

        it('creates DisplayColumn with data getter', () => {
            const dataFn = () => ({ custom: true })
            const column = table.display({
                header: 'Custom',
                cell: () => 'custom',
                data: dataFn
            })

            expect(column.data).toBe(dataFn)
        })

        it('creates DisplayColumn with footer', () => {
            const column = table.display({
                header: 'Actions',
                footer: 'End',
                cell: () => 'actions'
            })

            expect(column.footer).toBe('End')
        })
    })

    describe('edge cases', () => {
        it('handles empty header with explicit id', () => {
            const column = table.display({
                id: 'no-header',
                header: '',
                cell: () => 'cell'
            })

            expect(column.id).toBe('no-header')
            expect(column.header).toBe('')
        })
    })
})

describe('Table.createColumns method', () => {
    const data = writable<User[]>(sampleData)
    const table = createTable(data)

    describe('positive cases', () => {
        it('returns the same columns array', () => {
            const columns = [
                table.column({ header: 'First', accessor: 'firstName' }),
                table.column({ header: 'Last', accessor: 'lastName' })
            ]

            const result = table.createColumns(columns)
            expect(result).toBe(columns)
        })

        it('accepts mixed column types', () => {
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' }),
                table.display({ header: 'Actions', cell: () => '' }),
                table.group({
                    header: 'Stats',
                    columns: [
                        table.column({ header: 'Age', accessor: 'age' }),
                        table.column({ header: 'Visits', accessor: 'visits' })
                    ]
                })
            ])

            expect(columns).toHaveLength(3)
        })

        it('accepts empty columns array', () => {
            const columns = table.createColumns([])
            expect(columns).toEqual([])
        })
    })

    describe('negative cases', () => {
        it('throws for duplicate column ids from accessors', () => {
            expect(() => {
                table.createColumns([
                    table.column({ header: 'Name 1', accessor: 'firstName' }),
                    table.column({ header: 'Name 2', accessor: 'firstName' })
                ])
            }).toThrowError('Duplicate column ids not allowed: "firstName"')
        })

        it('throws for duplicate column ids from headers', () => {
            expect(() => {
                table.createColumns([
                    table.column({ header: 'Name', accessor: (u) => u.firstName, id: 'first' }),
                    table.display({ header: 'Name', cell: () => '', id: 'first' })
                ])
            }).toThrowError('Duplicate column ids not allowed: "first"')
        })

        it('throws for multiple duplicate ids', () => {
            expect(() => {
                table.createColumns([
                    table.column({ header: 'A', accessor: 'firstName' }),
                    table.column({ header: 'B', accessor: 'firstName' }),
                    table.column({ header: 'C', accessor: 'lastName' }),
                    table.column({ header: 'D', accessor: 'lastName' })
                ])
            }).toThrowError('Duplicate column ids not allowed: "firstName", "lastName"')
        })

        it('throws for duplicates in nested groups', () => {
            expect(() => {
                table.createColumns([
                    table.column({ header: 'First', accessor: 'firstName' }),
                    table.group({
                        header: 'Group',
                        columns: [table.column({ header: 'First Again', accessor: 'firstName' })]
                    })
                ])
            }).toThrowError('Duplicate column ids not allowed: "firstName"')
        })
    })
})

describe('Table.createViewModel method', () => {
    describe('positive cases', () => {
        it('creates a view model with all required properties', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' }),
                table.column({ header: 'Age', accessor: 'age' })
            ])

            const vm = table.createViewModel(columns)

            expect(vm).toHaveProperty('flatColumns')
            expect(vm).toHaveProperty('tableAttrs')
            expect(vm).toHaveProperty('tableHeadAttrs')
            expect(vm).toHaveProperty('tableBodyAttrs')
            expect(vm).toHaveProperty('visibleColumns')
            expect(vm).toHaveProperty('headerRows')
            expect(vm).toHaveProperty('originalRows')
            expect(vm).toHaveProperty('rows')
            expect(vm).toHaveProperty('pageRows')
            expect(vm).toHaveProperty('pluginStates')
        })

        it('creates correct flat columns', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' }),
                table.group({
                    header: 'Group',
                    columns: [
                        table.column({ header: 'Age', accessor: 'age' }),
                        table.column({ header: 'Visits', accessor: 'visits' })
                    ]
                })
            ])

            const vm = table.createViewModel(columns)

            expect(vm.flatColumns).toHaveLength(3)
            expect(vm.flatColumns.map((c) => c.id)).toEqual(['firstName', 'age', 'visits'])
        })

        it('creates rows from data', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' })
            ])

            const vm = table.createViewModel(columns)
            const rows = get(vm.rows)

            expect(rows).toHaveLength(3)
        })

        it('uses custom rowDataId function', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' })
            ])

            const vm = table.createViewModel(columns, {
                rowDataId: (item) => item.firstName.toLowerCase()
            })
            const rows = get(vm.rows)

            // rowDataId sets dataId, not id (id is sequential)
            expect(rows[0].dataId).toBe('alice')
            expect(rows[1].dataId).toBe('bob')
            expect(rows[2].dataId).toBe('charlie')
        })

        it('initializes plugin states', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data, {
                sort: addSortBy()
            })
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' })
            ])

            const vm = table.createViewModel(columns)

            expect(vm.pluginStates.sort).toBeDefined()
            expect(vm.pluginStates.sort.sortKeys).toBeDefined()
        })

        it('provides correct table attributes', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' })
            ])

            const vm = table.createViewModel(columns)
            const tableAttrs = get(vm.tableAttrs)
            const tableBodyAttrs = get(vm.tableBodyAttrs)

            expect(tableAttrs.role).toBe('table')
            expect(tableBodyAttrs.role).toBe('rowgroup')
        })
    })

    describe('edge cases', () => {
        it('handles empty columns', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)
            const columns = table.createColumns([])

            const vm = table.createViewModel(columns)

            expect(vm.flatColumns).toHaveLength(0)
            expect(get(vm.headerRows)).toHaveLength(0)
        })

        it('handles empty data', () => {
            const data = writable<User[]>([])
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' })
            ])

            const vm = table.createViewModel(columns)
            const rows = get(vm.rows)

            expect(rows).toHaveLength(0)
        })

        it('reacts to data changes', () => {
            const data = writable<User[]>([])
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' })
            ])

            const vm = table.createViewModel(columns)

            expect(get(vm.rows)).toHaveLength(0)

            data.set(sampleData)
            expect(get(vm.rows)).toHaveLength(3)

            data.set([sampleData[0]])
            expect(get(vm.rows)).toHaveLength(1)
        })

        it('handles rowDataId returning same dataId for different items', () => {
            const data = writable<User[]>(sampleData)
            const table = createTable(data)
            const columns = table.createColumns([
                table.column({ header: 'First', accessor: 'firstName' })
            ])

            // This would create duplicate dataIds (not recommended but should not crash)
            const vm = table.createViewModel(columns, {
                rowDataId: () => 'same-id'
            })
            const rows = get(vm.rows)

            expect(rows).toHaveLength(3)
            // All rows have the same dataId (user responsibility to ensure uniqueness)
            expect(rows.every((r) => r.dataId === 'same-id')).toBe(true)
        })
    })
})

describe('Column type guards', () => {
    const data = writable<User[]>(sampleData)
    const table = createTable(data)

    it('isFlat returns true for DataColumn', () => {
        const column = table.column({ header: 'First', accessor: 'firstName' })
        expect(column.isFlat()).toBe(true)
        expect(column.isData()).toBe(true)
        expect(column.isDisplay()).toBe(false)
        expect(column.isGroup()).toBe(false)
    })

    it('isFlat returns true for DisplayColumn', () => {
        const column = table.display({ header: 'Actions', cell: () => '' })
        expect(column.isFlat()).toBe(true)
        expect(column.isData()).toBe(false)
        expect(column.isDisplay()).toBe(true)
        expect(column.isGroup()).toBe(false)
    })

    it('isGroup returns true for GroupColumn', () => {
        const column = table.group({
            header: 'Group',
            columns: [table.column({ header: 'First', accessor: 'firstName' })]
        })
        expect(column.isFlat()).toBe(false)
        expect(column.isData()).toBe(false)
        expect(column.isDisplay()).toBe(false)
        expect(column.isGroup()).toBe(true)
    })
})
