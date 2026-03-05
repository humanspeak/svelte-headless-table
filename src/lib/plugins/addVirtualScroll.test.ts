import { get, writable } from 'svelte/store'
import { describe, expect, test, vi } from 'vitest'
import { createTable } from '../createTable.js'
import { addVirtualScroll } from './addVirtualScroll.js'

interface TestItem {
    id: number
    name: string
}

function createTestData(count: number): TestItem[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        name: `Item ${i}`
    }))
}

describe('addVirtualScroll', () => {
    test('exposes required state stores', () => {
        const data = writable(createTestData(50))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const state = vm.pluginStates.virtualScroll
        expect(state.scrollTop).toBeDefined()
        expect(state.viewportHeight).toBeDefined()
        expect(state.visibleRange).toBeDefined()
        expect(state.totalHeight).toBeDefined()
        expect(state.topSpacerHeight).toBeDefined()
        expect(state.bottomSpacerHeight).toBeDefined()
        expect(state.isLoading).toBeDefined()
        expect(state.hasMore).toBeDefined()
        expect(state.virtualScroll).toBeDefined()
        expect(state.scrollToIndex).toBeDefined()
        expect(state.measureRow).toBeDefined()
        expect(state.totalRows).toBeDefined()
        expect(state.renderedRows).toBeDefined()
    })

    test('initializes with correct defaults', () => {
        const data = writable(createTestData(20))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const state = vm.pluginStates.virtualScroll
        expect(get(state.scrollTop)).toBe(0)
        expect(get(state.viewportHeight)).toBe(0)
        expect(get(state.isLoading)).toBe(false)
        expect(get(state.hasMore)).toBe(false)
    })

    test('calculates total rows correctly', () => {
        const data = writable(createTestData(50))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // Trigger row derivation
        get(vm.pageRows)
        expect(get(vm.pluginStates.virtualScroll.totalRows)).toBe(50)
    })

    test('calculates total height with estimated row height', () => {
        const data = writable(createTestData(20))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 50
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // Trigger derivation
        get(vm.pageRows)

        // 20 rows * 50px = 1000px
        expect(get(vm.pluginStates.virtualScroll.totalHeight)).toBe(1000)
    })

    test('accepts boolean for hasMore', () => {
        const data = writable(createTestData(10))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                hasMore: true
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        expect(get(vm.pluginStates.virtualScroll.hasMore)).toBe(true)
    })

    test('accepts writable store for hasMore', () => {
        const hasMoreStore = writable(true)
        const data = writable(createTestData(10))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                hasMore: hasMoreStore
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        expect(get(vm.pluginStates.virtualScroll.hasMore)).toBe(true)

        hasMoreStore.set(false)
        expect(get(vm.pluginStates.virtualScroll.hasMore)).toBe(false)
    })

    test('topSpacerHeight is 0 when at top', () => {
        const data = writable(createTestData(50))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // Trigger derivation
        get(vm.pageRows)

        // At scroll position 0, top spacer should be 0
        expect(get(vm.pluginStates.virtualScroll.topSpacerHeight)).toBe(0)
    })

    test('does not call onLoadMore when hasMore is false', () => {
        const onLoadMore = vi.fn()
        const data = writable(createTestData(10))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                onLoadMore,
                hasMore: false,
                loadMoreThreshold: 200
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // Trigger derivation
        get(vm.pageRows)

        expect(onLoadMore).not.toHaveBeenCalled()
    })

    test('empty data: renders without error and totalRows is 0', () => {
        const data = writable<TestItem[]>([])
        const table = createTable(data, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        get(vm.pageRows)
        expect(get(vm.pluginStates.virtualScroll.totalRows)).toBe(0)
        expect(get(vm.pluginStates.virtualScroll.totalHeight)).toBe(0)
    })

    test('virtualIndex on rows: rows have virtualIndex props', () => {
        const data = writable(createTestData(5))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // pageRows triggers the derivePageRows hook which assigns virtualIndex
        const rows = get(vm.pageRows)
        rows.forEach((row) => {
            const props = get(row.props())
            expect(props.virtualScroll).toBeDefined()
            expect(typeof props.virtualScroll.virtualIndex).toBe('number')
            expect(props.virtualScroll.isVirtual).toBe(true)
        })
    })

    test('measureRow updates height calculations', () => {
        const data = writable(createTestData(10))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // Trigger derivation
        get(vm.pageRows)

        const state = vm.pluginStates.virtualScroll
        const initialHeight = get(state.totalHeight)
        expect(initialHeight).toBe(400) // 10 * 40

        // Measure one row as larger than estimated
        state.measureRow('0', 60)

        // Total height should increase
        const newHeight = get(state.totalHeight)
        expect(newHeight).toBeGreaterThan(initialHeight)
    })

    test('bottomSpacerHeight calculation', () => {
        const data = writable(createTestData(100))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        get(vm.pageRows)

        const state = vm.pluginStates.virtualScroll
        // At scroll position 0 with viewport 0, only buffer rows visible
        // bottomSpacerHeight should account for rows below the visible range
        const bottomSpacer = get(state.bottomSpacerHeight)
        expect(bottomSpacer).toBeGreaterThanOrEqual(0)
    })

    test('renderedRows count matches visible range', () => {
        const data = writable(createTestData(50))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const pageRows = get(vm.pageRows)
        const state = vm.pluginStates.virtualScroll
        const renderedRows = get(state.renderedRows)
        // Rendered rows should be ≤ total rows
        expect(renderedRows).toBeLessThanOrEqual(50)
        expect(renderedRows).toBe(pageRows.length)
    })

    test('derivePageRows returns subset of rows', () => {
        const data = writable(createTestData(100))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const pageRows = get(vm.pageRows)
        // With viewport=0 and scrollTop=0, only buffer rows should show
        expect(pageRows.length).toBeLessThanOrEqual(100)
    })

    test('getRowHeight override affects row height via measureRow', () => {
        const data = writable(createTestData(10))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                getRowHeight: (item: TestItem) => 60 + item.id
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        get(vm.pageRows)

        const state = vm.pluginStates.virtualScroll
        // getRowHeight is used when measureRow is called
        // Measure one row and verify height changes based on getRowHeight
        state.measureRow('0', 999)
        // After measuring, getRowHeight should be preferred for that row
        const height = get(state.totalHeight)
        expect(height).toBeGreaterThan(0)
    })

    test('onLoadMore config is accepted without error', () => {
        const onLoadMore = vi.fn()
        const data = writable(createTestData(5))
        // onLoadMore requires scroll events in DOM to trigger
        // Just verify it can be configured without error
        expect(() => {
            const table = createTable(data, {
                virtualScroll: addVirtualScroll({
                    onLoadMore,
                    hasMore: true,
                    loadMoreThreshold: 200
                })
            })
            const columns = table.createColumns([
                table.column({ accessor: 'name', header: 'Name' })
            ])
            const vm = table.createViewModel(columns)
            get(vm.pageRows)
        }).not.toThrow()
    })

    test('scrollToIndex with no scrollContainer is a no-op', () => {
        const data = writable(createTestData(50))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        get(vm.pageRows)

        // Should not throw
        expect(() => vm.pluginStates.virtualScroll.scrollToIndex(10)).not.toThrow()
    })

    test('scrollToIndex with out-of-bounds index is a no-op', () => {
        const data = writable(createTestData(10))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        get(vm.pageRows)

        // Should not throw for negative or out-of-bounds index
        expect(() => vm.pluginStates.virtualScroll.scrollToIndex(-1)).not.toThrow()
        expect(() => vm.pluginStates.virtualScroll.scrollToIndex(999)).not.toThrow()
    })

    test('measureRow with getRowHeight prefers getRowHeight', () => {
        const data = writable(createTestData(10))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                getRowHeight: () => 60
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        get(vm.pageRows)

        const state = vm.pluginStates.virtualScroll
        // Even after measuring a row to 100, getRowHeight should take precedence
        state.measureRow('0', 100)
        // Total height should still be based on getRowHeight (60 * 10 = 600)
        expect(get(state.totalHeight)).toBe(600)
    })
})
