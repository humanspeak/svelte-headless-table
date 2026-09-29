import type { Action } from 'svelte/action'
import type { Box, Getter, ReadonlyBox } from '../reactivity.svelte.js'

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
    onLoadMore?: (() => void | Promise<void>) | undefined

    /**
     * Whether there is more data available to load.
     * Can be a boolean or a {@link Box}; a box is adopted, so writing
     * `hasMore.current = false` stops further `onLoadMore` calls.
     */
    hasMore?: Box<boolean> | boolean | undefined

    /**
     * Number of pixels from the bottom to trigger onLoadMore.
     * @default 200
     */
    loadMoreThreshold?: number | undefined

    /**
     * Estimated height of each row in pixels.
     * Used for initial calculations before rows are measured.
     * @default 40
     */
    estimatedRowHeight?: number | undefined

    /**
     * Number of rows to render above and below the visible area.
     * Higher values reduce flicker during fast scrolling but render more DOM nodes.
     * @default 10
     */
    bufferSize?: number | undefined

    /**
     * Optional function to get the height of a specific row.
     * If provided, enables variable row heights.
     */
    getRowHeight?: ((_item: Item) => number) | undefined

    /**
     * Total number of rows in the full dataset, independent of how many are
     * currently loaded.
     *
     * Supplying this opts into **sparse mode**: the plugin sizes the scroll
     * container and computes visible ranges against the full dataset, while the
     * table's `data` holds only the resident window. Use it for
     * server-paged datasets that are too large to materialize.
     *
     * In sparse mode all indices — `visibleRange`, `scrollToIndex`,
     * `virtualIndex` — are absolute indices into the full dataset.
     *
     * Sparse geometry assumes a uniform row height (the running average of
     * measured rows), since rows outside the resident window cannot be
     * measured — per-row heights from `getRowHeight` feed that average but do
     * not position individual rows.
     *
     * A number, or a getter / {@link ReadonlyBox} to make it reactive. Svelte
     * stores are not accepted; wrap one with `fromStore` and pass the result.
     */
    totalRows?: number | Getter<number> | ReadonlyBox<number> | undefined

    /**
     * Absolute index of the first row held in the table's `data`.
     *
     * Sparse mode only. Keep this in sync with `data` whenever the resident
     * window moves — the plugin uses it to map absolute indices onto the loaded
     * rows. A number, or a getter / {@link ReadonlyBox} to make it reactive.
     *
     * @default 0
     */
    dataOffset?: number | Getter<number> | ReadonlyBox<number> | undefined

    /**
     * Fired whenever the visible range changes, so a caller can fetch the pages
     * intersecting it and evict the ones that have scrolled away.
     *
     * In sparse mode the range is in absolute dataset indices. Invoked on a
     * microtask, so it is safe to update state from within it. Reported while
     * the {@link VirtualScrollState.virtualScroll} action is mounted.
     *
     * The range moves faster than a network round trip, so an async handler
     * must not assume it is still current when its fetch resolves — see
     * {@link RangeChangeContext.signal}.
     */
    onRangeChange?: ((_range: VisibleRange, _context: RangeChangeContext) => void) | undefined

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
    maxScrollHeight?: number | undefined
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
    align?: 'start' | 'center' | 'end' | 'auto' | undefined
    /** Scroll behavior. */
    behavior?: ScrollBehavior | undefined
}

/**
 * State exposed by the addVirtualScroll plugin.
 *
 * @template _Item - The type of data items (unused; kept so the state type mirrors the config).
 */
export interface VirtualScrollState<_Item> {
    /**
     * Current scroll position of the container.
     */
    scrollTop: ReadonlyBox<number>

    /**
     * Height of the scroll container viewport.
     */
    viewportHeight: ReadonlyBox<number>

    /**
     * Range of currently visible row indices.
     *
     * Padded by `bufferSize` on both ends: this is what the plugin mounts, not
     * what the user sees. For a "rows N–M of T" readout use
     * {@link VirtualScrollState.viewportRange}.
     */
    visibleRange: ReadonlyBox<VisibleRange>

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
     * A `position: sticky` header keeps its in-flow space but goes on covering
     * the top of the viewport, hiding rows underneath it. Attach
     * {@link VirtualScrollState.measureHeaderAction} to it and those rows are
     * excluded from this range too.
     *
     * `end` is exclusive, so a range of `{ start: 0, end: 10 }` means rows 1–10
     * of a 1-based readout.
     */
    viewportRange: ReadonlyBox<VisibleRange>

    /**
     * Total height of all rows (for scroll container sizing).
     */
    totalHeight: ReadonlyBox<number>

    /**
     * Height of the top spacer element.
     */
    topSpacerHeight: ReadonlyBox<number>

    /**
     * Height of the bottom spacer element.
     */
    bottomSpacerHeight: ReadonlyBox<number>

    /**
     * Whether more data is currently being loaded.
     */
    isLoading: ReadonlyBox<boolean>

    /**
     * Whether there is more data available to load.
     */
    hasMore: ReadonlyBox<boolean>

    /**
     * Svelte action to attach to the scroll container.
     * Handles scroll event listeners and viewport tracking, and reports range
     * changes to `onRangeChange` while it is mounted.
     */
    virtualScroll: Action

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
     * Svelte action for content that paints over the top of the viewport —
     * in practice a `position: sticky` `<thead>`.
     *
     * Usage: `<thead class="sticky top-0" use:measureHeaderAction>`
     *
     * A sticky header keeps the space it occupies in the document, so the
     * plugin already knows where the rows begin, but it also goes on covering
     * the top of the viewport at every scroll position. Without this the rows
     * underneath it are still counted as visible, and
     * {@link VirtualScrollState.viewportRange} names rows the user cannot see.
     *
     * Only needed for content that overlays the rows. A header that scrolls
     * away with them is measured automatically; attaching this to one is
     * harmless, since it reports no overlap once out of view.
     */
    measureHeaderAction: Action

    /**
     * Total number of rows (before virtualization).
     * In sparse mode this reflects the configured dataset total rather than the
     * number of rows currently loaded.
     */
    totalRows: ReadonlyBox<number>

    /**
     * Number of rows currently rendered in the DOM.
     */
    renderedRows: ReadonlyBox<number>

    /**
     * Absolute index of the first row held in the table's `data`.
     * Always `0` outside sparse mode.
     */
    dataOffset: ReadonlyBox<number>
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
