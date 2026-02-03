import type { Action } from 'svelte/action'
import type { Readable, Writable } from 'svelte/store'

/**
 * Configuration options for the addVirtualScroll plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface VirtualScrollConfig<Item> {
    /**
     * Callback fired when more data should be loaded (infinite scroll).
     * Return a promise to indicate when loading is complete.
     */
    onLoadMore?: () => void | Promise<void>

    /**
     * Whether there is more data available to load.
     * Can be a boolean or a Writable store.
     */
    hasMore?: Writable<boolean> | boolean

    /**
     * Number of pixels from the bottom to trigger onLoadMore.
     * @default 200
     */
    loadMoreThreshold?: number

    /**
     * Estimated height of each row in pixels.
     * Used for initial calculations before rows are measured.
     * @default 40
     */
    estimatedRowHeight?: number

    /**
     * Number of rows to render above and below the visible area.
     * Higher values reduce flicker during fast scrolling but render more DOM nodes.
     * @default 10
     */
    bufferSize?: number

    /**
     * Optional function to get the height of a specific row.
     * If provided, enables variable row heights.
     */
    getRowHeight?: (_item: Item) => number

    /**
     * Enable debug mode to show virtualization info in console.
     * @default false
     */
    debug?: boolean
}

/**
 * Visible range of rows.
 */
export interface VisibleRange {
    /** Index of the first visible row (0-based). */
    start: number
    /** Index of the last visible row (exclusive). */
    end: number
}

/**
 * Options for scrollToIndex method.
 */
export interface ScrollToIndexOptions {
    /** Alignment of the target row within the viewport. */
    align?: 'start' | 'center' | 'end' | 'auto'
    /** Scroll behavior. */
    behavior?: ScrollBehavior
}

/**
 * State exposed by the addVirtualScroll plugin.
 *
 * @template Item - The type of data items in the table.
 */
// trunk-ignore(eslint/@typescript-eslint/no-unused-vars)
// trunk-ignore(eslint/no-unused-vars)
export interface VirtualScrollState<Item> {
    /**
     * Current scroll position of the container.
     */
    scrollTop: Readable<number>

    /**
     * Height of the scroll container viewport.
     */
    viewportHeight: Readable<number>

    /**
     * Range of currently visible row indices.
     */
    visibleRange: Readable<VisibleRange>

    /**
     * Total height of all rows (for scroll container sizing).
     */
    totalHeight: Readable<number>

    /**
     * Height of the top spacer element.
     */
    topSpacerHeight: Readable<number>

    /**
     * Height of the bottom spacer element.
     */
    bottomSpacerHeight: Readable<number>

    /**
     * Whether more data is currently being loaded.
     */
    isLoading: Readable<boolean>

    /**
     * Whether there is more data available to load.
     */
    hasMore: Readable<boolean>

    /**
     * Svelte action to attach to the scroll container.
     * Handles scroll event listeners and viewport tracking.
     */
    virtualScroll: Action<HTMLElement>

    /**
     * Scroll to a specific row index.
     */
    scrollToIndex: (_index: number, _options?: ScrollToIndexOptions) => void

    /**
     * Notify the plugin that a row has been measured.
     * Called automatically when rows are rendered.
     * @internal
     */
    measureRow: (_rowId: string, _height: number) => void

    /**
     * Svelte action to attach to each table row for automatic height measurement.
     * Usage: <tr use:measureRowAction={row.id}>
     */
    measureRowAction: Action<HTMLElement, string>

    /**
     * Total number of rows (before virtualization).
     */
    totalRows: Readable<number>

    /**
     * Number of rows currently rendered in the DOM.
     */
    renderedRows: Readable<number>
}

/**
 * Props added to body rows by the virtual scroll plugin.
 */
export interface VirtualScrollRowProps {
    /**
     * Index of this row in the full dataset.
     */
    virtualIndex: number

    /**
     * Whether this row is currently in the visible range.
     */
    isVirtual: boolean
}
