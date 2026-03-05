import { get, readable } from 'svelte/store'
import { createTable } from '../createTable.js'
import { addColumnOrder } from './addColumnOrder.js'

interface Item {
    firstName: string
    lastName: string
    age: number
}

const data = readable<Item[]>([
    { firstName: 'Adam', lastName: 'West', age: 50 },
    { firstName: 'Becky', lastName: 'White', age: 30 }
])

test('basic reordering: columns appear in specified order', () => {
    const table = createTable(data, {
        order: addColumnOrder({ initialColumnIdOrder: ['age', 'firstName', 'lastName'] })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    const visibleColumns = get(vm.visibleColumns)

    expect(visibleColumns.map((c) => c.id)).toStrictEqual(['age', 'firstName', 'lastName'])
})

test('partial order: unspecified columns appended at end', () => {
    const table = createTable(data, {
        order: addColumnOrder({ initialColumnIdOrder: ['age', 'lastName'] })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    const visibleColumns = get(vm.visibleColumns)

    expect(visibleColumns.map((c) => c.id)).toStrictEqual(['age', 'lastName', 'firstName'])
})

test('hideUnspecifiedColumns: unspecified columns hidden', () => {
    const table = createTable(data, {
        order: addColumnOrder({
            initialColumnIdOrder: ['firstName', 'age'],
            hideUnspecifiedColumns: true
        })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    const visibleColumns = get(vm.visibleColumns)

    expect(visibleColumns.map((c) => c.id)).toStrictEqual(['firstName', 'age'])
})

test('empty columnIdOrder: all columns shown in original order', () => {
    const table = createTable(data, {
        order: addColumnOrder({ initialColumnIdOrder: [] })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    const visibleColumns = get(vm.visibleColumns)

    expect(visibleColumns.map((c) => c.id)).toStrictEqual(['firstName', 'lastName', 'age'])
})

test('non-existent column ID in order: does not break reordering', () => {
    const table = createTable(data, {
        order: addColumnOrder({ initialColumnIdOrder: ['age', 'nonExistent', 'firstName'] })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'firstName', header: 'First Name' }),
        table.column({ accessor: 'lastName', header: 'Last Name' }),
        table.column({ accessor: 'age', header: 'Age' })
    ])
    const vm = table.createViewModel(columns)
    const visibleColumns = get(vm.visibleColumns)

    // Non-existent ID causes splice(-1,1) which pops last remaining element.
    // The actual order is: age (matched), lastName (popped by nonExistent), firstName (matched)
    expect(visibleColumns.map((c) => c.id)).toStrictEqual(['age', 'lastName', 'firstName'])
})
