import { flushSync } from 'svelte'
import { describe, expect, test } from 'vitest'
import { createTable } from '../createTable.js'
import { withEffectRoot } from '../test/effectRoot.test.svelte.js'
import { addResizedColumns } from './addResizedColumns.svelte.js'

/** The actions are typed `void` for `use:`; at runtime they return `{ destroy }`. */
const asAction = (action: (_node: Element) => void) =>
    action as unknown as (_node: Element) => { destroy: () => void }

interface Item {
    name: string
    age: number
    status: string
}

const data: Item[] = [
    { name: 'Alice', age: 25, status: 'active' },
    { name: 'Bob', age: 30, status: 'inactive' }
]

describe('addResizedColumns', () => {
    test('initializes with empty columnWidths', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const widths = vm.pluginStates.resize.columnWidths.current
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
        const widths = vm.pluginStates.resize.columnWidths.current
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
        const headerRows = vm.current.headerRows
        const props = headerRows[0].cells[0].current.props
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
        const headerRows = vm.current.headerRows
        const props = headerRows[0].cells[0].current.props
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
        const headerRows = vm.current.headerRows
        const attrs = headerRows[0].cells[0].current.attrs
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
        const rows = vm.current.rows
        const cellAttrs = rows[0].cells[0].current.attrs
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
        const rows = vm.current.rows
        const cellAttrs = rows[0].cells[0].current.attrs
        expect((cellAttrs as any).style).toBeUndefined()
    })

    test('columnWidths is writable and reactive', () => {
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

        vm.pluginStates.resize.columnWidths.current = { name: 250 }
        const widths = vm.pluginStates.resize.columnWidths.current
        expect(widths.name).toBe(250)

        // Verify attrs updated too
        const rows = vm.current.rows
        const cellAttrs = rows[0].cells[0].current.attrs
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
        const widths = vm.pluginStates.resize.columnWidths.current
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

    test('reset action removes its dblclick listener on destroy', () => {
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
        const headerCell = vm.current.headerRows[0].cells[0]
        const { resize } = headerCell.current.props
        const th = document.createElement('th')
        const handle = document.createElement('div')
        th.appendChild(handle)
        // Register the header node (measures 0 under jsdom), then set a width to reset from.
        const register = asAction(resize)(th)
        const reset = asAction(resize.reset)(handle)
        vm.pluginStates.resize.columnWidths.current = { name: 300 }

        handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        expect(vm.pluginStates.resize.columnWidths.current.name).toBe(100)

        vm.pluginStates.resize.columnWidths.current = { name: 300 }
        reset.destroy()
        handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        expect(vm.pluginStates.resize.columnWidths.current.name).toBe(300)
        register.destroy()
    })

    test('drag action resizes the column from the drag start width', () => {
        const table = createTable(data, {
            resize: addResizedColumns()
        })
        const columns = table.createColumns([
            table.column({
                accessor: 'name',
                header: 'Name',
                plugins: { resize: { initialWidth: 100, minWidth: 50, maxWidth: 180 } }
            })
        ])
        const vm = table.createViewModel(columns)
        const { resize } = vm.current.headerRows[0].cells[0].current.props
        const handle = document.createElement('div')
        const drag = asAction(resize.drag)(handle)

        handle.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, bubbles: true }))
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 40 }))
        expect(vm.pluginStates.resize.columnWidths.current.name).toBe(130)
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }))
        expect(vm.pluginStates.resize.columnWidths.current.name).toBe(180)
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: -500 }))
        expect(vm.pluginStates.resize.columnWidths.current.name).toBe(50)
        window.dispatchEvent(new MouseEvent('mouseup'))
        // The listeners are gone after mouseup.
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: 40 }))
        expect(vm.pluginStates.resize.columnWidths.current.name).toBe(50)
        drag.destroy()
    })

    test('th and td attrs re-run in an effect when columnWidths changes', () => {
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
        const styles: unknown[] = []
        const stop = withEffectRoot(() => {
            const th = vm.current.headerRows[0].cells[0]
            const td = vm.current.rows[0].cells[0]
            const thAttrs: Record<string, unknown> = th.current.attrs
            const tdAttrs: Record<string, unknown> = td.current.attrs
            styles.push([thAttrs.style, tdAttrs.style])
        })
        vm.pluginStates.resize.columnWidths.current = { name: 222 }
        flushSync()
        stop()
        expect(styles).toHaveLength(2)
        expect(String((styles[1] as unknown[])[0])).toContain('width:222px')
        expect(String((styles[1] as unknown[])[1])).toContain('width:222px')
    })
})
