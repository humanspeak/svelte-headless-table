import { createTable } from '../createTable.js'
import { addGridLayout } from './addGridLayout.svelte.js'
import { addHiddenColumns } from './addHiddenColumns.svelte.js'

interface Item {
    a: string
    b: string
    c: string
}

const data: Item[] = [
    { a: '1', b: '2', c: '3' },
    { a: '4', b: '5', c: '6' }
]

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
    expect(vm.current.visibleColumns).toBeDefined()
    const attrs = vm.current.tableAttrs
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
    expect(vm.current.visibleColumns).toBeDefined()
    const attrs = vm.current.tableAttrs
    expect((attrs as any).style).toContain('grid-template-columns:repeat(2, auto)')
})

test('deriveTableHeadAttrs sets display:contents', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([table.column({ accessor: 'a', header: 'A' })])
    const vm = table.createViewModel(columns)
    const attrs = vm.current.tableHeadAttrs
    expect((attrs as any).style).toContain('display:contents')
})

test('deriveTableBodyAttrs sets display:contents', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([table.column({ accessor: 'a', header: 'A' })])
    const vm = table.createViewModel(columns)
    const attrs = vm.current.tableBodyAttrs
    expect((attrs as any).style).toContain('display:contents')
})

test('thead.tr hook sets display:contents', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([table.column({ accessor: 'a', header: 'A' })])
    const vm = table.createViewModel(columns)
    const headerRows = vm.current.headerRows
    const rowAttrs = headerRows[0].current.attrs
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
    const headerRows = vm.current.headerRows
    const cells = headerRows[0].cells
    const attrs0 = cells[0].current.attrs
    expect((attrs0 as any).style).toContain('grid-column:1 / span 1')
    const attrs1 = cells[1].current.attrs
    expect((attrs1 as any).style).toContain('grid-column:2 / span 1')
    const attrs2 = cells[2].current.attrs
    expect((attrs2 as any).style).toContain('grid-column:3 / span 1')
})

test('tbody.tr hook sets display:contents', () => {
    const table = createTable(data, {
        grid: addGridLayout()
    })
    const columns = table.createColumns([table.column({ accessor: 'a', header: 'A' })])
    const vm = table.createViewModel(columns)
    const rows = vm.current.rows
    const rowAttrs = rows[0].current.attrs
    expect((rowAttrs as any).style).toContain('display:contents')
})
