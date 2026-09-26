import type { ScrollToIndexOptions } from '../plugins/addVirtualScroll.types.js'

/**
 * Resolves the target scroll offset (in row space) for a `scrollToIndex`
 * alignment, or `undefined` when `align: 'auto'` finds the row already
 * fully visible.
 */
export const resolveAlignedOffset = (
    align: NonNullable<ScrollToIndexOptions['align']>,
    rowStart: number,
    rowHeight: number,
    viewportHeight: number,
    currentTop: number
): number | undefined => {
    switch (align) {
        case 'center':
            return rowStart - (viewportHeight - rowHeight) / 2
        case 'end':
            return rowStart - viewportHeight + rowHeight
        case 'auto': {
            const rowEnd = rowStart + rowHeight
            if (rowStart >= currentTop && rowEnd <= currentTop + viewportHeight) {
                return undefined
            }
            return rowStart < currentTop ? rowStart : rowEnd - viewportHeight
        }
        case 'start':
        default:
            return rowStart
    }
}
