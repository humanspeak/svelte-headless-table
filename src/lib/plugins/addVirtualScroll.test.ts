import { get, writable } from 'svelte/store'
import { beforeAll, describe, expect, test, vi } from 'vitest'
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

describe('addVirtualScroll sparse mode', () => {
    const ROW_HEIGHT = 32
    const PAGE_SIZE = 500
    /** Small enough that `totalRows * ROW_HEIGHT` stays under the height cap. */
    const TOTAL = 100_000
    const OFFSET = 50_000
    /** Large enough that it does not: 4M x 32px = 128M px vs a 16M px cap. */
    const HUGE_TOTAL = 4_000_000
    const CAP = 16_000_000

    /**
     * Minimal stand-in for the scroll container. The suite runs without a DOM,
     * so the action needs an EventTarget with the handful of properties it
     * touches.
     */
    class FakeScrollElement extends EventTarget {
        style: Record<string, string> = {}
        scrollTop = 0
        scrollTo = vi.fn()
        clientHeight: number
        constructor(clientHeight: number) {
            super()
            this.clientHeight = clientHeight
        }
        scroll(top: number) {
            this.scrollTop = top
            this.dispatchEvent(new Event('scroll'))
        }
    }

    beforeAll(() => {
        // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        ;(globalThis as any).ResizeObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    })

    /** Build a sparse-mode table over a window of `PAGE_SIZE` rows. */
    function createSparseTable({
        offset = OFFSET,
        total = TOTAL,
        bufferSize = 2,
        maxScrollHeight = CAP,
        onRangeChange
    }: {
        offset?: number
        total?: number | ReturnType<typeof writable<number>>
        bufferSize?: number
        maxScrollHeight?: number
        onRangeChange?: (_range: { start: number; end: number }) => void
    } = {}) {
        const dataOffset = writable(offset)
        const data = writable(createTestData(PAGE_SIZE))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize,
                totalRows: total,
                dataOffset,
                maxScrollHeight,
                onRangeChange
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        // Keep the derived chain hot so range changes propagate.
        const unsubscribe = vm.pageRows.subscribe(() => {})
        return { data, dataOffset, vm, state: vm.pluginStates.virtualScroll, unsubscribe }
    }

    /** Attach the scroll action to a fake container with a 10-row viewport. */
    function attach(state: ReturnType<typeof createSparseTable>['state']) {
        const node = new FakeScrollElement(10 * ROW_HEIGHT)
        // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        state.virtualScroll(node as any)
        return node
    }

    /** Flush the microtask that `onRangeChange` is deferred onto. */
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

    test('totalRows reports the dataset total, not the loaded window', () => {
        const { state, unsubscribe } = createSparseTable()
        expect(get(state.totalRows)).toBe(TOTAL)
        unsubscribe()
    })

    test('accepts a plain number for totalRows', () => {
        const { state, unsubscribe } = createSparseTable({ total: 1000 })
        expect(get(state.totalRows)).toBe(1000)
        unsubscribe()
    })

    test('reacts to a changing totalRows store', () => {
        const total = writable(1000)
        const { state, unsubscribe } = createSparseTable({ total })
        expect(get(state.totalHeight)).toBe(1000 * ROW_HEIGHT)
        total.set(2000)
        expect(get(state.totalHeight)).toBe(2000 * ROW_HEIGHT)
        unsubscribe()
    })

    test('exposes dataOffset', () => {
        const { state, dataOffset, unsubscribe } = createSparseTable()
        expect(get(state.dataOffset)).toBe(OFFSET)
        dataOffset.set(7)
        expect(get(state.dataOffset)).toBe(7)
        unsubscribe()
    })

    describe('under the height cap', () => {
        test('totalHeight is the full natural height', () => {
            const { state, unsubscribe } = createSparseTable()
            expect(get(state.totalHeight)).toBe(TOTAL * ROW_HEIGHT)
            unsubscribe()
        })

        test('visibleRange is absolute and follows the scroll position', () => {
            const { state, unsubscribe } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            expect(get(state.visibleRange)).toEqual({ start: OFFSET - 2, end: OFFSET + 12 })
            unsubscribe()
        })

        test('renders the intersection of the visible range and the loaded window', () => {
            const { vm, state, unsubscribe } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            // Range starts 2 rows before the window, so those 2 are not resident.
            expect(get(vm.pageRows)).toHaveLength(12)
            expect(get(state.renderedRows)).toBe(12)
            unsubscribe()
        })

        test('spacers sum to the full dataset height', () => {
            const { vm, state, unsubscribe } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            const rendered = get(vm.pageRows).length
            expect(get(state.topSpacerHeight)).toBe(OFFSET * ROW_HEIGHT)
            expect(
                get(state.topSpacerHeight) + rendered * ROW_HEIGHT + get(state.bottomSpacerHeight)
            ).toBe(get(state.totalHeight))
            unsubscribe()
        })

        test('renders nothing but keeps geometry intact when the window is not resident', () => {
            const { vm, state, unsubscribe } = createSparseTable()
            const node = attach(state)

            // Scroll to the top while the loaded window still sits at OFFSET.
            node.scroll(0)

            expect(get(vm.pageRows)).toHaveLength(0)
            expect(get(state.renderedRows)).toBe(0)
            expect(get(state.topSpacerHeight) + get(state.bottomSpacerHeight)).toBe(
                get(state.totalHeight)
            )
            unsubscribe()
        })

        test('picks up rows once the caller moves the window to the visible range', () => {
            const { vm, data, dataOffset, state, unsubscribe } = createSparseTable()
            const node = attach(state)

            node.scroll(70_000 * ROW_HEIGHT)
            expect(get(vm.pageRows)).toHaveLength(0)

            // Caller fetches the page covering the new range and evicts the old one.
            dataOffset.set(70_000 - 2)
            data.set(createTestData(PAGE_SIZE))

            expect(get(vm.pageRows)).toHaveLength(14)
            expect(get(state.topSpacerHeight)).toBe((70_000 - 2) * ROW_HEIGHT)
            unsubscribe()
        })

        test('virtualIndex on rendered rows is absolute', () => {
            const { vm, state, unsubscribe } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            const [firstRow] = get(vm.pageRows)
            expect(get(firstRow.props()).virtualScroll.virtualIndex).toBe(OFFSET)
            unsubscribe()
        })

        test('virtualIndex updates when the window moves under reused rows', () => {
            // Rows are keyed by ID in templates, and IDs repeat across windows.
            // A frozen prop would leave the second window reporting the first
            // window's indices.
            const { vm, data, dataOffset, state, unsubscribe } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)
            const firstIds = get(vm.pageRows).map((r) => r.id)
            expect(get(get(vm.pageRows)[0].props()).virtualScroll.virtualIndex).toBe(OFFSET)

            node.scroll(70_000 * ROW_HEIGHT)
            dataOffset.set(70_000)
            data.set(createTestData(PAGE_SIZE))

            const movedRows = get(vm.pageRows)
            // Same row IDs as before — only the offset changed.
            expect(movedRows.map((r) => r.id)).toEqual(firstIds)
            expect(get(movedRows[0].props()).virtualScroll.virtualIndex).toBe(70_000)
            unsubscribe()
        })

        test('scrollToIndex targets the natural offset', () => {
            const { state, unsubscribe } = createSparseTable()
            const node = attach(state)

            state.scrollToIndex(70_000)

            expect(node.scrollTo).toHaveBeenCalledWith({
                top: 70_000 * ROW_HEIGHT,
                behavior: 'auto'
            })
            unsubscribe()
        })
    })

    describe('above the height cap', () => {
        test('caps totalHeight so the browser does not clamp the container', () => {
            const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
            attach(state)
            expect(get(state.totalHeight)).toBe(CAP)
            expect(get(state.totalHeight)).toBeLessThan(HUGE_TOTAL * ROW_HEIGHT)
            unsubscribe()
        })

        test('the last row is reachable at maximum scroll', () => {
            const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            node.scroll(CAP - node.clientHeight)

            expect(get(state.visibleRange).end).toBe(HUGE_TOTAL)
            unsubscribe()
        })

        test('the middle of the dataset is reachable at half scroll', () => {
            const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            node.scroll((CAP - node.clientHeight) / 2)

            const { start } = get(state.visibleRange)
            expect(start).toBeGreaterThan(1_990_000)
            expect(start).toBeLessThan(2_010_000)
            unsubscribe()
        })

        test('scrollToIndex reaches a row far past the cap', () => {
            const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            state.scrollToIndex(2_000_000)

            // The requested position must fit inside the real container, or the
            // browser silently clamps it and the jump lands short.
            const [{ top }] = node.scrollTo.mock.calls[0]
            expect(top).toBeLessThanOrEqual(CAP - node.clientHeight)

            // Applying it must actually bring row 2,000,000 into view.
            node.scroll(top)
            const { start, end } = get(state.visibleRange)
            expect(start).toBeLessThanOrEqual(2_000_000)
            expect(end).toBeGreaterThan(2_000_000)
            unsubscribe()
        })

        test('spacers sum to the capped height', () => {
            const { vm, state, dataOffset, data, unsubscribe } = createSparseTable({
                total: HUGE_TOTAL
            })
            const node = attach(state)

            node.scroll((CAP - node.clientHeight) / 2)
            const { start } = get(state.visibleRange)
            dataOffset.set(start)
            data.set(createTestData(PAGE_SIZE))

            const rendered = get(vm.pageRows).length
            expect(rendered).toBeGreaterThan(0)
            expect(
                get(state.topSpacerHeight) + rendered * ROW_HEIGHT + get(state.bottomSpacerHeight)
            ).toBeCloseTo(get(state.totalHeight), 5)
            unsubscribe()
        })

        test('never places the first rendered row above the container', () => {
            const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            for (const top of [0, 1, 100, 5_000, CAP / 2, CAP - node.clientHeight]) {
                node.scroll(top)
                expect(get(state.topSpacerHeight)).toBeGreaterThanOrEqual(0)
            }
            unsubscribe()
        })
    })

    test('scrollToIndex is bounded by the dataset total, not the loaded window', () => {
        const { state, unsubscribe } = createSparseTable()
        const node = attach(state)

        state.scrollToIndex(TOTAL)
        state.scrollToIndex(-1)

        expect(node.scrollTo).not.toHaveBeenCalled()
        unsubscribe()
    })

    test('onRangeChange reports absolute ranges as the window moves', async () => {
        const onRangeChange = vi.fn()
        const { state, unsubscribe } = createSparseTable({ onRangeChange })
        const node = attach(state)

        node.scroll(70_000 * ROW_HEIGHT)
        await flush()

        expect(onRangeChange).toHaveBeenCalledWith({ start: 69_998, end: 70_012 })
        unsubscribe()
    })

    test('onRangeChange does not fire again for an unchanged range', async () => {
        const onRangeChange = vi.fn()
        const { state, unsubscribe } = createSparseTable({ onRangeChange })
        const node = attach(state)

        node.scroll(70_000 * ROW_HEIGHT + 10)
        await flush()
        const callsAfterScroll = onRangeChange.mock.calls.length

        // Sub-row scrolling that lands on the same range must not re-fetch.
        node.scroll(70_000 * ROW_HEIGHT + 15)
        await flush()

        expect(onRangeChange).toHaveBeenCalledTimes(callsAfterScroll)
        unsubscribe()
    })

    test('dense mode still reports data-relative ranges to onRangeChange', async () => {
        const onRangeChange = vi.fn()
        const data = writable(createTestData(50))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5,
                onRangeChange
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const unsubscribe = vm.pageRows.subscribe(() => {})

        await flush()

        expect(onRangeChange).toHaveBeenCalledWith({ start: 0, end: 5 })
        expect(get(vm.pluginStates.virtualScroll.dataOffset)).toBe(0)
        unsubscribe()
    })
})
