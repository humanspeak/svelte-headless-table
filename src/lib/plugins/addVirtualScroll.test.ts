import { flushSync } from 'svelte'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { createTable } from '../createTable.js'
import { box, type Box } from '../reactivity.svelte.js'
import { withEffectRoot } from '../test/effectRoot.test.svelte.js'
import { addSortBy } from './addSortBy.svelte.js'
import { addVirtualScroll } from './addVirtualScroll.svelte.js'

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
    const ret = state.virtualScroll(node as any) as { destroy?: () => void } | undefined
    return { node, destroy: () => ret?.destroy?.() }
}

/** Dense-mode row height, buffer and viewport shared by the dense suites. */
const DENSE_ROW_HEIGHT = 40
const DENSE_BUFFER = 5
const DENSE_VIEWPORT_ROWS = 10

/** Build a dense-mode table with the action attached to a 10-row viewport. */
function createDenseTable(rowCount: number) {
    const data = box(createTestData(rowCount))
    const table = createTable(() => data.current, {
        virtualScroll: addVirtualScroll<TestItem>({
            estimatedRowHeight: DENSE_ROW_HEIGHT,
            bufferSize: DENSE_BUFFER
        })
    })
    const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
    const vm = table.createViewModel(columns)
    const state = vm.pluginStates.virtualScroll
    const { node } = attachScrollAction(
        state,
        new FakeScrollElement(DENSE_VIEWPORT_ROWS * DENSE_ROW_HEIGHT)
    )
    return { data, vm, state, node }
}

describe('addVirtualScroll', () => {
    test('exposes required state', () => {
        const data = box(createTestData(50))
        const table = createTable(() => data.current, {
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
        const data = box(createTestData(20))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const state = vm.pluginStates.virtualScroll
        expect(state.scrollTop.current).toBe(0)
        expect(state.viewportHeight.current).toBe(0)
        expect(state.isLoading.current).toBe(false)
        expect(state.hasMore.current).toBe(false)
    })

    test('calculates total rows correctly', () => {
        const data = box(createTestData(50))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        expect(vm.pluginStates.virtualScroll.totalRows.current).toBe(50)
    })

    test('calculates total height with estimated row height', () => {
        const data = box(createTestData(20))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 50
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // 20 rows * 50px = 1000px
        expect(vm.pluginStates.virtualScroll.totalHeight.current).toBe(1000)
    })

    test('accepts boolean for hasMore', () => {
        const data = box(createTestData(10))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                hasMore: true
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        expect(vm.pluginStates.virtualScroll.hasMore.current).toBe(true)
    })

    test('adopts a box for hasMore', () => {
        const hasMoreBox = box(true)
        const data = box(createTestData(10))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                hasMore: hasMoreBox
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        expect(vm.pluginStates.virtualScroll.hasMore.current).toBe(true)

        hasMoreBox.current = false
        expect(vm.pluginStates.virtualScroll.hasMore.current).toBe(false)
    })

    test('topSpacerHeight is 0 when at top', () => {
        const data = box(createTestData(50))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // At scroll position 0, top spacer should be 0
        expect(vm.pluginStates.virtualScroll.topSpacerHeight.current).toBe(0)
    })

    test('does not call onLoadMore when hasMore is false', () => {
        const onLoadMore = vi.fn()
        const data = box(createTestData(10))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                onLoadMore,
                hasMore: false,
                loadMoreThreshold: 200
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        // Mounting checks for more data once; a short table is within the threshold.
        attachScrollAction(vm.pluginStates.virtualScroll, new FakeScrollElement(400))

        expect(onLoadMore).not.toHaveBeenCalled()
    })

    test('empty data: renders without error and totalRows is 0', () => {
        const data = box<TestItem[]>([])
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        expect(vm.pluginStates.virtualScroll.totalRows.current).toBe(0)
        expect(vm.pluginStates.virtualScroll.totalHeight.current).toBe(0)
    })

    test('virtualIndex on rows: rows have virtualIndex props', () => {
        const data = box(createTestData(5))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // pageRows triggers the derivePageRows hook which assigns virtualIndex
        const rows = vm.current.pageRows
        rows.forEach((row) => {
            const props = row.current.props
            expect(props.virtualScroll).toBeDefined()
            expect(typeof props.virtualScroll.virtualIndex).toBe('number')
            expect(props.virtualScroll.isVirtual).toBe(true)
        })
    })

    test('measureRow updates height calculations', () => {
        const data = box(createTestData(10))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const state = vm.pluginStates.virtualScroll
        const initialHeight = state.totalHeight.current
        expect(initialHeight).toBe(400) // 10 * 40

        // Measure one row as larger than estimated
        state.measureRow('0', 60)

        // Total height should increase
        const newHeight = state.totalHeight.current
        expect(newHeight).toBeGreaterThan(initialHeight)
    })

    test('bottomSpacerHeight calculation', () => {
        const data = box(createTestData(100))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const state = vm.pluginStates.virtualScroll
        // At scroll position 0 with viewport 0, only buffer rows visible
        // bottomSpacerHeight should account for rows below the visible range
        const bottomSpacer = state.bottomSpacerHeight.current
        expect(bottomSpacer).toBeGreaterThanOrEqual(0)
    })

    test('renderedRows count matches visible range', () => {
        const data = box(createTestData(50))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const pageRows = vm.current.pageRows
        const state = vm.pluginStates.virtualScroll
        const renderedRows = state.renderedRows.current
        // Rendered rows should be ≤ total rows
        expect(renderedRows).toBeLessThanOrEqual(50)
        expect(renderedRows).toBe(pageRows.length)
    })

    test('derivePageRows returns subset of rows', () => {
        const data = box(createTestData(100))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const pageRows = vm.current.pageRows
        // With viewport=0 and scrollTop=0, only buffer rows should show
        expect(pageRows.length).toBeLessThanOrEqual(100)
    })

    test('getRowHeight override affects row height via measureRow', () => {
        const data = box(createTestData(10))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                getRowHeight: (item: TestItem) => 60 + item.id
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const state = vm.pluginStates.virtualScroll
        // getRowHeight is used when measureRow is called
        // Measure one row and verify height changes based on getRowHeight
        state.measureRow('0', 999)
        // After measuring, getRowHeight should be preferred for that row
        const height = state.totalHeight.current
        expect(height).toBeGreaterThan(0)
    })

    test('onLoadMore config is accepted without error', () => {
        const onLoadMore = vi.fn()
        const data = createTestData(5)
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
            expect(vm.current.pageRows.length).toBeGreaterThan(0)
        }).not.toThrow()
    })

    test('scrollToIndex with no scrollContainer is a no-op', () => {
        const data = box(createTestData(50))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // Should not throw
        expect(() => vm.pluginStates.virtualScroll.scrollToIndex(10)).not.toThrow()
    })

    test('scrollToIndex with out-of-bounds index is a no-op', () => {
        const data = box(createTestData(10))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll()
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        // Should not throw for negative or out-of-bounds index
        expect(() => vm.pluginStates.virtualScroll.scrollToIndex(-1)).not.toThrow()
        expect(() => vm.pluginStates.virtualScroll.scrollToIndex(999)).not.toThrow()
    })

    test('measureRow with getRowHeight prefers getRowHeight', () => {
        const data = box(createTestData(10))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({
                estimatedRowHeight: 40,
                getRowHeight: () => 60
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)

        const state = vm.pluginStates.virtualScroll
        // Even after measuring a row to 100, getRowHeight should take precedence
        state.measureRow('0', 100)
        // Total height should still be based on getRowHeight (60 * 10 = 600)
        expect(state.totalHeight.current).toBe(600)
    })
})

describe('addVirtualScroll dense mode geometry cost', () => {
    /**
     * Dense offsets are O(rows) walks over measured heights. If they get pulled
     * onto `scrollTop`, every scroll event walks the whole table and a jump into
     * a large dataset churns for seconds. These assert the memoization that
     * keeps that from happening — they are cheap proxies for a perf guard.
     */

    test('totalHeight does not recompute while scrolling', () => {
        const { state, node } = createDenseTable(100_000)
        let emissions = 0
        let observed = 0
        const stop = withEffectRoot(() => {
            observed = state.totalHeight.current
            emissions++
        })
        const afterSubscribe = emissions

        node.scroll(1_000_000)
        flushSync()
        node.scroll(2_000_000)
        flushSync()
        node.scroll(2_000_040)
        flushSync()

        // Row heights did not change, so neither did the total.
        expect(emissions).toBe(afterSubscribe)
        expect(observed).toBe(100_000 * DENSE_ROW_HEIGHT)
        stop()
    })

    test('spacer heights do not recompute for scrolls within the same range', () => {
        const { state, node } = createDenseTable(100_000)
        node.scroll(2_000_010)

        let topEmissions = 0
        let bottomEmissions = 0
        let observedTop = 0
        let observedBottom = 0
        const stopTop = withEffectRoot(() => {
            observedTop = state.topSpacerHeight.current
            topEmissions++
        })
        const stopBottom = withEffectRoot(() => {
            observedBottom = state.bottomSpacerHeight.current
            bottomEmissions++
        })
        const top = topEmissions
        const bottom = bottomEmissions

        // A sub-row scroll that lands on the same visible range.
        node.scroll(2_000_015)
        flushSync()

        // 10 rows on screen, padded by bufferSize 5 on both ends.
        expect(state.visibleRange.current).toEqual({ start: 49_995, end: 50_016 })
        expect(topEmissions).toBe(top)
        expect(bottomEmissions).toBe(bottom)
        expect(observedTop).toBe(state.topSpacerHeight.current)
        expect(observedBottom).toBe(state.bottomSpacerHeight.current)
        stopTop()
        stopBottom()
    })

    test('jumping deep into a large table lands on the right rows', () => {
        const { vm, state, node } = createDenseTable(100_000)

        node.scroll(50_000 * 40)

        expect(state.visibleRange.current).toEqual({ start: 49_995, end: 50_015 })
        expect(state.totalHeight.current).toBe(100_000 * 40)
        expect(state.topSpacerHeight.current).toBe(49_995 * 40)
        // 10 visible rows plus bufferSize 5 above and below.
        expect(vm.current.pageRows).toHaveLength(20)
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
        total?: number | Box<number>
        bufferSize?: number
        maxScrollHeight?: number
        onRangeChange?: (
            _range: { start: number; end: number },
            _context: { signal: AbortSignal }
        ) => void
    } = {}) {
        const dataOffset = box(offset)
        const data = box(createTestData(PAGE_SIZE))
        const table = createTable(() => data.current, {
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
        return { data, dataOffset, vm, state: vm.pluginStates.virtualScroll }
    }

    /** Attach the scroll action to a fake container with a 10-row viewport. */
    const attach = (state: ReturnType<typeof createSparseTable>['state']) =>
        attachScrollAction(state, new FakeScrollElement(10 * ROW_HEIGHT)).node

    /** Flush the microtask that `onRangeChange` is deferred onto. */
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

    test('totalRows reports the dataset total, not the loaded window', () => {
        const { state } = createSparseTable()
        expect(state.totalRows.current).toBe(TOTAL)
    })

    test('accepts a plain number for totalRows', () => {
        const { state } = createSparseTable({ total: 1000 })
        expect(state.totalRows.current).toBe(1000)
    })

    test('reacts to a changing totalRows box', () => {
        const total = box(1000)
        const { state } = createSparseTable({ total })
        expect(state.totalHeight.current).toBe(1000 * ROW_HEIGHT)
        total.current = 2000
        expect(state.totalHeight.current).toBe(2000 * ROW_HEIGHT)
    })

    test('exposes dataOffset', () => {
        const { state, dataOffset } = createSparseTable()
        expect(state.dataOffset.current).toBe(OFFSET)
        dataOffset.current = 7
        expect(state.dataOffset.current).toBe(7)
    })

    describe('under the height cap', () => {
        test('totalHeight is the full natural height', () => {
            const { state } = createSparseTable()
            expect(state.totalHeight.current).toBe(TOTAL * ROW_HEIGHT)
        })

        test('visibleRange is absolute and follows the scroll position', () => {
            const { state } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            expect(state.visibleRange.current).toEqual({ start: OFFSET - 2, end: OFFSET + 12 })
        })

        test('renders the intersection of the visible range and the loaded window', () => {
            const { vm, state } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            // Range starts 2 rows before the window, so those 2 are not resident.
            expect(vm.current.pageRows).toHaveLength(12)
            expect(state.renderedRows.current).toBe(12)
        })

        test('spacers sum to the full dataset height', () => {
            const { vm, state } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            const rendered = vm.current.pageRows.length
            expect(state.topSpacerHeight.current).toBe(OFFSET * ROW_HEIGHT)
            expect(
                state.topSpacerHeight.current +
                    rendered * ROW_HEIGHT +
                    state.bottomSpacerHeight.current
            ).toBe(state.totalHeight.current)
        })

        test('renders nothing but keeps geometry intact when the window is not resident', () => {
            const { vm, state } = createSparseTable()
            const node = attach(state)

            // Scroll to the top while the loaded window still sits at OFFSET.
            node.scroll(0)

            expect(vm.current.pageRows).toHaveLength(0)
            expect(state.renderedRows.current).toBe(0)
            expect(state.topSpacerHeight.current + state.bottomSpacerHeight.current).toBe(
                state.totalHeight.current
            )
        })

        test('picks up rows once the caller moves the window to the visible range', () => {
            const { vm, data, dataOffset, state } = createSparseTable()
            const node = attach(state)

            node.scroll(70_000 * ROW_HEIGHT)
            expect(vm.current.pageRows).toHaveLength(0)

            // Caller fetches the page covering the new range and evicts the old one.
            dataOffset.current = 70_000 - 2
            data.current = createTestData(PAGE_SIZE)

            expect(vm.current.pageRows).toHaveLength(14)
            expect(state.topSpacerHeight.current).toBe((70_000 - 2) * ROW_HEIGHT)
        })

        test('virtualIndex on rendered rows is absolute', () => {
            const { vm, state } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            const [firstRow] = vm.current.pageRows
            expect(firstRow.current.props.virtualScroll.virtualIndex).toBe(OFFSET)
        })

        test('virtualIndex updates when the window moves under reused rows', () => {
            // Rows are keyed by ID in templates, and IDs repeat across windows.
            // A frozen prop would leave the second window reporting the first
            // window's indices.
            const { vm, data, dataOffset, state } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)
            const firstIds = vm.current.pageRows.map((r) => r.id)
            expect(vm.current.pageRows[0].current.props.virtualScroll.virtualIndex).toBe(OFFSET)

            node.scroll(70_000 * ROW_HEIGHT)
            dataOffset.current = 70_000
            data.current = createTestData(PAGE_SIZE)

            const movedRows = vm.current.pageRows
            // Same row IDs as before — only the offset changed.
            expect(movedRows.map((r) => r.id)).toEqual(firstIds)
            expect(movedRows[0].current.props.virtualScroll.virtualIndex).toBe(70_000)
        })

        test('scrollToIndex targets the natural offset', () => {
            const { state } = createSparseTable()
            const node = attach(state)

            state.scrollToIndex(70_000)

            expect(node.scrollTo).toHaveBeenCalledWith({
                top: 70_000 * ROW_HEIGHT,
                behavior: 'auto'
            })
        })
    })

    describe('above the height cap', () => {
        test('caps totalHeight so the browser does not clamp the container', () => {
            const { state } = createSparseTable({ total: HUGE_TOTAL })
            attach(state)
            expect(state.totalHeight.current).toBe(CAP)
            expect(state.totalHeight.current).toBeLessThan(HUGE_TOTAL * ROW_HEIGHT)
        })

        test('the last row is reachable at maximum scroll', () => {
            const { state } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            node.scroll(CAP - node.clientHeight)

            expect(state.visibleRange.current.end).toBe(HUGE_TOTAL)
        })

        test('the middle of the dataset is reachable at half scroll', () => {
            const { state } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            node.scroll((CAP - node.clientHeight) / 2)

            const { start } = state.visibleRange.current
            expect(start).toBeGreaterThan(1_990_000)
            expect(start).toBeLessThan(2_010_000)
        })

        test('scrollToIndex reaches a row far past the cap', () => {
            const { state } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            state.scrollToIndex(2_000_000)

            // The requested position must fit inside the real container, or the
            // browser silently clamps it and the jump lands short.
            const [{ top }] = node.scrollTo.mock.calls[0]
            expect(top).toBeLessThanOrEqual(CAP - node.clientHeight)

            // Applying it must actually bring row 2,000,000 into view.
            node.scroll(top)
            const { start, end } = state.visibleRange.current
            expect(start).toBeLessThanOrEqual(2_000_000)
            expect(end).toBeGreaterThan(2_000_000)
        })

        test.each(['start', 'center', 'end', 'auto'] as const)(
            'scrollToIndex(%s) brings the row into view',
            (align) => {
                const { state } = createSparseTable({ total: HUGE_TOTAL })
                const node = attach(state)

                state.scrollToIndex(2_000_000, { align })

                const [{ top }] = node.scrollTo.mock.calls[0]
                expect(top).toBeLessThanOrEqual(CAP - node.clientHeight)

                node.scroll(top)
                const { start, end } = state.visibleRange.current
                expect(start).toBeLessThanOrEqual(2_000_000)
                expect(end).toBeGreaterThan(2_000_000)
            }
        )

        test('alignment offsets are applied in dataset coordinates, not container ones', () => {
            // The container is ~8x smaller than the dataset it represents, so a
            // viewport-sized alignment offset is ~8x smaller in container
            // pixels. Applying the raw natural offset would overshoot by dozens
            // of rows and push the requested row off screen entirely.
            const tops: Record<string, number> = {}
            for (const align of ['start', 'center', 'end'] as const) {
                const { state } = createSparseTable({ total: HUGE_TOTAL })
                const node = attach(state)
                state.scrollToIndex(2_000_000, { align })
                tops[align] = node.scrollTo.mock.calls[0][0].top
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
            const { state } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            node.scroll((CAP - node.clientHeight) / 2)
            const { start, end } = state.visibleRange.current
            const alreadyVisible = Math.floor((start + end) / 2)

            state.scrollToIndex(alreadyVisible, { align: 'auto' })

            expect(node.scrollTo).not.toHaveBeenCalled()
        })

        test('spacers sum to the capped height', () => {
            const { vm, state, dataOffset, data } = createSparseTable({
                total: HUGE_TOTAL
            })
            const node = attach(state)

            node.scroll((CAP - node.clientHeight) / 2)
            const { start } = state.visibleRange.current
            dataOffset.current = start
            data.current = createTestData(PAGE_SIZE)

            const rendered = vm.current.pageRows.length
            expect(rendered).toBeGreaterThan(0)
            expect(
                state.topSpacerHeight.current +
                    rendered * ROW_HEIGHT +
                    state.bottomSpacerHeight.current
            ).toBeCloseTo(state.totalHeight.current, 5)
        })

        test('never places the first rendered row above the container', () => {
            const { state } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            for (const top of [0, 1, 100, 5_000, CAP / 2, CAP - node.clientHeight]) {
                node.scroll(top)
                expect(state.topSpacerHeight.current).toBeGreaterThanOrEqual(0)
            }
        })
    })

    test('scrollToIndex is bounded by the dataset total, not the loaded window', () => {
        const { state } = createSparseTable()
        const node = attach(state)

        state.scrollToIndex(TOTAL)
        state.scrollToIndex(-1)

        expect(node.scrollTo).not.toHaveBeenCalled()
    })

    test('onRangeChange reports absolute ranges as the window moves', async () => {
        const onRangeChange = vi.fn()
        const { state } = createSparseTable({ onRangeChange })
        const node = attach(state)

        node.scroll(70_000 * ROW_HEIGHT)
        await flush()

        expect(onRangeChange).toHaveBeenCalledWith(
            { start: 69_998, end: 70_012 },
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        )
    })

    test('onRangeChange does not fire again for an unchanged range', async () => {
        const onRangeChange = vi.fn()
        const { state } = createSparseTable({ onRangeChange })
        const node = attach(state)

        node.scroll(70_000 * ROW_HEIGHT + 10)
        await flush()
        const callsAfterScroll = onRangeChange.mock.calls.length
        expect(callsAfterScroll).toBeGreaterThan(0)

        // Sub-row scrolling that lands on the same range must not re-fetch.
        node.scroll(70_000 * ROW_HEIGHT + 15)
        await flush()

        expect(onRangeChange).toHaveBeenCalledTimes(callsAfterScroll)
    })

    test('supersedes the in-flight range request when the range moves again', async () => {
        const signals: AbortSignal[] = []
        const onRangeChange = vi.fn((_range, context: { signal: AbortSignal }) => {
            signals.push(context.signal)
        })
        const { state } = createSparseTable({ onRangeChange })
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
    })

    test('abandons the in-flight range request when the container is destroyed', async () => {
        const signals: AbortSignal[] = []
        const onRangeChange = vi.fn((_range, context: { signal: AbortSignal }) => {
            signals.push(context.signal)
        })
        const { state } = createSparseTable({ onRangeChange })
        const node = new FakeScrollElement(10 * ROW_HEIGHT)
        const action = state.virtualScroll(node as any)

        node.scroll(70_000 * ROW_HEIGHT)
        await flush()
        expect(signals[signals.length - 1].aborted).toBe(false)

        action?.destroy?.()

        expect(signals[signals.length - 1].aborted).toBe(true)
    })

    test('dense mode still reports data-relative ranges to onRangeChange', async () => {
        const onRangeChange = vi.fn()
        const data = box(createTestData(50))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5,
                onRangeChange
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        // Range changes are reported while the scroll action is mounted. A
        // zero-height container leaves just the buffer in range.
        vm.pluginStates.virtualScroll.virtualScroll(new FakeScrollElement(0) as any)

        await flush()

        expect(onRangeChange).toHaveBeenCalledWith(
            { start: 0, end: 5 },
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        )
        expect(vm.pluginStates.virtualScroll.dataOffset.current).toBe(0)
    })

    describe('viewportRange', () => {
        test('excludes the render buffer that visibleRange pads with', () => {
            const { state } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)

            // The viewport is exactly 10 rows tall, so that is what a
            // "rows N-M of T" readout should report...
            expect(state.viewportRange.current).toEqual({ start: OFFSET, end: OFFSET + 10 })
            // ...while visibleRange stays padded by bufferSize on both ends,
            // because it drives what gets mounted.
            expect(state.visibleRange.current).toEqual({ start: OFFSET - 2, end: OFFSET + 12 })
        })

        test('includes the last row at the true bottom of the dataset', () => {
            const { state } = createSparseTable()
            const node = attach(state)

            // Scroll past the end; the container clamps to its own maximum.
            node.scroll(TOTAL * ROW_HEIGHT)

            // `end` is exclusive, so the final row is only reported when this
            // equals the dataset total. Re-deriving the mapping in app code and
            // clamping against `totalHeight` alone drops it.
            expect(state.viewportRange.current.end).toBe(TOTAL)
        })

        test('includes the last row at the bottom of a compressed dataset', () => {
            const { state } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            node.scroll(CAP - node.clientHeight)

            expect(state.viewportRange.current.end).toBe(HUGE_TOTAL)
        })

        test('stays within visibleRange at every scroll position', () => {
            const { state } = createSparseTable({ total: HUGE_TOTAL })
            const node = attach(state)

            for (const top of [0, 1, 100, 5_000, CAP / 2, CAP - node.clientHeight]) {
                node.scroll(top)
                const viewport = state.viewportRange.current
                const visible = state.visibleRange.current

                // A consumer reporting `viewportRange` must never name a row the
                // plugin did not consider visible.
                expect(viewport.start).toBeGreaterThanOrEqual(visible.start)
                expect(viewport.end).toBeLessThanOrEqual(visible.end)
                expect(viewport.start).toBeLessThan(viewport.end)
                expect(viewport.end).toBeLessThanOrEqual(HUGE_TOTAL)
            }
        })

        test('is reported in absolute indices, independent of the loaded window', () => {
            const { state, dataOffset } = createSparseTable()
            const node = attach(state)

            node.scroll(OFFSET * ROW_HEIGHT)
            const before = state.viewportRange.current
            expect(before).toEqual({ start: OFFSET, end: OFFSET + 10 })

            // Moving the resident window does not move the viewport.
            dataOffset.current = OFFSET - 100

            expect(state.viewportRange.current).toEqual(before)
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
        const data = box(createTestData(ROW_COUNT))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5
            })
        })
        const buildViewModel = () => {
            const columns = table.createColumns([
                table.column({ accessor: 'name', header: 'Name' })
            ])
            return table.createViewModel(columns)
        }
        return { buildViewModel }
    }

    /** Attach the scroll action to a fresh container of the standard height. */
    const attach = (state: { virtualScroll: (_node: HTMLElement) => unknown }) =>
        attachScrollAction(state, new FakeScrollElement(VIEWPORT))

    test('the scroll action keeps its identity across a rebuild', () => {
        const { buildViewModel } = createRebuildableTable()
        const first = buildViewModel().pluginStates.virtualScroll.virtualScroll
        const second = buildViewModel().pluginStates.virtualScroll.virtualScroll

        // A changed identity is a silent no-op for `use:`, which is what leaves
        // the DOM node bound to an instance nothing reads any more.
        expect(second).toBe(first)
    })

    test('viewport height survives a rebuild', () => {
        const { buildViewModel } = createRebuildableTable()
        const before = buildViewModel().pluginStates.virtualScroll
        attach(before)
        expect(before.viewportHeight.current).toBe(VIEWPORT)

        const after = buildViewModel().pluginStates.virtualScroll

        // A zero-height viewport collapses the visible range to the buffer.
        expect(after.viewportHeight.current).toBe(VIEWPORT)
    })

    test('scroll position survives a rebuild', () => {
        const { buildViewModel } = createRebuildableTable()
        const before = buildViewModel().pluginStates.virtualScroll
        const { node } = attach(before)
        node.scroll(4_000)
        expect(before.scrollTop.current).toBe(4_000)

        const after = buildViewModel().pluginStates.virtualScroll

        expect(after.scrollTop.current).toBe(4_000)
    })

    test('the rebuilt view model renders the scrolled range, not just the buffer', () => {
        const { buildViewModel } = createRebuildableTable()
        const before = buildViewModel().pluginStates.virtualScroll
        const { node } = attach(before)
        node.scroll(4_000)
        const range = before.visibleRange.current
        expect(range.start).toBeGreaterThan(0)

        const afterVm = buildViewModel()
        const after = afterVm.pluginStates.virtualScroll

        expect(after.visibleRange.current).toEqual(range)
    })

    test('measured row heights survive a rebuild', () => {
        const { buildViewModel } = createRebuildableTable()
        const beforeVm = buildViewModel()
        const before = beforeVm.pluginStates.virtualScroll
        const estimatedTotal = before.totalHeight.current
        // One row measures taller than the estimate. Unmeasured rows fall back
        // to the average of what has been measured, so this moves the total.
        before.measureRow('0', ROW_HEIGHT + 60)
        const measuredTotal = before.totalHeight.current
        expect(measuredTotal).not.toBe(estimatedTotal)

        const afterVm = buildViewModel()

        // Heights are keyed by row id, so a rebuild over the same rows must not
        // send the table back to `estimatedRowHeight` and visibly resettle.
        expect(afterVm.pluginStates.virtualScroll.totalHeight.current).toBe(measuredTotal)
    })

    test('geometry and row props follow the most recently built view model', () => {
        // Sort state is per view model; virtual scroll state is per plugin result.
        const table = createTable(createTestData(ROW_COUNT), {
            sort: addSortBy<TestItem>(),
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5
            })
        })
        const columns = () => table.createColumns([table.column({ accessor: 'id', header: 'ID' })])
        const first = table.createViewModel(columns())
        expect(first.current.pageRows[0].current.props.virtualScroll.virtualIndex).toBe(0)

        const second = table.createViewModel(columns())
        second.pluginStates.sort.sortKeys.current = [{ id: 'id', order: 'desc' }]

        // The rebuilt view model's rows come in reverse, so row '999' is first.
        const [firstRow] = second.current.pageRows
        expect(firstRow.id).toBe(String(ROW_COUNT - 1))
        expect(firstRow.current.props.virtualScroll.virtualIndex).toBe(0)
    })

    test('re-attaching the action restores the scroll position onto the new node', () => {
        const { buildViewModel } = createRebuildableTable()
        const state = buildViewModel().pluginStates.virtualScroll
        const first = attach(state)
        first.node.scroll(4_000)
        first.destroy()

        // A remount for any other reason now hands the plugin a node at 0 while
        // the retained `scrollTop` says 4000. The action has to reconcile them.
        const second = attach(state)

        expect(second.node.scrollTop).toBe(4_000)
        expect(state.scrollTop.current).toBe(4_000)
    })

    test('getRowHeight still wins after the scroll container remounts', () => {
        const data = box(createTestData(10))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll({ estimatedRowHeight: 40, getRowHeight: () => 60 })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const state = table.createViewModel(columns).pluginStates.virtualScroll

        // Read once so the rows are synced, then mount, unmount and mount again.
        expect(state.totalHeight.current).toBe(400)
        const first = attach(state)
        first.destroy()
        attach(state)

        state.measureRow('0', 100)
        expect(state.totalHeight.current).toBe(600)
    })

    test('one plugin result drives one table', () => {
        // The documented contract: geometry lives in the config closure, so two
        // tables built from the same `addVirtualScroll(...)` share scroll state.
        const plugin = addVirtualScroll<TestItem>({ estimatedRowHeight: ROW_HEIGHT })
        const build = () => {
            const table = createTable(createTestData(ROW_COUNT), {
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
        const { buildViewModel } = createRebuildableTable()
        const vm = buildViewModel()
        const state = vm.pluginStates.virtualScroll
        const { node, destroy } = attach(state)
        node.scroll(4_000)
        state.measureRow('0', ROW_HEIGHT + 60)
        const measuredTotal = state.totalHeight.current

        destroy()

        // Unmount tears down listeners and cancels in-flight work; it must not
        // discard the state a remount is supposed to pick back up.
        expect(state.scrollTop.current).toBe(4_000)
        expect(state.totalHeight.current).toBe(measuredTotal)
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

    function createScrollTable(data = createTestData(1_000)) {
        const table = createTable(data, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        return { state: vm.pluginStates.virtualScroll }
    }

    const mount = (state: { virtualScroll: (_node: HTMLElement) => unknown }) =>
        attachScrollAction(state, new FakeScrollElement(VIEWPORT))

    test('a superseded container does not lose the binding to a late teardown', () => {
        const { state } = createScrollTable()
        const outgoing = mount(state)
        // The replacement mounts before the outgoing node's transition ends.
        const incoming = mount(state)

        outgoing.destroy()
        state.scrollToIndex(500, { align: 'start' })

        expect(incoming.node.scrollTo).toHaveBeenCalled()
        expect(outgoing.node.scrollTo).not.toHaveBeenCalled()
    })

    test('the binding falls back to a container that is still mounted', () => {
        const { state } = createScrollTable()
        const first = mount(state)
        const second = mount(state)

        second.destroy()
        state.scrollToIndex(500, { align: 'start' })

        expect(first.node.scrollTo).toHaveBeenCalled()
    })

    test('tearing down the last container leaves the plugin driving nothing', () => {
        const { state } = createScrollTable()
        const only = mount(state)

        only.destroy()
        state.scrollToIndex(500, { align: 'start' })

        expect(only.node.scrollTo).not.toHaveBeenCalled()
    })

    test('two tables over one data array scroll independently', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const data = createTestData(1_000)
        const left = createScrollTable(data)
        const right = createScrollTable(data)
        const leftContainer = mount(left.state)
        mount(right.state)

        leftContainer.node.scroll(4_000)

        // Two views of one dataset is the supported shape for concurrent
        // scrolling: separate `addVirtualScroll()` results, so separate
        // geometry. The shared-instance warning is for one result driving two
        // tables, which this is not.
        expect(left.state.scrollTop.current).toBe(4_000)
        expect(right.state.scrollTop.current).toBe(0)
        expect(warn).not.toHaveBeenCalled()

        warn.mockRestore()
    })
})

describe('addVirtualScroll viewportRange in dense mode', () => {
    test('reports only the rows the viewport covers, not the buffered ones', () => {
        const { state, node } = createDenseTable(100_000)

        node.scroll(50_000 * DENSE_ROW_HEIGHT)

        expect(state.viewportRange.current).toEqual({ start: 50_000, end: 50_010 })
        // The buffer pads what gets mounted above the viewport.
        expect(state.visibleRange.current.start).toBe(50_000 - DENSE_BUFFER)
    })

    test('is always contained by the range that gets mounted', () => {
        const { state, node } = createDenseTable(100_000)

        for (const top of [0, 17, 400, 40_000, 2_000_015, 100_000 * DENSE_ROW_HEIGHT]) {
            node.scroll(top)
            const viewport = state.viewportRange.current
            const visible = state.visibleRange.current
            if (viewport.end === viewport.start) {
                continue
            }
            // Structural now that `visibleRange` is `viewportRange` padded, so
            // a footer can never name a row that was never rendered.
            expect(visible.start).toBeLessThanOrEqual(viewport.start)
            expect(visible.end).toBeGreaterThanOrEqual(viewport.end)
        }
    })

    test('reports an empty range for an empty table', () => {
        const { state } = createDenseTable(0)
        expect(state.viewportRange.current).toEqual({ start: 0, end: 0 })
    })

    test('covers the whole table when it is shorter than the viewport', () => {
        const { state } = createDenseTable(4)
        expect(state.viewportRange.current).toEqual({ start: 0, end: 4 })
    })
})

describe('addVirtualScroll with content above the rows', () => {
    const ROW_HEIGHT = 40
    const HEADER_HEIGHT = 40
    const VIEWPORT = 400

    /**
     * The documented markup puts `<thead>` inside the scroll container, so row 0
     * begins `HEADER_HEIGHT` below the container's scroll origin. This models a
     * container whose rows sit at that offset and reports row rects accordingly.
     */
    class OffsetScrollElement extends EventTarget {
        style: Record<string, string> = {}
        scrollTop = 0
        scrollTo = vi.fn()
        clientHeight = VIEWPORT
        getBoundingClientRect() {
            return { top: 0, height: this.clientHeight } as DOMRect
        }
        scroll(top: number) {
            this.scrollTop = top
            this.dispatchEvent(new Event('scroll'))
        }
    }

    /** A `<tr>` laid out after the header and the current top spacer. */
    const rowNode = (container: OffsetScrollElement, topSpacer: number) =>
        ({
            getBoundingClientRect: () => ({
                top: HEADER_HEIGHT + topSpacer - container.scrollTop,
                height: ROW_HEIGHT
            })
        }) as unknown as HTMLElement

    function build(bufferSize: number) {
        const data = box(createTestData(200))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const state = vm.pluginStates.virtualScroll
        const node = new OffsetScrollElement()
        state.virtualScroll(node as any)
        return { vm, state, node }
    }

    /** Mount the first rendered row, which is what reveals the offset. */
    const settle = (
        vm: ReturnType<typeof build>['vm'],
        state: ReturnType<typeof build>['state'],
        node: OffsetScrollElement
    ) => {
        const first = vm.current.pageRows.at(0)
        if (first !== undefined) {
            state.measureRowAction(rowNode(node, state.topSpacerHeight.current), first.id)
        }
    }

    test('reports the rows the user can actually see, not ones shifted by the header', () => {
        const { vm, state, node } = build(5)

        node.scroll(400)
        settle(vm, state, node)
        node.scroll(400)

        // Container band [400,800] maps to row-space [360,760] once the 40px
        // header is accounted for, i.e. rows 9-18.
        expect(state.viewportRange.current).toEqual({ start: 9, end: 19 })
    })

    test('mounts rows covering the viewport even with no buffer to absorb the shift', () => {
        const { vm, state, node } = build(0)

        node.scroll(400)
        settle(vm, state, node)
        node.scroll(400)

        const visible = state.visibleRange.current
        // Row 9 is the top row on screen; without the offset it is left unmounted
        // and a header-sized blank strip appears.
        expect(visible.start).toBeLessThanOrEqual(9)
        expect(state.topSpacerHeight.current + HEADER_HEIGHT).toBeLessThanOrEqual(node.scrollTop)
    })

    test('sparse mode accounts for the offset too', () => {
        const TOTAL = 100_000
        const dataOffset = box(0)
        const data = box(createTestData(500))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 2,
                totalRows: TOTAL,
                dataOffset
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const state = vm.pluginStates.virtualScroll
        const node = new OffsetScrollElement()
        state.virtualScroll(node as any)

        node.scroll(400)
        const first = vm.current.pageRows[0]
        state.measureRowAction(rowNode(node, state.topSpacerHeight.current), first.id)
        node.scroll(400)

        // Same shift as dense: container [400,800] is row space [360,760].
        expect(state.viewportRange.current).toEqual({ start: 9, end: 19 })
    })

    test('is a no-op when the rows start at the container origin', () => {
        const { state, node } = build(5)
        node.scroll(400)
        // No row measured, so no offset is known: the plain mapping still holds.
        expect(state.viewportRange.current).toEqual({ start: 10, end: 20 })
    })
})

describe('addVirtualScroll with a sticky header', () => {
    const ROW_HEIGHT = 40
    const HEADER_HEIGHT = 40
    const VIEWPORT = 400

    /**
     * A `position: sticky` header keeps its in-flow space — rows still begin at
     * HEADER_HEIGHT — but it also paints over the top of the viewport after you
     * scroll past it, hiding the rows underneath.
     */
    class StickyContainer extends EventTarget {
        style: Record<string, string> = {}
        scrollTop = 0
        scrollTo = vi.fn()
        clientHeight = VIEWPORT
        getBoundingClientRect() {
            return { top: 0, height: this.clientHeight } as DOMRect
        }
        scroll(top: number) {
            this.scrollTop = top
            this.dispatchEvent(new Event('scroll'))
        }
    }

    /** Pinned to the top of the container at every scroll position. */
    const stickyHeaderNode = () =>
        ({
            getBoundingClientRect: () => ({ top: 0, bottom: HEADER_HEIGHT, height: HEADER_HEIGHT })
        }) as unknown as HTMLElement

    const rowNode = (container: StickyContainer, topSpacer: number) =>
        ({
            getBoundingClientRect: () => ({
                top: HEADER_HEIGHT + topSpacer - container.scrollTop,
                height: ROW_HEIGHT
            })
        }) as unknown as HTMLElement

    /** An in-flow header scrolls away, so its overlap falls to zero. */
    const inFlowHeaderNode = (container: StickyContainer) =>
        ({
            getBoundingClientRect: () => ({
                top: -container.scrollTop,
                bottom: HEADER_HEIGHT - container.scrollTop,
                height: HEADER_HEIGHT
            })
        }) as unknown as HTMLElement

    function build() {
        const data = box(createTestData(300))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const state = vm.pluginStates.virtualScroll
        const node = new StickyContainer()
        state.virtualScroll(node as any)
        return { vm, state, node }
    }

    const settle = (
        vm: ReturnType<typeof build>['vm'],
        state: ReturnType<typeof build>['state'],
        node: StickyContainer,
        top: number
    ) => {
        node.scroll(top)
        const first = vm.current.pageRows.at(0)
        if (first !== undefined) {
            state.measureRowAction(rowNode(node, state.topSpacerHeight.current), first.id)
        }
        node.scroll(top)
    }

    test('is harmless on a header that scrolls away with the rows', () => {
        const { vm, state, node } = build()
        state.measureHeaderAction(inFlowHeaderNode(node))

        settle(vm, state, node, 400)

        // Identical to leaving the action off: the header is long gone by here.
        expect(state.viewportRange.current).toEqual({ start: 9, end: 19 })
    })

    test('scrollToIndex clears the header instead of parking the row behind it', () => {
        const { vm, state, node } = build()
        state.measureHeaderAction(stickyHeaderNode())
        settle(vm, state, node, 400)

        state.scrollToIndex(20, { align: 'start' })

        // Row 20 sits at container 40 + 800; landing there would hide it under
        // the header, so the target backs off by the header's height.
        expect(node.scrollTo).toHaveBeenCalledWith(
            expect.objectContaining({ top: 40 + 20 * ROW_HEIGHT - HEADER_HEIGHT })
        )
    })

    test('excludes rows hidden behind the header', () => {
        const data = box(createTestData(300))
        const table = createTable(() => data.current, {
            virtualScroll: addVirtualScroll<TestItem>({
                estimatedRowHeight: ROW_HEIGHT,
                bufferSize: 5
            })
        })
        const columns = table.createColumns([table.column({ accessor: 'name', header: 'Name' })])
        const vm = table.createViewModel(columns)
        const state = vm.pluginStates.virtualScroll
        const node = new StickyContainer()
        state.virtualScroll(node as any)
        state.measureHeaderAction(stickyHeaderNode())

        node.scroll(400)
        const first = vm.current.pageRows[0]
        state.measureRowAction(rowNode(node, state.topSpacerHeight.current), first.id)
        node.scroll(400)

        // Container band [400,800]; the header covers [400,440], so the rows on
        // screen occupy [440,800] — row space [400,760], i.e. rows 10-18.
        expect(state.viewportRange.current).toEqual({ start: 10, end: 19 })
    })
})
