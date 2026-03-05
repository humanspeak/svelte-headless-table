import { get, readable } from 'svelte/store'
import { describe, expect, test } from 'vitest'
import { createTable } from '../createTable.js'
import { addResizedColumns } from './addResizedColumns.js'

interface Item {
    name: string
    age: number
    status: string
}

const data = readable<Item[]>([
    { name: 'Alice', age: 25, status: 'active' },
    { name: 'Bob', age: 30, status: 'inactive' }
])

describe('addResizedColumns', () => {
    test('initializes with empty columnWidths', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const widths = get(vm.pluginStates.resize.columnWidths)
        expect(widths).toEqual({})
    })

    test('initialWidth populates columnWidths state', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: { resize: { initialWidth: 200 } }
            })
        ])
        const vm = table.createViewModel(columns)
        const widths = get(vm.pluginStates.resize.columnWidths)
        expect(widths.name).toBe(200)
    })

    test('disabled column reflected in props.disabled', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: { resize: { disable: true } }
            })
        ])
        const vm = table.createViewModel(columns)
        const headerRows = get(vm.headerRows)
        const props = get(headerRows[0].cells[0].props())
        expect(props.resize.disabled).toBe(true)
    })

    test('non-disabled column has disabled=false', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: { resize: { initialWidth: 100 } }
            })
        ])
        const vm = table.createViewModel(columns)
        const headerRows = get(vm.headerRows)
        const props = get(headerRows[0].cells[0].props())
        expect(props.resize.disabled).toBe(false)
    })

    test('thead.tr.th attrs derive width styles from columnWidths', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: { resize: { initialWidth: 150 } }
            })
        ])
        const vm = table.createViewModel(columns)
        const headerRows = get(vm.headerRows)
        const attrs = get(headerRows[0].cells[0].attrs())
        // Style is stringified by finalizeAttributes
        expect((attrs as any).style).toContain('width:150px')
        expect((attrs as any).style).toContain('min-width:150px')
        expect((attrs as any).style).toContain('max-width:150px')
        expect((attrs as any).style).toContain('box-sizing:border-box')
    })

    test('tbody.tr.td attrs derive width styles from columnWidths', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: { resize: { initialWidth: 150 } }
            })
        ])
        const vm = table.createViewModel(columns)
        const rows = get(vm.rows)
        const cellAttrs = get(rows[0].cells[0].attrs())
        expect((cellAttrs as any).style).toContain('width:150px')
        expect((cellAttrs as any).style).toContain('min-width:150px')
    })

    test('undefined width returns empty attrs', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name'
                // No initialWidth, no resize plugin options
            })
        ])
        const vm = table.createViewModel(columns)
        const rows = get(vm.rows)
        const cellAttrs = get(rows[0].cells[0].attrs())
        expect((cellAttrs as any).style).toBeUndefined()
    })

    test('columnWidths store is writable and reactive', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: { resize: { initialWidth: 100 } }
            })
        ])
        const vm = table.createViewModel(columns)

        vm.pluginStates.resize.columnWidths.set({ name: 250 })
        const widths = get(vm.pluginStates.resize.columnWidths)
        expect(widths.name).toBe(250)

        // Verify attrs updated too
        const rows = get(vm.rows)
        const cellAttrs = get(rows[0].cells[0].attrs())
        expect((cellAttrs as any).style).toContain('width:250px')
    })

    test('multiple columns with different initialWidths', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: { resize: { initialWidth: 100 } }
            }),
            table.column({
                accessor: 'age',
                header: 'Age',
                plugins: { resize: { initialWidth: 75 } }
            }),
            table.column({
                accessor: 'status',
                header: 'Status',
                plugins: { resize: { initialWidth: 200 } }
            })
        ])
        const vm = table.createViewModel(columns)
        const widths = get(vm.pluginStates.resize.columnWidths)
        expect(widths).toEqual({ name: 100, age: 75, status: 200 })
    })

    test('onResizeEnd callback provided in config does not error', () => {
        expect(() => {
            const table = createTable(data, {
                resize: addResizedColumns({ onResizeEnd: () => {} })
            })
            const columns = table.createColumns([
                table.column({
                    accessor: 'name',
                    header: 'Name',
                    plugins: { resize: { initialWidth: 100 } }
                })
            ])
            table.createViewModel(columns)
        }).not.toThrow()
    })
})
