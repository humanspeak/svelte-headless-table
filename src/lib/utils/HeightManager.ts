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
