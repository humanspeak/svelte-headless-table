import { createTable } from '../createTable.js'
import { addSortBy, createSortKeys } from './addSortBy.svelte.js'
import { addSubRows } from './addSubRows.svelte.js'

const data = [
    { id: 1, createdAt: new Date(2023, 1, 1), name: { first: 'Ariana', last: 'Grande' } },
    { id: 2, createdAt: new Date(1990, 1, 1), name: { first: 'Harry', last: 'Styles' } },
    { id: 3, createdAt: null, name: { first: 'Doja', last: 'Cat' } },
    { id: 4, createdAt: new Date(2010, 1, 1), name: { first: 'Sam', last: 'Smith' } }
]

test('compare fn sort', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'name', order: 'asc' }] })
    })
    const columns = table.createColumns([
        table.column({
            accessor: 'name',
            header: 'Name',
            plugins: {
                sort: {
                    compareFn(a, b) {
                        return a.first < b.first ? -1 : 1
                    }
                }
            }
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const rowIds = rows.map((it) => it.isData() && it.original.id)
    expect(rowIds).toStrictEqual([1, 3, 2, 4])
})

test('ascending date sort', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'createdAt', order: 'asc' }] })
    })
    const columns = table.createColumns([
        table.column({
            accessor: 'createdAt',
            header: 'Created At'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const rowIds = rows.map((it) => it.isData() && it.original.id)
    expect(rowIds).toStrictEqual([3, 2, 4, 1])
})

test('descending date sort', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'createdAt', order: 'desc' }] })
    })
    const columns = table.createColumns([
        table.column({
            accessor: 'createdAt',
            header: 'Created At'
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const rowIds = rows.map((it) => it.isData() && it.original.id)
    expect(rowIds).toStrictEqual([1, 4, 2, 3])
})

test('no initial sort keys: rows in original order', () => {
    const table = createTable(data, {
        sort: addSortBy()
    })
    const columns = table.createColumns([table.column({ accessor: 'id', header: 'ID' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const rowIds = rows.map((it) => it.isData() && it.original.id)
    expect(rowIds).toStrictEqual([1, 2, 3, 4])
})

test('empty data: no rows returned', () => {
    const emptyData: {
        id: number
        createdAt: Date | null
        name: { first: string; last: string }
    }[] = []
    const table = createTable(emptyData, {
        sort: addSortBy({ initialSortKeys: [{ id: 'id', order: 'asc' }] })
    })
    const columns = table.createColumns([table.column({ accessor: 'id', header: 'ID' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    expect(rows).toHaveLength(0)
})

test('toggle sort direction via sortKeys state', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'id', order: 'asc' }] })
    })
    const columns = table.createColumns([table.column({ accessor: 'id', header: 'ID' })])
    const vm = table.createViewModel(columns)

    // Initially ascending
    let rows = vm.current.rows
    let rowIds = rows.map((it) => it.isData() && it.original.id)
    expect(rowIds).toStrictEqual([1, 2, 3, 4])

    // Change to descending
    const { sortKeys } = vm.pluginStates.sort
    sortKeys.current = [{ id: 'id', order: 'desc' }]

    rows = vm.current.rows
    rowIds = rows.map((it) => it.isData() && it.original.id)
    expect(rowIds).toStrictEqual([4, 3, 2, 1])
})

test('multi-column sort: secondary sort breaks ties', () => {
    const tieData = [
        { id: 1, group: 'A', value: 2 },
        { id: 2, group: 'B', value: 1 },
        { id: 3, group: 'A', value: 1 },
        { id: 4, group: 'B', value: 2 }
    ]
    const table = createTable(tieData, {
        sort: addSortBy({
            initialSortKeys: [
                { id: 'group', order: 'asc' },
                { id: 'value', order: 'asc' }
            ]
        })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'group', header: 'Group' }),
        table.column({ accessor: 'value', header: 'Value' })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const rowIds = rows.map((it) => it.isData() && it.original.id)
    expect(rowIds).toStrictEqual([3, 1, 2, 4])
})

test('getSortValue extracts sortable value', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'name', order: 'asc' }] })
    })
    const columns = table.createColumns([
        table.column({
            accessor: 'name',
            header: 'Name',
            plugins: {
                sort: {
                    getSortValue: (val: { first: string; last: string }) => val.last
                }
            }
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const lastNames = rows.map((it) => it.isData() && it.original.name.last)
    // Cat, Grande, Smith, Styles (alphabetical by last name)
    expect(lastNames).toStrictEqual(['Cat', 'Grande', 'Smith', 'Styles'])
})

test('custom toggleOrder cycles through states', () => {
    const sortKeys = createSortKeys([])
    sortKeys.toggleId('col', { toggleOrder: ['desc', 'asc', undefined] })
    expect(sortKeys.current).toStrictEqual([{ id: 'col', order: 'desc' }])

    sortKeys.toggleId('col', { toggleOrder: ['desc', 'asc', undefined] })
    expect(sortKeys.current).toStrictEqual([{ id: 'col', order: 'asc' }])

    sortKeys.toggleId('col', { toggleOrder: ['desc', 'asc', undefined] })
    expect(sortKeys.current).toStrictEqual([])
})

test('disableMultiSort: only one column active at a time', () => {
    const sortKeys = createSortKeys([{ id: 'a', order: 'asc' }])
    sortKeys.toggleId('b', { multiSort: false })
    expect(sortKeys.current).toStrictEqual([{ id: 'b', order: 'asc' }])
})

test('invert: true reverses sort direction', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'id', order: 'asc' }] })
    })
    const columns = table.createColumns([
        table.column({
            accessor: 'id',
            header: 'ID',
            plugins: { sort: { invert: true } }
        })
    ])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const rowIds = rows.map((it) => it.isData() && it.original.id)
    // asc + invert = descending
    expect(rowIds).toStrictEqual([4, 3, 2, 1])
})

test('serverSide returns rows in original order', () => {
    const table = createTable(data, {
        sort: addSortBy({
            initialSortKeys: [{ id: 'id', order: 'desc' }],
            serverSide: true
        })
    })
    const columns = table.createColumns([table.column({ accessor: 'id', header: 'ID' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const rowIds = rows.map((it) => it.isData() && it.original.id)
    expect(rowIds).toStrictEqual([1, 2, 3, 4])
})

test('disabled column cannot be sorted', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'id', order: 'desc' }] })
    })
    const columns = table.createColumns([
        table.column({
            accessor: 'id',
            header: 'ID',
            plugins: { sort: { disable: true } }
        })
    ])
    const vm = table.createViewModel(columns)
    const headerRows = vm.current.headerRows
    const props = headerRows[0].cells[0].current.props
    expect(props.sort.disabled).toBe(true)
})

test('clearId removes sort key', () => {
    const sortKeys = createSortKeys([
        { id: 'a', order: 'asc' },
        { id: 'b', order: 'desc' }
    ])
    sortKeys.clearId('a')
    expect(sortKeys.current).toStrictEqual([{ id: 'b', order: 'desc' }])
})

test('clearId on non-existent id is a no-op', () => {
    const sortKeys = createSortKeys([{ id: 'a', order: 'asc' }])
    sortKeys.clearId('nonexistent')
    expect(sortKeys.current).toStrictEqual([{ id: 'a', order: 'asc' }])
})

test('subRow sorting: children sorted recursively', () => {
    interface TreeItem {
        id: number
        name: string
        children?: TreeItem[]
    }
    const treeData: TreeItem[] = [
        {
            id: 1,
            name: 'Parent',
            children: [
                { id: 3, name: 'Charlie' },
                { id: 2, name: 'Alice' }
            ]
        }
    ]
    const table = createTable(treeData, {
        sub: addSubRows({ children: 'children' }),
        sort: addSortBy({ initialSortKeys: [{ id: 'name', order: 'asc' }] })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    expect(rows[0].subRows).toBeDefined()
    const subNames = rows[0].subRows!.map((r) => r.isData() && r.original.name)
    expect(subNames).toStrictEqual(['Alice', 'Charlie'])
})

test('preSortedRows contains original order', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'id', order: 'desc' }] })
    })
    const columns = table.createColumns([table.column({ accessor: 'id', header: 'ID' })])
    const vm = table.createViewModel(columns)
    // Trigger derivation
    expect(vm.current.rows).toBeDefined()
    const preSorted = vm.pluginStates.sort.preSortedRows.current
    const ids = preSorted.map((r) => r.isData() && r.original.id)
    expect(ids).toStrictEqual([1, 2, 3, 4])
})

test('createSortKeys toggleId with multiSort=false', () => {
    const sortKeys = createSortKeys([])
    // First toggle: undefined → asc
    sortKeys.toggleId('col', { multiSort: false })
    expect(sortKeys.current).toStrictEqual([{ id: 'col', order: 'asc' }])
    // Second toggle: asc → desc
    sortKeys.toggleId('col', { multiSort: false })
    expect(sortKeys.current).toStrictEqual([{ id: 'col', order: 'desc' }])
    // Third toggle: desc → undefined (cleared)
    sortKeys.toggleId('col', { multiSort: false })
    expect(sortKeys.current).toStrictEqual([])
})

test('tbody.tr.td props contain sort order', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'id', order: 'asc' }] })
    })
    const columns = table.createColumns([table.column({ accessor: 'id', header: 'ID' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const cellProps = rows[0].cells[0].current.props
    expect(cellProps.sort.order).toBe('asc')
})

test('thead.tr.th toggle and clear functions exist', () => {
    const table = createTable(data, {
        sort: addSortBy({ initialSortKeys: [{ id: 'id', order: 'asc' }] })
    })
    const columns = table.createColumns([table.column({ accessor: 'id', header: 'ID' })])
    const vm = table.createViewModel(columns)
    const headerRows = vm.current.headerRows
    const props = headerRows[0].cells[0].current.props
    expect(typeof props.sort.toggle).toBe('function')
    expect(typeof props.sort.clear).toBe('function')
    expect(props.sort.order).toBe('asc')

    // Call clear to remove sort
    props.sort.clear()
    const updatedProps = headerRows[0].cells[0].current.props
    expect(updatedProps.sort.order).toBeUndefined()
})

test('string and number default sorting', () => {
    const numData = [
        { id: 1, value: 30 },
        { id: 2, value: 10 },
        { id: 3, value: 20 }
    ]
    const table = createTable(numData, {
        sort: addSortBy({ initialSortKeys: [{ id: 'value', order: 'asc' }] })
    })
    const columns = table.createColumns([table.column({ accessor: 'value', header: 'Value' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const values = rows.map((it) => it.isData() && it.original.value)
    expect(values).toStrictEqual([10, 20, 30])
})

test('sort keys survive a rebuild when reuseKey is unchanged', () => {
    const table = createTable(data, { sort: addSortBy() })
    const makeColumns = () =>
        table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const first = table.createViewModel(makeColumns(), { reuseKey: 'cols' })
    first.pluginStates.sort.sortKeys.current = [{ id: 'name', order: 'desc' }]
    const second = table.createViewModel(makeColumns(), { reuseKey: 'cols' })

    expect(second.pluginStates.sort.sortKeys.current).toStrictEqual([{ id: 'name', order: 'desc' }])
})
