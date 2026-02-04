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
})
