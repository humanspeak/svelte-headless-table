import { beforeEach, describe, expect, test } from 'vitest'
import { HeightManager } from './HeightManager.js'

describe('HeightManager', () => {
    let manager: HeightManager

    beforeEach(() => {
        manager = new HeightManager(40)
    })

    describe('constructor', () => {
        test('creates with default estimated height', () => {
            const m = new HeightManager()
            expect(m.getAverageHeight()).toBe(40)
        })

        test('creates with custom estimated height', () => {
            const m = new HeightManager(60)
            expect(m.getAverageHeight()).toBe(60)
        })
    })

    describe('setHeight', () => {
        test('adds new height measurement', () => {
            const changed = manager.setHeight('row-1', 50)
            expect(changed).toBe(true)
            expect(manager.getHeight('row-1')).toBe(50)
            expect(manager.size).toBe(1)
        })

        test('returns false when height unchanged', () => {
            manager.setHeight('row-1', 50)
            const changed = manager.setHeight('row-1', 50)
            expect(changed).toBe(false)
        })

        test('updates existing height measurement', () => {
            manager.setHeight('row-1', 50)
            const changed = manager.setHeight('row-1', 60)
            expect(changed).toBe(true)
            expect(manager.getHeight('row-1')).toBe(60)
            expect(manager.size).toBe(1)
        })
    })

    describe('getHeight', () => {
        test('returns measured height when available', () => {
            manager.setHeight('row-1', 55)
            expect(manager.getHeight('row-1')).toBe(55)
        })

        test('returns average height when not measured', () => {
            manager.setHeight('row-1', 50)
            manager.setHeight('row-2', 60)
            expect(manager.getHeight('row-3')).toBe(55) // average of 50 and 60
        })

        test('returns estimated height when nothing measured', () => {
            expect(manager.getHeight('row-1')).toBe(40)
        })
    })

    describe('hasMeasurement', () => {
        test('returns true for measured row', () => {
            manager.setHeight('row-1', 50)
            expect(manager.hasMeasurement('row-1')).toBe(true)
        })

        test('returns false for unmeasured row', () => {
            expect(manager.hasMeasurement('row-1')).toBe(false)
        })
    })

    describe('getAverageHeight', () => {
        test('returns estimated height when no measurements', () => {
            expect(manager.getAverageHeight()).toBe(40)
        })

        test('returns average of measured heights', () => {
            manager.setHeight('row-1', 40)
            manager.setHeight('row-2', 60)
            manager.setHeight('row-3', 80)
            expect(manager.getAverageHeight()).toBe(60) // (40+60+80)/3
        })
    })

    describe('getTotalHeight', () => {
        test('returns total height for measured rows', () => {
            manager.setHeight('row-0', 40)
            manager.setHeight('row-1', 50)
            manager.setHeight('row-2', 60)
            const total = manager.getTotalHeight(['row-0', 'row-1', 'row-2'])
            expect(total).toBe(150)
        })

        test('uses average for unmeasured rows', () => {
            manager.setHeight('row-0', 40)
            manager.setHeight('row-1', 60)
            // average is 50
            const total = manager.getTotalHeight(['row-0', 'row-1', 'row-2'])
            expect(total).toBe(150) // 40 + 60 + 50(average)
        })

        test('returns 0 for empty array', () => {
            expect(manager.getTotalHeight([])).toBe(0)
        })
    })

    describe('getOffsetForIndex', () => {
        test('returns 0 for index 0', () => {
            const offset = manager.getOffsetForIndex(['row-0', 'row-1', 'row-2'], 0)
            expect(offset).toBe(0)
        })

        test('returns sum of heights before index', () => {
            manager.setHeight('row-0', 40)
            manager.setHeight('row-1', 50)
            manager.setHeight('row-2', 60)
            const offset = manager.getOffsetForIndex(['row-0', 'row-1', 'row-2'], 2)
            expect(offset).toBe(90) // 40 + 50
        })

        test('uses average for unmeasured rows', () => {
            manager.setHeight('row-0', 40)
            manager.setHeight('row-2', 60)
            // average is 50
            const offset = manager.getOffsetForIndex(['row-0', 'row-1', 'row-2'], 2)
            expect(offset).toBe(90) // 40 + 50(average for row-1)
        })
    })

    describe('getVisibleRange', () => {
        const rowIds = ['row-0', 'row-1', 'row-2', 'row-3', 'row-4']

        beforeEach(() => {
            // Each row is 40px (default)
            rowIds.forEach((id) => manager.setHeight(id, 40))
        })

        test('returns full range for empty rows', () => {
            const range = manager.getVisibleRange([], 0, 100, 0)
            expect(range).toEqual({ start: 0, end: 0 })
        })

        test('returns visible range without buffer', () => {
            // viewport shows rows at y=0 to y=80 (2 rows)
            const range = manager.getVisibleRange(rowIds, 0, 80, 0)
            expect(range.start).toBe(0)
            expect(range.end).toBe(2)
        })

        test('includes buffer rows', () => {
            // viewport shows rows at y=40 to y=120 (2 rows: 1 and 2)
            // with buffer of 1, should include row 0
            const range = manager.getVisibleRange(rowIds, 40, 80, 1)
            expect(range.start).toBe(0) // 1 - buffer(1) = 0
            // End depends on the algorithm - we add buffer after finding the end
            expect(range.end).toBeGreaterThanOrEqual(3)
            expect(range.end).toBeLessThanOrEqual(5)
        })

        test('handles scroll to middle', () => {
            // viewport shows rows starting at y=80 (row 2)
            const range = manager.getVisibleRange(rowIds, 80, 80, 0)
            expect(range.start).toBe(2)
            expect(range.end).toBe(4)
        })

        test('clamps to valid range', () => {
            // Try to scroll past the end
            const range = manager.getVisibleRange(rowIds, 200, 80, 2)
            expect(range.start).toBeLessThanOrEqual(rowIds.length)
            expect(range.end).toBeLessThanOrEqual(rowIds.length)
        })
    })

    describe('getViewportRange', () => {
        const rowIds = ['row-0', 'row-1', 'row-2', 'row-3', 'row-4']

        beforeEach(() => {
            // Each row is 40px, so the five rows span y=0 to y=200.
            rowIds.forEach((id) => manager.setHeight(id, 40))
        })

        test('returns an empty range for no rows', () => {
            expect(manager.getViewportRange([], 0, 100)).toEqual({ start: 0, end: 0 })
        })

        test('reports the rows the viewport covers', () => {
            // y=0 to y=80 is rows 0 and 1.
            expect(manager.getViewportRange(rowIds, 0, 80)).toEqual({ start: 0, end: 2 })
        })

        test('adds no buffer, unlike getVisibleRange', () => {
            // Same scroll position that getVisibleRange pads out to row 0.
            expect(manager.getViewportRange(rowIds, 40, 80)).toEqual({ start: 1, end: 3 })
            expect(manager.getVisibleRange(rowIds, 40, 80, 1).start).toBe(0)
        })

        test('counts a partially visible row at either edge', () => {
            // y=20 to y=100 clips row 0 at the top and row 2 at the bottom.
            expect(manager.getViewportRange(rowIds, 20, 80)).toEqual({ start: 0, end: 3 })
        })

        test('covers every row when the viewport is taller than the content', () => {
            expect(manager.getViewportRange(rowIds, 0, 1000)).toEqual({ start: 0, end: 5 })
        })

        test('collapses to an empty range past the end of the content', () => {
            const range = manager.getViewportRange(rowIds, 400, 80)
            expect(range.end).toBe(range.start)
            expect(range.start).toBeLessThanOrEqual(rowIds.length)
        })

        test('collapses rather than inverting for a zero-height viewport', () => {
            const range = manager.getViewportRange(rowIds, 0, 0)
            expect(range.start).toBeLessThanOrEqual(range.end)
            expect(range).toEqual({ start: 0, end: 0 })
        })

        test('treats a negative scroll position as the top', () => {
            expect(manager.getViewportRange(rowIds, -50, 80)).toEqual({ start: 0, end: 2 })
        })

        test('never names a row outside the buffered range that gets mounted', () => {
            // Past the end of the content (200px of rows) the range collapses to
            // empty, which names no rows at all — the subset claim only has to
            // hold while there is something on screen.
            for (const scrollTop of [0, 20, 40, 100, 160, 199, 200, 240, 400]) {
                const viewport = manager.getViewportRange(rowIds, scrollTop, 80)
                const visible = manager.getVisibleRange(rowIds, scrollTop, 80, 2)
                if (viewport.end === viewport.start) {
                    expect(viewport).toEqual({ start: rowIds.length, end: rowIds.length })
                    continue
                }
                expect(viewport.start).toBeGreaterThanOrEqual(visible.start)
                expect(viewport.end).toBeLessThanOrEqual(visible.end)
            }
        })
    })

    describe('getIndexAtOffset', () => {
        const rowIds = ['row-0', 'row-1', 'row-2', 'row-3', 'row-4']

        beforeEach(() => {
            rowIds.forEach((id) => manager.setHeight(id, 40))
        })

        test('returns 0 for offset 0', () => {
            expect(manager.getIndexAtOffset(rowIds, 0)).toBe(0)
        })

        test('returns correct index for middle offset', () => {
            expect(manager.getIndexAtOffset(rowIds, 80)).toBe(2) // 80/40 = 2
        })

        test('returns correct index for offset within row', () => {
            expect(manager.getIndexAtOffset(rowIds, 50)).toBe(1) // within row 1
        })

        test('returns last index for offset past end', () => {
            expect(manager.getIndexAtOffset(rowIds, 300)).toBe(4)
        })
    })

    describe('clear', () => {
        test('removes all measurements', () => {
            manager.setHeight('row-0', 40)
            manager.setHeight('row-1', 50)
            manager.clear()
            expect(manager.size).toBe(0)
            expect(manager.hasMeasurement('row-0')).toBe(false)
            expect(manager.getAverageHeight()).toBe(40) // back to estimated
        })
    })

    describe('remove', () => {
        test('removes specific measurement', () => {
            manager.setHeight('row-0', 40)
            manager.setHeight('row-1', 60)
            manager.remove('row-0')
            expect(manager.size).toBe(1)
            expect(manager.hasMeasurement('row-0')).toBe(false)
            expect(manager.getAverageHeight()).toBe(60) // only row-1 left
        })

        test('handles removing non-existent row', () => {
            manager.setHeight('row-0', 40)
            manager.remove('row-999')
            expect(manager.size).toBe(1)
        })
    })

    describe('setEstimatedRowHeight', () => {
        test('updates estimated height', () => {
            manager.setEstimatedRowHeight(60)
            expect(manager.getAverageHeight()).toBe(60)
        })
    })

    describe('sparse geometry', () => {
        test('reports no compression when the dataset fits under the cap', () => {
            const layout = manager.getSparseLayout(100_000, 0, 500, 10, 16_000_000)
            expect(layout.ratio).toBe(1)
            expect(layout.totalHeight).toBe(100_000 * 40)
        })

        test('reports the compression ratio when the dataset exceeds the cap', () => {
            // 4,000,000 rows at 40px is 160,000,000px against a 16,000,000px cap.
            const layout = manager.getSparseLayout(4_000_000, 0, 500, 10, 16_000_000)
            expect(layout.ratio).toBeGreaterThan(9.9)
            expect(layout.ratio).toBeLessThan(10.1)
        })

        describe('below the height cap', () => {
            const CAP = 16_000_000

            test('maps scroll position 1:1', () => {
                // 40px rows, viewport shows 10 rows starting at row 1,000.
                const layout = manager.getSparseLayout(100_000, 40_000, 400, 2, CAP)
                expect(layout.totalHeight).toBe(100_000 * 40)
                expect(layout.anchorIndex).toBe(1_000)
                expect(layout.anchorOffset).toBe(40_000)
                // The rendered range carries bufferSize on both ends...
                expect(layout.start).toBe(998)
                expect(layout.end).toBe(1_012)
                // ...the viewport range is exactly the 10 rows on screen.
                expect(layout.viewportEnd).toBe(1_010)
            })

            test('does not buffer above the top of the dataset', () => {
                const layout = manager.getSparseLayout(100_000, 0, 400, 5, CAP)
                expect(layout.start).toBe(0)
                expect(layout.anchorIndex).toBe(0)
                expect(layout.anchorOffset).toBe(0)
            })

            test('clamps the end to the dataset', () => {
                const layout = manager.getSparseLayout(10, 0, 4000, 5, CAP)
                expect(layout.end).toBe(10)
            })

            test('handles an empty dataset', () => {
                const layout = manager.getSparseLayout(0, 0, 400, 5, CAP)
                expect(layout).toMatchObject({ totalHeight: 0, start: 0, end: 0, viewportEnd: 0 })
            })

            test('scroll position for an index is its natural offset', () => {
                expect(manager.getSparseScrollTopForIndex(100_000, 1_000, 400, CAP)).toBe(40_000)
            })

            test('the viewport range reaches the last row at maximum scroll', () => {
                const viewport = 400
                const scrollTop = 100_000 * 40 - viewport
                const layout = manager.getSparseLayout(100_000, scrollTop, viewport, 2, CAP)
                // `end` is exclusive, so the final row is included only here.
                expect(layout.viewportEnd).toBe(100_000)
            })
        })

        describe('above the height cap', () => {
            // 4,000,000 rows at 40px is 160,000,000px — 10x over the cap.
            const CAP = 16_000_000
            const TOTAL = 4_000_000

            test('caps the container height', () => {
                const layout = manager.getSparseLayout(TOTAL, 0, 500, 10, CAP)
                expect(layout.totalHeight).toBe(CAP)
            })

            test('reaches the last row at maximum scroll', () => {
                const layout = manager.getSparseLayout(TOTAL, CAP - 500, 500, 10, CAP)
                expect(layout.end).toBe(TOTAL)
                expect(layout.anchorIndex).toBeGreaterThan(TOTAL - 20)
                // Also without the buffer. The compression ratio is irrational
                // here, so `anchorIndex` can land a row early to float error;
                // `rowsBelow` is derived from `anchorOffset`, which slips with
                // it, so the end stays exact.
                expect(layout.viewportEnd).toBe(TOTAL)
            })

            test('the viewport range stays inside the render range while scrolling', () => {
                for (const scrollTop of [0, 1, 5_000, CAP / 2, CAP - 500]) {
                    const layout = manager.getSparseLayout(TOTAL, scrollTop, 500, 10, CAP)
                    expect(layout.anchorIndex).toBeGreaterThanOrEqual(layout.start)
                    expect(layout.viewportEnd).toBeLessThanOrEqual(layout.end)
                    expect(layout.anchorIndex).toBeLessThan(layout.viewportEnd)
                }
            })

            test('reaches the middle of the dataset at half scroll', () => {
                const layout = manager.getSparseLayout(TOTAL, (CAP - 500) / 2, 500, 10, CAP)
                expect(layout.anchorIndex).toBeGreaterThan(1_990_000)
                expect(layout.anchorIndex).toBeLessThan(2_010_000)
            })

            test('anchors rows within the container, never above it', () => {
                for (const scrollTop of [0, 1, 100, 5_000, CAP / 2, CAP - 500]) {
                    const layout = manager.getSparseLayout(TOTAL, scrollTop, 500, 10, CAP)
                    const topSpacer =
                        layout.anchorOffset + (layout.start - layout.anchorIndex) * layout.rowHeight
                    expect(topSpacer).toBeGreaterThanOrEqual(0)
                }
            })

            test('renders enough rows to cover the viewport', () => {
                for (const scrollTop of [0, 100, 5_000, CAP / 2, CAP - 500]) {
                    const layout = manager.getSparseLayout(TOTAL, scrollTop, 500, 0, CAP)
                    const topSpacer =
                        layout.anchorOffset + (layout.start - layout.anchorIndex) * layout.rowHeight
                    const renderedBottom =
                        topSpacer + (layout.end - layout.start) * layout.rowHeight
                    expect(renderedBottom).toBeGreaterThanOrEqual(
                        Math.min(scrollTop + 500, layout.totalHeight)
                    )
                }
            })

            test('scrollToIndex position brings that row into view', () => {
                for (const index of [0, 1_000, 467_000, 2_000_000, TOTAL - 1]) {
                    const scrollTop = manager.getSparseScrollTopForIndex(TOTAL, index, 500, CAP)
                    expect(scrollTop).toBeLessThanOrEqual(CAP - 500)
                    const layout = manager.getSparseLayout(TOTAL, scrollTop, 500, 0, CAP)
                    expect(layout.start).toBeLessThanOrEqual(index)
                    expect(layout.end).toBeGreaterThan(index)
                }
            })

            test('anchors the requested row at the top when there is room below', () => {
                for (const index of [0, 1_000, 467_000, 2_000_000]) {
                    const scrollTop = manager.getSparseScrollTopForIndex(TOTAL, index, 500, CAP)
                    const layout = manager.getSparseLayout(TOTAL, scrollTop, 500, 0, CAP)
                    expect(layout.anchorIndex).toBe(index)
                }
            })

            test('cannot anchor the final rows, which sit at the bottom of the viewport', () => {
                // The last ~12 rows can never top the viewport: nothing follows
                // them to scroll into view. Same as uncompressed geometry.
                const scrollTop = manager.getSparseScrollTopForIndex(TOTAL, TOTAL - 1, 500, CAP)
                const layout = manager.getSparseLayout(TOTAL, scrollTop, 500, 0, CAP)
                expect(layout.anchorIndex).toBeLessThan(TOTAL - 1)
                expect(layout.end).toBe(TOTAL)
            })

            test('never exceeds the cap regardless of scroll position', () => {
                for (const scrollTop of [-100, 0, CAP, CAP * 2]) {
                    const layout = manager.getSparseLayout(TOTAL, scrollTop, 500, 10, CAP)
                    expect(layout.totalHeight).toBeLessThanOrEqual(CAP)
                    expect(layout.start).toBeGreaterThanOrEqual(0)
                    expect(layout.end).toBeLessThanOrEqual(TOTAL)
                }
            })
        })
    })
})
