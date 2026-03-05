import { get, readable } from 'svelte/store'
import { createTable } from '../createTable.js'
import { addGridLayout } from './addGridLayout.js'
import { addHiddenColumns } from './addHiddenColumns.js'

interface Item {
    a: string
    b: string
    c: string
}

const data = readable<Item[]>([
    { a: '1', b: '2', c: '3' },
    { a: '4', b: '5', c: '6' }
])

test('deriveTableAttrs sets display:grid and grid-template-columns', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'a', header: 'A' }),
        table.column({ accessor: 'b', header: 'B' }),
        table.column({ accessor: 'c', header: 'C' })
    ])
    const vm = table.createViewModel(columns)
    // Trigger column derivation
    get(vm.visibleColumns)
    const attrs = get(vm.tableAttrs)
    expect((attrs as any).style).toContain('display:grid')
    expect((attrs as any).style).toContain('grid-template-columns:repeat(3, auto)')
})

test('grid-template-columns updates when visible columns change', () => {
    const table = createTable(data, {
        grid: addGridLayout(),
        hide: addHiddenColumns({ initialHiddenColumnIds: ['c'] })
    })
    const columns = table.createColumns([
        table.column({ accessor: 'a', header: 'A' }),
        table.column({ accessor: 'b', header: 'B' }),
        table.column({ accessor: 'c', header: 'C' })
    ])
    const vm = table.createViewModel(columns)
    get(vm.visibleColumns)
    const attrs = get(vm.tableAttrs)
    expect((attrs as any).style).toContain('grid-template-columns:repeat(2, auto)')
})

test('deriveTableHeadAttrs sets display:contents', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([table.column({ accessor: 'a', header: 'A' })])
    const vm = table.createViewModel(columns)
    const attrs = get(vm.tableHeadAttrs)
    expect((attrs as any).style).toContain('display:contents')
})

test('deriveTableBodyAttrs sets display:contents', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([table.column({ accessor: 'a', header: 'A' })])
    const vm = table.createViewModel(columns)
    const attrs = get(vm.tableBodyAttrs)
    expect((attrs as any).style).toContain('display:contents')
})

test('thead.tr hook sets display:contents', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([table.column({ accessor: 'a', header: 'A' })])
    const vm = table.createViewModel(columns)
    const headerRows = get(vm.headerRows)
    const rowAttrs = get(headerRows[0].attrs())
    expect((rowAttrs as any).style).toContain('display:contents')
})

test('thead.tr.th hook sets grid-column based on colstart and colspan', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([
        table.column({ accessor: 'a', header: 'A' }),
        table.column({ accessor: 'b', header: 'B' }),
        table.column({ accessor: 'c', header: 'C' })
    ])
    const vm = table.createViewModel(columns)
    const headerRows = get(vm.headerRows)
    const cells = headerRows[0].cells
    const attrs0 = get(cells[0].attrs())
    expect((attrs0 as any).style).toContain('grid-column:1 / span 1')
    const attrs1 = get(cells[1].attrs())
    expect((attrs1 as any).style).toContain('grid-column:2 / span 1')
    const attrs2 = get(cells[2].attrs())
    expect((attrs2 as any).style).toContain('grid-column:3 / span 1')
})

test('tbody.tr hook sets display:contents', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([table.column({ accessor: 'a', header: 'A' })])
    const vm = table.createViewModel(columns)
    const rows = get(vm.rows)
    const rowAttrs = get(rows[0].attrs())
    expect((rowAttrs as any).style).toContain('display:contents')
})
