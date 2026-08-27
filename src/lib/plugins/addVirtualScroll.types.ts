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
     *
     * Append-only. Pair it with `data`-driven mode, not with `totalRows`:
     * in sparse mode `loadMoreThreshold` would be measured against the
     * compressed container height and mean something other than documented.
     * Use `onRangeChange` there instead.
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
     * Total number of rows in the full dataset, independent of how many are
     * currently loaded.
     *
     * Supplying this opts into **sparse mode**: the plugin sizes the scroll
     * container and computes visible ranges against the full dataset, while the
     * table's `data` store holds only the resident window. Use it for
     * server-paged datasets that are too large to materialize.
     *
     * In sparse mode all indices — `visibleRange`, `scrollToIndex`,
     * `virtualIndex` — are absolute indices into the full dataset.
     *
     * Sparse geometry assumes a uniform row height (the running average of
     * measured rows), since rows outside the resident window cannot be
     * measured — per-row heights from `getRowHeight` feed that average but do
     * not position individual rows.
     */
    totalRows?: Readable<number> | number

    /**
     * Absolute index of the first row held in the table's `data` store.
     *
     * Sparse mode only. Keep this in sync with `data` whenever the resident
     * window moves — the plugin uses it to map absolute indices onto the loaded
     * rows.
     *
     * @default 0
     */
    dataOffset?: Readable<number> | number

    /**
     * Fired whenever the visible range changes, so a caller can fetch the pages
     * intersecting it and evict the ones that have scrolled away.
     *
     * In sparse mode the range is in absolute dataset indices. Invoked on a
     * microtask, so it is safe to update stores from within it.
     *
     * The range moves faster than a network round trip, so an async handler
     * must not assume it is still current when its fetch resolves — see
     * {@link RangeChangeContext.signal}.
     */
    onRangeChange?: (_range: VisibleRange, _context: RangeChangeContext) => void

    /**
     * Largest height, in pixels, to give the scroll container.
     *
     * Sparse mode only. Browsers cap element height — ~16,777,216px in Chrome
     * and Safari — and a container sized past the cap makes the tail of the
     * dataset unreachable by dragging *and* by `scrollToIndex`, which the
     * browser clamps. When `totalRows × rowHeight` exceeds this value the
     * scroll range is compressed onto it instead.
     *
     * Rows still render at natural height and lay out 1:1 around the viewport;
     * the compression only affects how far a given amount of scrolling travels,
     * so a wheel notch covers proportionally more rows. Datasets that fit under
     * the cap are unaffected.
     *
     * @default 16_000_000
     */
    maxScrollHeight?: number
}

/**
 * Second argument to
 * {@link VirtualScrollConfig.onRangeChange}.
 */
export interface RangeChangeContext {
    /**
     * Aborted as soon as a newer range supersedes this one.
     *
     * Rapid scrolling starts more range changes than can be served in order, so
     * without this a slow early response can land after a fast later one and
     * replace the current window with rows for a range the user has left. Pass
     * it to `fetch` to cancel the request, and re-check `signal.aborted` before
     * writing to `data` / `dataOffset`.
     */
    signal: AbortSignal
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
     *
     * Padded by `bufferSize` on both ends: this is what the plugin mounts, not
     * what the user sees. For a "rows N–M of T" readout use
     * {@link VirtualScrollState.viewportRange}.
     */
    visibleRange: Readable<VisibleRange>

    /**
     * Rows actually intersecting the viewport, with no render buffer.
     *
     * `visibleRange` is padded by `bufferSize` because it decides what gets
     * mounted; this answers the different question of what the user is looking
     * at — the range a footer tally, a scroll-progress readout or a "jump to
     * row" indicator should report.
     *
     * In sparse mode these are absolute indices into the full dataset, and the
     * compression the plugin applies above `maxScrollHeight` is already undone,
     * so consumers never re-derive that mapping themselves.
     *
     * Anything the caller renders above the rows — an in-flow `<thead>`, a
     * caption, a toolbar — shifts where row 0 begins inside the scroll
     * container. The plugin measures that offset from the first rendered row
     * and accounts for it, so this range tracks the rows on screen rather than
     * the raw scroll position.
     *
     * A `position: sticky` header is the one case it cannot fully cover: it
     * keeps painting over the top of the viewport after scrolling past, so the
     * first row of this range may sit behind it. Render the header outside the
     * scroll container if the readout has to be exact to the pixel.
     *
     * `end` is exclusive, so a range of `{ start: 0, end: 10 }` means rows 1–10
     * of a 1-based readout.
     */
    viewportRange: Readable<VisibleRange>

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
     * In sparse mode this reflects the configured dataset total rather than the
     * number of rows currently loaded.
     */
    totalRows: Readable<number>

    /**
     * Number of rows currently rendered in the DOM.
     */
    renderedRows: Readable<number>

    /**
     * Absolute index of the first row held in the table's `data` store.
     * Always `0` outside sparse mode.
     */
    dataOffset: Readable<number>
}

/**
 * Props added to body rows by the virtual scroll plugin.
 */
export interface VirtualScrollRowProps {
    /**
     * Index of this row in the full dataset.
     * In sparse mode this is the absolute index, i.e. offset by `dataOffset`.
     */
    virtualIndex: number

    /**
     * Whether this row is currently in the visible range.
     */
    isVirtual: boolean
}
