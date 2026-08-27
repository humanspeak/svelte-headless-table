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

/**
 * Minimal stand-in for the scroll container. The suite runs without a DOM, so
 * the action needs an EventTarget with the handful of properties it touches.
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

/** Attach the scroll action to `node`, returning it with its destroy callback. */
function attachScrollAction(
    state: { virtualScroll: (_node: HTMLElement) => unknown },
    node: FakeScrollElement
) {
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    const ret = state.virtualScroll(node as any) as { destroy?: () => void } | undefined
    return { node, destroy: () => ret?.destroy?.() }
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

describe('addVirtualScroll dense mode geometry cost', () => {
    /**
     * Dense offsets are O(rows) walks over measured heights. If they get pulled
     * onto `scrollTop`, every scroll event walks the whole table and a jump into
     * a large dataset churns for seconds. These assert the memoization that
     * keeps that from happening — they are cheap proxies for a perf guard.
     */
    function createDenseTable(rowCount: number) {
        const data = writable(createTestData(rowCount))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll<TestItem>({ estimatedRowHeight: 40, bufferSize: 5 })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const unsubscribe = vm.pageRows.subscribe(() => {})
        const state = vm.pluginStates.virtualScroll
        const node = new FakeScrollElement(400)
        // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        state.virtualScroll(node as any)
        return { data, vm, state, node, unsubscribe }
    }

    test('totalHeight does not recompute while scrolling', () => {
        const { state, node, unsubscribe } = createDenseTable(100_000)
        let emissions = 0
        const stop = state.totalHeight.subscribe(() => {
            emissions++
        })
        const afterSubscribe = emissions

        node.scroll(1_000_000)
        node.scroll(2_000_000)
        node.scroll(2_000_040)

        // Row heights did not change, so neither did the total.
        expect(emissions).toBe(afterSubscribe)
        stop()
        unsubscribe()
    })

    test('spacer heights do not recompute for scrolls within the same range', () => {
        const { state, node, unsubscribe } = createDenseTable(100_000)
        node.scroll(2_000_010)

        let topEmissions = 0
        let bottomEmissions = 0
        const stopTop = state.topSpacerHeight.subscribe(() => {
            topEmissions++
        })
        const stopBottom = state.bottomSpacerHeight.subscribe(() => {
            bottomEmissions++
        })
        const top = topEmissions
        const bottom = bottomEmissions

        // A sub-row scroll that lands on the same visible range.
        node.scroll(2_000_015)

        expect(get(state.visibleRange)).toEqual({ start: 49_995, end: 50_011 })
        expect(topEmissions).toBe(top)
        expect(bottomEmissions).toBe(bottom)
        stopTop()
        stopBottom()
        unsubscribe()
    })

    test('jumping deep into a large table lands on the right rows', () => {
        const { vm, state, node, unsubscribe } = createDenseTable(100_000)

        node.scroll(50_000 * 40)

        expect(get(state.visibleRange)).toEqual({ start: 49_995, end: 50_010 })
        expect(get(state.totalHeight)).toBe(100_000 * 40)
        expect(get(state.topSpacerHeight)).toBe(49_995 * 40)
        expect(get(vm.pageRows)).toHaveLength(15)
        unsubscribe()
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
        onRangeChange?: (
            _range: { start: number; end: number },
            _context: { signal: AbortSignal }
        ) => void
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
    const attach = (state: ReturnType<typeof createSparseTable>['state']) =>
        attachScrollAction(state, new FakeScrollElement(10 * ROW_HEIGHT)).node

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

        test.each(['start', 'center', 'end', 'auto'] as const)(
            'scrollToIndex(%s) brings the row into view',
            (align) => {
                const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
                const node = attach(state)

                state.scrollToIndex(2_000_000, { align })

                const [{ top }] = node.scrollTo.mock.calls[0]
                expect(top).toBeLessThanOrEqual(CAP - node.clientHeight)

                node.scroll(top)
                const { start, end } = get(state.visibleRange)
                expect(start).toBeLessThanOrEqual(2_000_000)
                expect(end).toBeGreaterThan(2_000_000)
                unsubscribe()
            }
        )

        test('alignment offsets are applied in dataset coordinates, not container ones', () => {
            // The container is ~8x smaller than the dataset it represents, so a
            // viewport-sized alignment offset is ~8x smaller in container
            // pixels. Applying the raw natural offset would overshoot by dozens
            // of rows and push the requested row off screen entirely.
            const tops: Record<string, number> = {}
            for (const align of ['start', 'center', 'end'] as const) {
                const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
                const node = attach(state)
                state.scrollToIndex(2_000_000, { align })
                tops[align] = node.scrollTo.mock.calls[0][0].top
                unsubscribe()
            }

            expect(tops.end).toBeLessThan(tops.center)
            expect(tops.center).toBeLessThan(tops.start)

            // Half a viewport in dataset pixels is (320 - 32) / 2 = 144, which
            // is ~18 container pixels once compressed. Uncompressed it would be
            // the full 144.
            const centreShift = tops.start - tops.center
            expect(centreShift).toBeGreaterThan(5)
            expect(centreShift).toBeLessThan(50)
        })

        test('scrollToIndex(auto) is a no-op for a row already in view', () => {
            const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            node.scroll((CAP - node.clientHeight) / 2)
            const { start, end } = get(state.visibleRange)
            const alreadyVisible = Math.floor((start + end) / 2)

            state.scrollToIndex(alreadyVisible, { align: 'auto' })

            expect(node.scrollTo).not.toHaveBeenCalled()
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

        expect(onRangeChange).toHaveBeenCalledWith(
            { start: 69_998, end: 70_012 },
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        )
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

    test('supersedes the in-flight range request when the range moves again', async () => {
        const signals: AbortSignal[] = []
        const onRangeChange = vi.fn((_range, context: { signal: AbortSignal }) => {
            signals.push(context.signal)
        })
        const { state, unsubscribe } = createSparseTable({ onRangeChange })
        const node = attach(state)

        node.scroll(70_000 * ROW_HEIGHT)
        await flush()
        node.scroll(90_000 * ROW_HEIGHT)
        await flush()

        expect(signals.length).toBeGreaterThanOrEqual(2)
        // Everything but the newest request is abandoned, so a slow early fetch
        // cannot land after a fast later one and republish a stale window.
        for (const signal of signals.slice(0, -1)) {
            expect(signal.aborted).toBe(true)
        }
        expect(signals[signals.length - 1].aborted).toBe(false)
        unsubscribe()
    })

    test('abandons the in-flight range request when the container is destroyed', async () => {
        const signals: AbortSignal[] = []
        const onRangeChange = vi.fn((_range, context: { signal: AbortSignal }) => {
            signals.push(context.signal)
        })
        const { state, unsubscribe } = createSparseTable({ onRangeChange })
        const node = new FakeScrollElement(10 * ROW_HEIGHT)
        // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        const action = state.virtualScroll(node as any)

        node.scroll(70_000 * ROW_HEIGHT)
        await flush()
        expect(signals[signals.length - 1].aborted).toBe(false)

        action?.destroy?.()

        expect(signals[signals.length - 1].aborted).toBe(true)
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

        expect(onRangeChange).toHaveBeenCalledWith(
            { start: 0, end: 5 },
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        )
        expect(get(vm.pluginStates.virtualScroll.dataOffset)).toBe(0)
        unsubscribe()
    })

    describe('viewportRange', () => {
        test('excludes the render buffer that visibleRange pads with', () => {
            const { state, unsubscribe } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            // The viewport is exactly 10 rows tall, so that is what a
            // "rows N-M of T" readout should report...
            expect(get(state.viewportRange)).toEqual({ start: OFFSET, end: OFFSET + 10 })
            // ...while visibleRange stays padded by bufferSize on both ends,
            // because it drives what gets mounted.
            expect(get(state.visibleRange)).toEqual({ start: OFFSET - 2, end: OFFSET + 12 })
            unsubscribe()
        })

        test('includes the last row at the true bottom of the dataset', () => {
            const { state, unsubscribe } = createSparseTable()
            const node = attach(state)

            // Scroll past the end; the container clamps to its own maximum.
            node.scroll(TOTAL * ROW_HEIGHT)

            // `end` is exclusive, so the final row is only reported when this
            // equals the dataset total. Re-deriving the mapping in app code and
            // clamping against `totalHeight` alone drops it.
            expect(get(state.viewportRange).end).toBe(TOTAL)
            unsubscribe()
        })

        test('includes the last row at the bottom of a compressed dataset', () => {
            const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            node.scroll(CAP - node.clientHeight)

            expect(get(state.viewportRange).end).toBe(HUGE_TOTAL)
            unsubscribe()
        })

        test('stays within visibleRange at every scroll position', () => {
            const { state, unsubscribe } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            for (const top of [0, 1, 100, 5_000, CAP / 2, CAP - node.clientHeight]) {
                node.scroll(top)
                const viewport = get(state.viewportRange)
                const visible = get(state.visibleRange)

                // A consumer reporting `viewportRange` must never name a row the
                // plugin did not consider visible.
                expect(viewport.start).toBeGreaterThanOrEqual(visible.start)
                expect(viewport.end).toBeLessThanOrEqual(visible.end)
                expect(viewport.start).toBeLessThan(viewport.end)
                expect(viewport.end).toBeLessThanOrEqual(HUGE_TOTAL)
            }
            unsubscribe()
        })

        test('is reported in absolute indices, independent of the loaded window', () => {
            const { state, dataOffset, unsubscribe } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)
            const before = get(state.viewportRange)
            expect(before).toEqual({ start: OFFSET, end: OFFSET + 10 })

            // Moving the resident window does not move the viewport.
            dataOffset.set(OFFSET - 100)

            expect(get(state.viewportRange)).toEqual(before)
            unsubscribe()
        })
    })
})

describe('addVirtualScroll survives a view model rebuild', () => {
    /**
     * Container-bound and geometry state lives in the config closure, shared
     * across rebuilds. Without that, a rebuild leaves the mounted node wired to
     * a discarded instance whose `viewportHeight` is 0, and only the buffer
     * renders.
     */
    const ROW_HEIGHT = 40
    const ROW_COUNT = 1_000
    const VIEWPORT = 400

    /**
     * A table whose columns are rebuilt on demand. `buildViewModel` stands in
     * for a `$derived` consumer: same column shape every time, new array
     * identity every time.
     */
    function createRebuildableTable() {
        const data = writable(createTestData(ROW_COUNT))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5
            })
        })
        const teardowns: (() => void)[] = []
        const buildViewModel = () => {
            const columns = table.createColumns([
                table.column({ accessor: 'name', header: 'Name' })
            ])
            const vm = table.createViewModel(columns)
            teardowns.push(vm.pageRows.subscribe(() => {}))
            return vm
        }
        const cleanup = () => teardowns.forEach((stop) => stop())
        return { buildViewModel, cleanup }
    }

    /** Attach the scroll action to a fresh container of the standard height. */
    const attach = (state: { virtualScroll: (_node: HTMLElement) => unknown }) =>
        attachScrollAction(state, new FakeScrollElement(VIEWPORT))

    test('the scroll action keeps its identity across a rebuild', () => {
        const { buildViewModel, cleanup } = createRebuildableTable()
        const first = buildViewModel().pluginStates.virtualScroll.virtualScroll
        const second = buildViewModel().pluginStates.virtualScroll.virtualScroll

        // A changed identity is a silent no-op for `use:`, which is what leaves
        // the DOM node bound to an instance nothing reads any more.
        expect(second).toBe(first)
        cleanup()
    })

    test('viewport height survives a rebuild', () => {
        const { buildViewModel, cleanup } = createRebuildableTable()
        const before = buildViewModel().pluginStates.virtualScroll
        attach(before)
        expect(get(before.viewportHeight)).toBe(VIEWPORT)

        const after = buildViewModel().pluginStates.virtualScroll

        // A zero-height viewport collapses the visible range to the buffer.
        expect(get(after.viewportHeight)).toBe(VIEWPORT)
        cleanup()
    })

    test('scroll position survives a rebuild', () => {
        const { buildViewModel, cleanup } = createRebuildableTable()
        const before = buildViewModel().pluginStates.virtualScroll
        const { node } = attach(before)
        node.scroll(4_000)
        expect(get(before.scrollTop)).toBe(4_000)

        const after = buildViewModel().pluginStates.virtualScroll

        expect(get(after.scrollTop)).toBe(4_000)
        cleanup()
    })

    test('the rebuilt view model renders the scrolled range, not just the buffer', () => {
        const { buildViewModel, cleanup } = createRebuildableTable()
        const before = buildViewModel().pluginStates.virtualScroll
        const { node } = attach(before)
        node.scroll(4_000)
        const range = get(before.visibleRange)
        expect(range.start).toBeGreaterThan(0)

        const afterVm = buildViewModel()
        const after = afterVm.pluginStates.virtualScroll
        get(afterVm.pageRows)

        expect(get(after.visibleRange)).toEqual(range)
        cleanup()
    })

    test('measured row heights survive a rebuild', () => {
        const { buildViewModel, cleanup } = createRebuildableTable()
        const beforeVm = buildViewModel()
        const before = beforeVm.pluginStates.virtualScroll
        get(beforeVm.pageRows)
        const estimatedTotal = get(before.totalHeight)
        // One row measures taller than the estimate. Unmeasured rows fall back
        // to the average of what has been measured, so this moves the total.
        before.measureRow('0', ROW_HEIGHT + 60)
        const measuredTotal = get(before.totalHeight)
        expect(measuredTotal).not.toBe(estimatedTotal)

        const afterVm = buildViewModel()
        get(afterVm.pageRows)

        // Heights are keyed by row id, so a rebuild over the same rows must not
        // send the table back to `estimatedRowHeight` and visibly resettle.
        expect(get(afterVm.pluginStates.virtualScroll.totalHeight)).toBe(measuredTotal)
        cleanup()
    })

    test('re-attaching the action restores the scroll position onto the new node', () => {
        const { buildViewModel, cleanup } = createRebuildableTable()
        const state = buildViewModel().pluginStates.virtualScroll
        const first = attach(state)
        first.node.scroll(4_000)
        first.destroy()

        // A remount for any other reason now hands the plugin a node at 0 while
        // the retained `scrollTop` says 4000. The action has to reconcile them.
        const second = attach(state)

        expect(second.node.scrollTop).toBe(4_000)
        expect(get(state.scrollTop)).toBe(4_000)
        cleanup()
    })

    test('one plugin result drives one table', () => {
        // The documented contract: geometry lives in the config closure, so two
        // tables built from the same `addVirtualScroll(...)` share scroll state.
        const plugin = addVirtualScroll<TestItem>({ estimatedRowHeight: ROW_HEIGHT })
        const build = () => {
            const table = createTable(writable(createTestData(ROW_COUNT)), {
                virtualScroll: plugin
            })
            const columns = table.createColumns([
                table.column({ accessor: 'name', header: 'Name' })
            ])
            return table.createViewModel(columns).pluginStates.virtualScroll
        }
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const one = build()
        const two = build()

        expect(two.virtualScroll).toBe(one.virtualScroll)
        // Sharing is silent otherwise, so the second table gets a warning.
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('more than one table'))
        warn.mockRestore()
    })

    test('destroying the action retains geometry for the next mount', () => {
        const { buildViewModel, cleanup } = createRebuildableTable()
        const vm = buildViewModel()
        const state = vm.pluginStates.virtualScroll
        const { node, destroy } = attach(state)
        node.scroll(4_000)
        get(vm.pageRows)
        state.measureRow('0', ROW_HEIGHT + 60)
        const measuredTotal = get(state.totalHeight)

        destroy()

        // Unmount tears down listeners and cancels in-flight work; it must not
        // discard the state a remount is supposed to pick back up.
        expect(get(state.scrollTop)).toBe(4_000)
        expect(get(state.totalHeight)).toBe(measuredTotal)
        cleanup()
    })
})

describe('addVirtualScroll container lifecycle', () => {
    /**
     * The container binding and in-flight work are plugin-scoped now, so
     * teardown has to prove it owns them before clearing. Svelte defers a
     * block's destroy behind an out transition, which routinely lands an
     * outgoing node's teardown after its replacement has already mounted.
     */
    const ROW_HEIGHT = 40
    const VIEWPORT = 400

    function createScrollTable(data = writable(createTestData(1_000))) {
        const table = createTable(data, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const stop = vm.pageRows.subscribe(() => {})
        return { state: vm.pluginStates.virtualScroll, stop }
    }

    const mount = (state: { virtualScroll: (_node: HTMLElement) => unknown }) =>
        attachScrollAction(state, new FakeScrollElement(VIEWPORT))

    test('a superseded container does not lose the binding to a late teardown', () => {
        const { state, stop } = createScrollTable()
        const outgoing = mount(state)
        // The replacement mounts before the outgoing node's transition ends.
        const incoming = mount(state)

        outgoing.destroy()
        state.scrollToIndex(500, { align: 'start' })

        expect(incoming.node.scrollTo).toHaveBeenCalled()
        expect(outgoing.node.scrollTo).not.toHaveBeenCalled()
        stop()
    })

    test('the binding falls back to a container that is still mounted', () => {
        const { state, stop } = createScrollTable()
        const first = mount(state)
        const second = mount(state)

        second.destroy()
        state.scrollToIndex(500, { align: 'start' })

        expect(first.node.scrollTo).toHaveBeenCalled()
        stop()
    })

    test('tearing down the last container leaves the plugin driving nothing', () => {
        const { state, stop } = createScrollTable()
        const only = mount(state)

        only.destroy()
        state.scrollToIndex(500, { align: 'start' })

        expect(only.node.scrollTo).not.toHaveBeenCalled()
        stop()
    })

    test('two tables over one data store scroll independently', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const data = writable(createTestData(1_000))
        const left = createScrollTable(data)
        const right = createScrollTable(data)
        const leftContainer = mount(left.state)
        mount(right.state)

        leftContainer.node.scroll(4_000)

        // Two views of one dataset is the supported shape for concurrent
        // scrolling: separate `addVirtualScroll()` results, so separate
        // geometry. The shared-instance warning is for one result driving two
        // tables, which this is not.
        expect(get(left.state.scrollTop)).toBe(4_000)
        expect(get(right.state.scrollTop)).toBe(0)
        expect(warn).not.toHaveBeenCalled()

        warn.mockRestore()
        left.stop()
        right.stop()
    })
})

describe('addVirtualScroll viewportRange in dense mode', () => {
    const ROW_HEIGHT = 40
    const BUFFER = 5
    const VIEWPORT_ROWS = 10

    function createDenseTable(rowCount: number) {
        const data = writable(createTestData(rowCount))
        const table = createTable(data, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: BUFFER
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const unsubscribe = vm.pageRows.subscribe(() => {})
        const state = vm.pluginStates.virtualScroll
        const node = new FakeScrollElement(VIEWPORT_ROWS * ROW_HEIGHT)
        // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        state.virtualScroll(node as any)
        return { state, node, unsubscribe }
    }

    test('reports only the rows the viewport covers, not the buffered ones', () => {
        const { state, node, unsubscribe } = createDenseTable(100_000)

        node.scroll(50_000 * ROW_HEIGHT)

        expect(get(state.viewportRange)).toEqual({ start: 50_000, end: 50_010 })
        // The buffer pads what gets mounted above the viewport.
        expect(get(state.visibleRange).start).toBe(50_000 - BUFFER)
        unsubscribe()
    })

    test('reports an empty range for an empty table', () => {
        const { state, unsubscribe } = createDenseTable(0)
        expect(get(state.viewportRange)).toEqual({ start: 0, end: 0 })
        unsubscribe()
    })

    test('covers the whole table when it is shorter than the viewport', () => {
        const { state, unsubscribe } = createDenseTable(4)
        expect(get(state.viewportRange)).toEqual({ start: 0, end: 4 })
        unsubscribe()
    })
})
