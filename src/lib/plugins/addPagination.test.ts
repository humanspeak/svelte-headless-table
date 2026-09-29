import { createTable } from '../createTable.js'
import { box } from '../reactivity.svelte.js'
import { addPagination } from './addPagination.svelte.js'

interface Item {
    id: number
    name: string
}

function createItems(count: number): Item[] {
    return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))
}

test('default config: pageSize=10, pageIndex=0', () => {
    const data = createItems(25)
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const { pageSize, pageIndex } = vm.pluginStates.page
    expect(pageSize.current).toBe(10)
    expect(pageIndex.current).toBe(0)
})

test('custom initialPageSize and initialPageIndex', () => {
    const data = createItems(50)
    const table = createTable(data, {
        page: addPagination({ initialPageSize: 20, initialPageIndex: 2 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const { pageSize, pageIndex } = vm.pluginStates.page
    expect(pageSize.current).toBe(20)
    expect(pageIndex.current).toBe(2)
})

test('pageCount derived correctly (25 items / 10 = 3 pages)', () => {
    const data = createItems(25)
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    // Trigger derivation
    expect(vm.current.pageRows).toBeDefined()
    expect(vm.pluginStates.page.pageCount.current).toBe(3)
})

test('hasPreviousPage false at index 0, true at index 1', () => {
    const data = createItems(25)
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.current.pageRows).toBeDefined()
    const { hasPreviousPage, pageIndex } = vm.pluginStates.page
    expect(hasPreviousPage.current).toBe(false)

    pageIndex.current = 1
    expect(hasPreviousPage.current).toBe(true)
})

test('hasNextPage true when not on last page, false on last', () => {
    const data = createItems(25)
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.current.pageRows).toBeDefined()
    const { hasNextPage, pageIndex } = vm.pluginStates.page
    expect(hasNextPage.current).toBe(true)

    pageIndex.current = 2 // last page
    expect(vm.current.pageRows).toBeDefined()
    expect(hasNextPage.current).toBe(false)
})

test('pageIndex clamped when exceeds pageCount', () => {
    const data = createItems(25)
    const table = createTable(data, {
        page: addPagination({ initialPageIndex: 10 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.current.pageRows).toBeDefined()
    // pageCount derivation triggers clamping; read pageCount to ensure derivation
    expect(vm.pluginStates.page.pageCount.current).toBeDefined()
    // pageCount is 3, so index 10 should be clamped to 2
    expect(vm.pluginStates.page.pageIndex.current).toBe(2)
})

test('MIN_PAGE_SIZE enforcement (set to 0 stays 1)', () => {
    const data = createItems(10)
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    vm.pluginStates.page.pageSize.current = 0
    expect(vm.pluginStates.page.pageSize.current).toBe(1)
})

test('derivePageRows slices correct rows for page 0', () => {
    const data = createItems(25)
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.pageRows
    expect(rows).toHaveLength(10)
    const ids = rows.map((r) => r.isData() && r.original.id)
    expect(ids).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})

test('derivePageRows slices correct rows for page 1', () => {
    const data = createItems(25)
    const table = createTable(data, {
        page: addPagination({ initialPageIndex: 1 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.pageRows
    expect(rows).toHaveLength(10)
    const ids = rows.map((r) => r.isData() && r.original.id)
    expect(ids).toStrictEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
})

test('last page has fewer rows when not evenly divisible', () => {
    const data = createItems(25)
    const table = createTable(data, {
        page: addPagination({ initialPageIndex: 2 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.pageRows
    expect(rows).toHaveLength(5)
    const ids = rows.map((r) => r.isData() && r.original.id)
    expect(ids).toStrictEqual([21, 22, 23, 24, 25])
})

test('serverSide mode returns all rows', () => {
    const data = createItems(25)
    const table = createTable(data, {
        page: addPagination({
            serverSide: true,
            serverItemCount: 100
        })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.pageRows
    expect(rows).toHaveLength(25)
})

test('serverSide pageCount uses serverItemCount', () => {
    const data = createItems(25)
    const table = createTable(data, {
        page: addPagination({
            serverSide: true,
            serverItemCount: () => 100,
            initialPageSize: 10
        })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.current.pageRows).toBeDefined()
    expect(vm.pluginStates.page.pageCount.current).toBe(10)
})

test('pageCount updates when pageSize changes', () => {
    const data = createItems(20)
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.current.pageRows).toBeDefined()
    expect(vm.pluginStates.page.pageCount.current).toBe(2) // 20/10

    vm.pluginStates.page.pageSize.current = 5
    expect(vm.current.pageRows).toBeDefined()
    expect(vm.pluginStates.page.pageCount.current).toBe(4) // 20/5
})

test('pageIndex clamped on pageSize increase', () => {
    const data = createItems(20)
    const table = createTable(data, {
        page: addPagination({ initialPageSize: 5, initialPageIndex: 3 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.current.pageRows).toBeDefined()
    // 20/5 = 4 pages, index 3 is valid
    expect(vm.pluginStates.page.pageIndex.current).toBe(3)

    // Change to pageSize=20, only 1 page, index should clamp to 0
    vm.pluginStates.page.pageSize.current = 20
    expect(vm.current.pageRows).toBeDefined()
    expect(vm.pluginStates.page.pageCount.current).toBeDefined()
    expect(vm.pluginStates.page.pageIndex.current).toBe(0)
})

test('pageIndex survives a rebuild when reuseKey is unchanged', () => {
    const data = createItems(50)
    const table = createTable(data, { page: addPagination() })
    const makeColumns = () =>
        table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const first = table.createViewModel(makeColumns(), { reuseKey: 'cols' })
    first.pluginStates.page.pageIndex.current = 3

    const second = table.createViewModel(makeColumns(), { reuseKey: 'cols' })

    expect(second.pluginStates.page.pageIndex.current).toBe(3)
})

test('pageIndex resets on a rebuild without reuseKey', () => {
    const data = createItems(50)
    const table = createTable(data, { page: addPagination() })
    const makeColumns = () =>
        table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const first = table.createViewModel(makeColumns())
    first.pluginStates.page.pageIndex.current = 3

    const second = table.createViewModel(makeColumns())

    expect(second.pluginStates.page.pageIndex.current).toBe(0)
})

test('a different reuseKey rebuilds', () => {
    const data = createItems(50)
    const table = createTable(data, { page: addPagination() })
    const makeColumns = () =>
        table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const first = table.createViewModel(makeColumns(), { reuseKey: 'cols' })
    first.pluginStates.page.pageIndex.current = 3

    const second = table.createViewModel(makeColumns(), { reuseKey: 'other' })

    expect(second.pluginStates.page.pageIndex.current).toBe(0)
})

test('serverItemCount getter is reactive', () => {
    const total = box(100)
    const table = createTable(createItems(25), {
        page: addPagination({ serverSide: true, serverItemCount: () => total.current })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    expect(vm.pluginStates.page.pageCount.current).toBe(10)
    total.current = 35
    expect(vm.pluginStates.page.pageCount.current).toBe(4)
})

test('serverItemCount rejects a Svelte store', () => {
    const store = { subscribe: () => () => {} }
    const table = createTable(createItems(25), {
        page: addPagination({
            serverSide: true,
            serverItemCount: store as unknown as number
        })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    expect(() => table.createViewModel(columns)).toThrow(/Svelte stores are not accepted in v7/)
})

test('pageIndex keeps the written value and clamps on read', () => {
    const data = box(createItems(25))
    const table = createTable(() => data.current, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    vm.pluginStates.page.pageIndex.current = 2
    data.current = createItems(5)
    expect(vm.pluginStates.page.pageIndex.current).toBe(0)
    expect(vm.current.pageRows).toHaveLength(5)
})
