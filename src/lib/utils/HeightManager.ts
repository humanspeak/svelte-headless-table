/**
 * Sparse scroll layout for the current scroll position.
 * See {@link HeightManager.getSparseLayout}.
 */
export interface SparseLayout {
    /** Height to give the scroll container, capped to stay under browser limits. */
    totalHeight: number
    /** Absolute index of the first row to render (buffer included). */
    start: number
    /** Absolute index one past the last row to render (buffer included). */
    end: number
    /**
     * Absolute index one past the last row intersecting the viewport, buffer
     * excluded. The range opens at {@link SparseLayout.anchorIndex}, which is
     * by definition the first row the viewport touches.
     */
    viewportEnd: number
    /** Absolute index of the row anchoring the top of the viewport. */
    anchorIndex: number
    /** Container-space offset at which `anchorIndex` begins. */
    anchorOffset: number
    /** Uniform row height used for this layout. */
    rowHeight: number
    /**
     * Container pixels to dataset pixels. 1 when the dataset fits under the
     * height cap; greater when the scroll range is compressed.
     */
    ratio: number
}

/**
 * Shared metrics behind the sparse geometry.
 * See {@link HeightManager.getSparseMetrics}.
 */
interface SparseMetrics {
    total: number
    rowHeight: number
    viewport: number
    totalHeight: number
    scrollableNatural: number
    scrollableDisplay: number
    ratio: number
}

/**
 * HeightManager handles row height caching and calculations for virtual scrolling.
 * It maintains a cache of measured row heights and provides methods to calculate
 * scroll positions, visible ranges, and total heights.
 */
export class HeightManager {
    /** Cache of measured row heights by row ID. */
    private heightCache = new Map<string, number>()

    /** Estimated height for unmeasured rows. */
    private estimatedRowHeight: number

    /** Sum of all measured heights. */
    private totalMeasuredHeight = 0

    /** Number of measured rows. */
    private measuredCount = 0

    /**
     * Creates a new HeightManager.
     *
     * @param estimatedRowHeight - Initial estimated height for unmeasured rows.
     */
    constructor(estimatedRowHeight: number = 40) {
        this.estimatedRowHeight = estimatedRowHeight
    }

    /**
     * Set or update the height for a specific row.
     *
     * @param rowId - The unique identifier of the row.
     * @param height - The measured height of the row in pixels.
     * @returns True if the height changed, false otherwise.
     */
    setHeight(rowId: string, height: number): boolean {
        const existing = this.heightCache.get(rowId)

        if (existing === height) {
            return false
        }

        if (existing !== undefined) {
            // Update existing measurement
            this.totalMeasuredHeight -= existing
            this.totalMeasuredHeight += height
        } else {
            // New measurement
            this.totalMeasuredHeight += height
            this.measuredCount++
        }

        this.heightCache.set(rowId, height)
        return true
    }

    /**
     * Get the height for a specific row.
     * Returns the measured height if available, otherwise the estimated height.
     *
     * @param rowId - The unique identifier of the row.
     * @returns The height of the row in pixels.
     */
    getHeight(rowId: string): number {
        return this.heightCache.get(rowId) ?? this.getAverageHeight()
    }

    /**
     * Check if a row has been measured.
     *
     * @param rowId - The unique identifier of the row.
     * @returns True if the row has been measured.
     */
    hasMeasurement(rowId: string): boolean {
        return this.heightCache.has(rowId)
    }

    /**
     * Get the average height of measured rows.
     * Falls back to the estimated height if no rows have been measured.
     *
     * @returns The average row height in pixels.
     */
    getAverageHeight(): number {
        if (this.measuredCount === 0) {
            return this.estimatedRowHeight
        }
        return this.totalMeasuredHeight / this.measuredCount
    }

    /**
     * Calculate the total height for a given number of rows.
     *
     * @param rowIds - Array of row IDs in order.
     * @returns The total height in pixels.
     */
    getTotalHeight(rowIds: string[]): number {
        const avgHeight = this.getAverageHeight()
        let total = 0

        for (const rowId of rowIds) {
            total += this.heightCache.get(rowId) ?? avgHeight
        }

        return total
    }

    /**
     * Calculate the offset (top position) for a given row index.
     *
     * @param rowIds - Array of row IDs in order.
     * @param index - The index of the target row.
     * @returns The offset from the top in pixels.
     */
    getOffsetForIndex(rowIds: string[], index: number): number {
        const avgHeight = this.getAverageHeight()
        let offset = 0

        for (let i = 0; i < index && i < rowIds.length; i++) {
            offset += this.heightCache.get(rowIds[i]) ?? avgHeight
        }

        return offset
    }

    /**
     * Calculate which rows are visible given a scroll position and viewport height.
     *
     * @param rowIds - Array of row IDs in order.
     * @param scrollTop - Current scroll position.
     * @param viewportHeight - Height of the visible area.
     * @param bufferSize - Number of extra rows to render above/below.
     * @returns Object with start and end indices of visible rows.
     */
    getVisibleRange(
        rowIds: string[],
        scrollTop: number,
        viewportHeight: number,
        bufferSize: number
    ): { start: number; end: number } {
        if (rowIds.length === 0) {
            return { start: 0, end: 0 }
        }

        const avgHeight = this.getAverageHeight()
        let offset = 0
        let start = 0
        let end = rowIds.length

        // Find start index (first row that's at least partially visible)
        for (let i = 0; i < rowIds.length; i++) {
            const height = this.heightCache.get(rowIds[i]) ?? avgHeight
            if (offset + height > scrollTop) {
                start = Math.max(0, i - bufferSize)
                break
            }
            offset += height
        }

        // Find end index (first row that's completely below the viewport)
        const bottomEdge = scrollTop + viewportHeight
        for (let i = start; i < rowIds.length; i++) {
            const height = this.heightCache.get(rowIds[i]) ?? avgHeight
            if (offset >= bottomEdge) {
                end = Math.min(rowIds.length, i + bufferSize)
                break
            }
            offset += height
        }

        // If we reached the end without finding bottomEdge, show all remaining rows
        if (end === rowIds.length) {
            end = rowIds.length
        }

        return { start, end }
    }

    /**
     * Calculate which rows actually intersect the viewport, with no render
     * buffer.
     *
     * {@link getVisibleRange} pads by `bufferSize` on both ends because it
     * decides what gets mounted. This answers the different question of what
     * the user is looking at, which is what a "rows N–M of T" readout wants.
     *
     * @param rowIds - Array of row IDs in order.
     * @param scrollTop - Current scroll position.
     * @param viewportHeight - Height of the visible area.
     * @returns Object with start and end (exclusive) indices of visible rows.
     */
    getViewportRange(
        rowIds: string[],
        scrollTop: number,
        viewportHeight: number
    ): { start: number; end: number } {
        const avgHeight = this.getAverageHeight()
        const topEdge = Math.max(0, scrollTop)
        const bottomEdge = topEdge + Math.max(0, viewportHeight)

        // Counted rather than indexed: `start` is how many rows sit entirely
        // above the viewport, `end` how many begin before its bottom edge. That
        // keeps `start <= end` true by construction, and scrolled past the
        // content both land on `rowIds.length`, which reads as "0 rows" rather
        // than naming a row that is not on screen.
        let start = 0
        let end = 0
        let offset = 0

        for (const rowId of rowIds) {
            if (offset >= bottomEdge) {
                break
            }
            const height = this.heightCache.get(rowId) ?? avgHeight
            if (offset + height <= topEdge) {
                start++
            }
            end++
            offset += height
        }

        return { start, end }
    }

    /**
     * Shared metrics behind the sparse geometry.
     *
     * Sparse mode windows over a dataset whose rows are mostly not resident in
     * memory, so per-row measurements are unavailable for all but the current
     * window. Geometry therefore falls back to a uniform row height — the
     * running average of whatever has been measured so far.
     *
     * Browsers also cap how tall an element may be (~16.7M px in Chrome), which
     * at a typical row height puts a hard ceiling of a few hundred thousand rows
     * on a naively-sized scroll container — rows past it become unreachable by
     * dragging *and* by `scrollTo`, which the browser clamps. So the container
     * is sized to at most `maxScrollHeight` and `ratio` maps container pixels
     * onto dataset pixels. When the dataset fits under the cap, `ratio` is 1 and
     * the mapping is the identity.
     *
     * Both {@link getSparseLayout} and {@link getSparseScrollTopForIndex} derive
     * from this, so the forward and inverse mappings cannot drift apart.
     */
    private getSparseMetrics(
        totalRows: number,
        viewportHeight: number,
        maxScrollHeight: number
    ): SparseMetrics {
        const total = Math.max(0, totalRows)
        const rowHeight = this.getAverageHeight()
        const viewport = Math.max(0, viewportHeight)
        const naturalHeight = total * rowHeight
        // Never shrink below the viewport, or there would be nothing to scroll.
        const totalHeight = Math.min(naturalHeight, Math.max(viewport, maxScrollHeight))
        const scrollableNatural = Math.max(0, naturalHeight - viewport)
        const scrollableDisplay = Math.max(0, totalHeight - viewport)

        return {
            total,
            rowHeight,
            viewport,
            totalHeight,
            scrollableNatural,
            scrollableDisplay,
            ratio: scrollableDisplay > 0 ? scrollableNatural / scrollableDisplay : 1
        }
    }

    /**
     * Compute the sparse scroll layout for a given scroll position.
     *
     * Rows render at their natural height: the compression described in
     * {@link getSparseMetrics} only decides which row anchors the top of the
     * viewport and where that anchor sits, so rows around it lay out 1:1 with
     * no drift.
     *
     * @param totalRows - Total number of rows in the dataset.
     * @param scrollTop - Current scroll position, in container pixels.
     * @param viewportHeight - Height of the visible area.
     * @param bufferSize - Number of extra rows to include above/below.
     * @param maxScrollHeight - Largest container height to produce.
     * @returns The container height, the absolute row range to render, and the
     *   anchor used to position it.
     */
    getSparseLayout(
        totalRows: number,
        scrollTop: number,
        viewportHeight: number,
        bufferSize: number,
        maxScrollHeight: number
    ): SparseLayout {
        const { total, rowHeight, viewport, totalHeight, scrollableDisplay, ratio } =
            this.getSparseMetrics(totalRows, viewportHeight, maxScrollHeight)

        if (total === 0 || rowHeight <= 0) {
            return {
                totalHeight: total === 0 ? 0 : Math.max(0, maxScrollHeight),
                start: 0,
                end: total,
                viewportEnd: total,
                anchorIndex: 0,
                anchorOffset: 0,
                rowHeight,
                ratio
            }
        }

        const clampedScrollTop = Math.min(Math.max(0, scrollTop), scrollableDisplay)
        const naturalTop = clampedScrollTop * ratio

        // The row occupying the top of the viewport, and where it begins in
        // container coordinates.
        const anchorIndex = Math.min(total - 1, Math.floor(naturalTop / rowHeight))
        // Compression can make the offset into the anchor row exceed scrollTop
        // itself within the first row's worth of scrolling, which would place
        // the row above the top of the container. Pin it to the top instead.
        const anchorOffset = Math.max(0, clampedScrollTop - (naturalTop - anchorIndex * rowHeight))

        // Only buffer above by as much as there is room for, or the top spacer
        // would have to go negative and the rendered block would slip.
        const rowsAbove = Math.min(bufferSize, anchorIndex, Math.floor(anchorOffset / rowHeight))
        const rowsBelow = Math.ceil(
            Math.max(0, clampedScrollTop + viewport - anchorOffset) / rowHeight
        )

        return {
            totalHeight,
            start: anchorIndex - rowsAbove,
            end: Math.min(total, anchorIndex + rowsBelow + bufferSize),
            // `rowsBelow` is how many rows it takes to reach the viewport's
            // bottom edge from the anchor, so dropping the buffer term from
            // `end` above leaves the unbuffered range.
            viewportEnd: Math.min(total, anchorIndex + rowsBelow),
            anchorIndex,
            anchorOffset,
            rowHeight,
            ratio
        }
    }

    /**
     * Map a container scroll position onto dataset (natural) coordinates.
     *
     * Above the height cap the container is smaller than the dataset it
     * represents, so container pixels and dataset pixels are different units.
     * Alignment maths must pick one and stay in it.
     *
     * @param totalRows - Total number of rows in the dataset.
     * @param scrollTop - Scroll position in container pixels.
     * @param viewportHeight - Height of the visible area.
     * @param maxScrollHeight - Largest container height to produce.
     * @returns The equivalent offset in dataset pixels.
     */
    getSparseNaturalScrollTop(
        totalRows: number,
        scrollTop: number,
        viewportHeight: number,
        maxScrollHeight: number
    ): number {
        const { scrollableDisplay, ratio } = this.getSparseMetrics(
            totalRows,
            viewportHeight,
            maxScrollHeight
        )
        return Math.min(Math.max(0, scrollTop), scrollableDisplay) * ratio
    }

    /**
     * Map a dataset (natural) offset onto a container scroll position — the
     * inverse of {@link getSparseNaturalScrollTop}.
     *
     * @param totalRows - Total number of rows in the dataset.
     * @param naturalOffset - Target offset in dataset pixels.
     * @param viewportHeight - Height of the visible area.
     * @param maxScrollHeight - Largest container height to produce.
     * @returns The scroll position in container pixels.
     */
    getSparseScrollTopForOffset(
        totalRows: number,
        naturalOffset: number,
        viewportHeight: number,
        maxScrollHeight: number
    ): number {
        const { total, rowHeight, scrollableNatural, scrollableDisplay, ratio } =
            this.getSparseMetrics(totalRows, viewportHeight, maxScrollHeight)

        if (total === 0 || rowHeight <= 0 || scrollableNatural <= 0) {
            return 0
        }

        return Math.min(scrollableDisplay, Math.max(0, naturalOffset) / ratio)
    }

    /**
     * Container scroll position that puts an absolute row index at the top of
     * the viewport.
     *
     * @param totalRows - Total number of rows in the dataset.
     * @param index - Absolute index of the target row.
     * @param viewportHeight - Height of the visible area.
     * @param maxScrollHeight - Largest container height to produce.
     * @returns The scroll position in container pixels.
     */
    getSparseScrollTopForIndex(
        totalRows: number,
        index: number,
        viewportHeight: number,
        maxScrollHeight: number
    ): number {
        const { rowHeight } = this.getSparseMetrics(totalRows, viewportHeight, maxScrollHeight)
        return this.getSparseScrollTopForOffset(
            totalRows,
            Math.max(0, index) * rowHeight,
            viewportHeight,
            maxScrollHeight
        )
    }

    /**
     * Find the row index at a given scroll position.
     *
     * @param rowIds - Array of row IDs in order.
     * @param scrollTop - The scroll position to find.
     * @returns The index of the row at that position.
     */
    getIndexAtOffset(rowIds: string[], scrollTop: number): number {
        const avgHeight = this.getAverageHeight()
        let offset = 0

        for (let i = 0; i < rowIds.length; i++) {
            const height = this.heightCache.get(rowIds[i]) ?? avgHeight
            if (offset + height > scrollTop) {
                return i
            }
            offset += height
        }

        return Math.max(0, rowIds.length - 1)
    }

    /**
     * Clear all cached heights.
     */
    clear(): void {
        this.heightCache.clear()
        this.totalMeasuredHeight = 0
        this.measuredCount = 0
    }

    /**
     * Remove a specific row from the cache.
     *
     * @param rowId - The unique identifier of the row to remove.
     */
    remove(rowId: string): void {
        const height = this.heightCache.get(rowId)
        if (height !== undefined) {
            this.totalMeasuredHeight -= height
            this.measuredCount--
            this.heightCache.delete(rowId)
        }
    }

    /**
     * Get the number of measured rows.
     */
    get size(): number {
        return this.measuredCount
    }

    /**
     * Update the estimated row height.
     *
     * @param height - New estimated height in pixels.
     */
    setEstimatedRowHeight(height: number): void {
        this.estimatedRowHeight = height
    }
}
