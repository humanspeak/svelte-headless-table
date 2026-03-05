import { get, readable } from 'svelte/store'
import { createTable } from '../createTable.js'
import { addPagination } from './addPagination.js'

interface Item {
    id: number
    name: string
}

function createItems(count: number): Item[] {
    return Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }))
}

test('default config: pageSize=10, pageIndex=0', () => {
    const data = readable(createItems(25))
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const { pageSize, pageIndex } = vm.pluginStates.page
    expect(get(pageSize)).toBe(10)
    expect(get(pageIndex)).toBe(0)
})

test('custom initialPageSize and initialPageIndex', () => {
    const data = readable(createItems(50))
    const table = createTable(data, {
        page: addPagination({ initialPageSize: 20, initialPageIndex: 2 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const { pageSize, pageIndex } = vm.pluginStates.page
    expect(get(pageSize)).toBe(20)
    expect(get(pageIndex)).toBe(2)
})

test('pageCount derived correctly (25 items / 10 = 3 pages)', () => {
    const data = readable(createItems(25))
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    // Trigger derivation
    get(vm.pageRows)
    expect(get(vm.pluginStates.page.pageCount)).toBe(3)
})

test('hasPreviousPage false at index 0, true at index 1', () => {
    const data = readable(createItems(25))
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    get(vm.pageRows)
    const { hasPreviousPage, pageIndex } = vm.pluginStates.page
    expect(get(hasPreviousPage)).toBe(false)

    pageIndex.set(1)
    expect(get(hasPreviousPage)).toBe(true)
})

test('hasNextPage true when not on last page, false on last', () => {
    const data = readable(createItems(25))
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    get(vm.pageRows)
    const { hasNextPage, pageIndex } = vm.pluginStates.page
    expect(get(hasNextPage)).toBe(true)

    pageIndex.set(2) // last page
    get(vm.pageRows)
    expect(get(hasNextPage)).toBe(false)
})

test('pageIndex clamped when exceeds pageCount', () => {
    const data = readable(createItems(25))
    const table = createTable(data, {
        page: addPagination({ initialPageIndex: 10 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    get(vm.pageRows)
    // pageCount derivation triggers clamping; read pageCount to ensure derivation
    get(vm.pluginStates.page.pageCount)
    // pageCount is 3, so index 10 should be clamped to 2
    expect(get(vm.pluginStates.page.pageIndex)).toBe(2)
})

test('MIN_PAGE_SIZE enforcement (set to 0 stays 1)', () => {
    const data = readable(createItems(10))
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    vm.pluginStates.page.pageSize.set(0)
    expect(get(vm.pluginStates.page.pageSize)).toBe(1)
})

test('derivePageRows slices correct rows for page 0', () => {
    const data = readable(createItems(25))
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = get(vm.pageRows)
    expect(rows).toHaveLength(10)
    const ids = rows.map((r) => r.isData() && r.original.id)
    expect(ids).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})

test('derivePageRows slices correct rows for page 1', () => {
    const data = readable(createItems(25))
    const table = createTable(data, {
        page: addPagination({ initialPageIndex: 1 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = get(vm.pageRows)
    expect(rows).toHaveLength(10)
    const ids = rows.map((r) => r.isData() && r.original.id)
    expect(ids).toStrictEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
})

test('last page has fewer rows when not evenly divisible', () => {
    const data = readable(createItems(25))
    const table = createTable(data, {
        page: addPagination({ initialPageIndex: 2 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = get(vm.pageRows)
    expect(rows).toHaveLength(5)
    const ids = rows.map((r) => r.isData() && r.original.id)
    expect(ids).toStrictEqual([21, 22, 23, 24, 25])
})

test('serverSide mode returns all rows', () => {
    const data = readable(createItems(25))
    const table = createTable(data, {
        page: addPagination({
            serverSide: true,
            serverItemCount: readable(100)
        })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const rows = get(vm.pageRows)
    expect(rows).toHaveLength(25)
})

test('serverSide pageCount uses serverItemCount', () => {
    const data = readable(createItems(25))
    const table = createTable(data, {
        page: addPagination({
            serverSide: true,
            serverItemCount: readable(100),
            initialPageSize: 10
        })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    get(vm.pageRows)
    expect(get(vm.pluginStates.page.pageCount)).toBe(10)
})

test('pageCount updates when pageSize changes', () => {
    const data = readable(createItems(20))
    const table = createTable(data, { page: addPagination() })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    get(vm.pageRows)
    expect(get(vm.pluginStates.page.pageCount)).toBe(2) // 20/10

    vm.pluginStates.page.pageSize.set(5)
    get(vm.pageRows)
    expect(get(vm.pluginStates.page.pageCount)).toBe(4) // 20/5
})

test('pageIndex clamped on pageSize increase', () => {
    const data = readable(createItems(20))
    const table = createTable(data, {
        page: addPagination({ initialPageSize: 5, initialPageIndex: 3 })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    get(vm.pageRows)
    // 20/5 = 4 pages, index 3 is valid
    expect(get(vm.pluginStates.page.pageIndex)).toBe(3)

    // Change to pageSize=20, only 1 page, index should clamp to 0
    vm.pluginStates.page.pageSize.set(20)
    get(vm.pageRows)
    get(vm.pluginStates.page.pageCount)
    expect(get(vm.pluginStates.page.pageIndex)).toBe(0)
})
