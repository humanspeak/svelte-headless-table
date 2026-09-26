import type { Action } from 'svelte/action'
import { derived, get, readable, writable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { HeightManager } from '../utils/HeightManager.js'
import { resolveAlignedOffset } from '../utils/scrollAlign.js'
import { isReadable, isWritable } from '../utils/store.js'
import type {
    RangeChangeContext,
    ScrollToIndexOptions,
    VirtualScrollConfig,
    VirtualScrollRowProps,
    VirtualScrollState,
    VisibleRange
} from './addVirtualScroll.types.js'

export type {
    RangeChangeContext,
    ScrollToIndexOptions,
    VirtualScrollConfig,
    VirtualScrollRowProps,
    VirtualScrollState,
    VisibleRange
}

/**
 * Default configuration values for virtual scroll.
 */
const DEFAULTS = {
    estimatedRowHeight: 40,
    bufferSize: 10,
    loadMoreThreshold: 200,
    /**
     * Browsers cap element height — ~16,777,216px in Chrome and Safari. Sizing
     * a sparse container beyond that silently makes the tail of the dataset
     * unreachable, so stay comfortably under it and compress instead.
     */
    maxScrollHeight: 16_000_000
} as const

/**
 * Normalize a `Readable<T> | T | undefined` config value into a store.
 */
const toStore = <T>(value: Readable<T> | T | undefined, fallback: T): Readable<T> =>
    isReadable<T>(value) ? value : readable(value ?? fallback)

/**
 * Creates a virtual scroll plugin that enables virtualized table rendering.
 * Only renders rows that are visible in the viewport plus a buffer, dramatically
 * improving performance for large datasets.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options for virtual scrolling.
 * @returns A TablePlugin that provides virtualization functionality.
 *
 * @example
 * ```typescript
 * const table = createTable(data, {
 *   virtualScroll: addVirtualScroll({
 *     estimatedRowHeight: 48,
 *     bufferSize: 5,
 *     onLoadMore: async () => {
 *       const more = await fetchMoreItems()
 *       data.update(d => [...d, ...more])
 *     },
 *     hasMore: hasMoreStore
 *   })
 * })
 *
 * const {
 *   virtualScroll,
 *   topSpacerHeight,
 *   bottomSpacerHeight,
 *   visibleRange
 * } = table.pluginStates.virtualScroll
 * ```
 *
 * @example Sparse mode — window over a server-paged dataset
 * ```typescript
 * // `data` holds only the resident window; `offset` is where it starts.
 * const table = createTable(data, {
 *   virtualScroll: addVirtualScroll({
 *     estimatedRowHeight: 32,
 *     totalRows: rowCount,   // Readable<number> over the whole dataset
 *     dataOffset: offset,    // absolute index of data[0]
 *     onRangeChange: async ({ start, end }) => {
 *       const window = await fetchWindow(start, end)  // fetches + evicts
 *       offset.set(window.start)
 *       data.set(window.items)
 *     }
 *   })
 * })
 * ```
 *
 * @remarks
 * One result drives one rendered table. Scroll position, viewport height and
 * the measured-height cache live in this factory's closure so they survive a
 * view model rebuild — which is also what makes them shared. Call
 * `addVirtualScroll()` once per table rather than hoisting a single result to
 * module scope; doing the latter warns in the console.
 *
 * To scroll two views of the same data independently, build two tables over
 * the same `data` store, each with its own `addVirtualScroll()`. Two view
 * models built from a *single* table share one scroll position: a rebuild and
 * a second concurrent view are indistinguishable from inside the plugin, since
 * both are just another `createViewModel` call while a container is mounted.
 */
export const addVirtualScroll = <Item>({
    onLoadMore,
    hasMore: hasMoreConfig,
    loadMoreThreshold = DEFAULTS.loadMoreThreshold,
    estimatedRowHeight = DEFAULTS.estimatedRowHeight,
    bufferSize = DEFAULTS.bufferSize,
    getRowHeight,
    totalRows: totalRowsConfig,
    dataOffset: dataOffsetConfig,
    onRangeChange,
    maxScrollHeight = DEFAULTS.maxScrollHeight
}: VirtualScrollConfig<Item> = {}): TablePlugin<
    Item,
    VirtualScrollState<Item>,
    Record<string, never>,
    NewTablePropSet<{
        'tbody.tr': VirtualScrollRowProps
    }>
> => {
    // Height management
    const heightManager = new HeightManager(estimatedRowHeight)

    // Scroll state
    const scrollTop = writable(0)
    const viewportHeight = writable(0)

    // Row IDs array (set by derivePageRows, used for calculations)
    // This is a simple array, not derived from rows to avoid circular deps
    const rowIds = writable<string[]>([])

    // Sparse mode: the caller owns fetching and eviction, the plugin owns
    // geometry. `data` holds only the resident window; `datasetRows` is the
    // size of the full dataset and `dataOffset` is the absolute index of
    // the first resident row.
    const isSparse = totalRowsConfig !== undefined
    const datasetRows = toStore(totalRowsConfig, 0)
    const dataOffset = toStore(dataOffsetConfig, 0)

    // Loading state
    const isLoading = writable(false)
    const hasMoreStore: Writable<boolean> = isWritable<boolean>(hasMoreConfig)
        ? hasMoreConfig
        : writable(hasMoreConfig ?? false)

    // Track whether we've already triggered a load to prevent duplicates
    let loadMorePending = false

    // The container the plugin currently drives — the most recently mounted.
    let scrollContainer: HTMLElement | null = null

    // Every container currently bound. Normally one. Two appear transiently
    // whenever an out-transition defers the outgoing node's teardown past its
    // replacement's mount, which is why teardown checks ownership instead of
    // assuming it.
    const attachedNodes = new Set<HTMLElement>()

    // Cache for row lookup (set by derivePageRows)
    let allRowsCache: BodyRow<Item>[] = []

    // Position of each row within the current data window, by row ID. Kept
    // as a store so `virtualIndex` stays reactive: rows are keyed by ID in
    // the template, so a row reused across two different windows would
    // otherwise keep the index it was first rendered with.
    const rowIndexById = writable(new Map<string, number>())

    // Distance from the container's scroll origin to where row 0 begins.
    // The documented markup puts `<thead>` inside the scroll container, so it
    // is normally the header's height: without it every range is reported
    // that far down the dataset, and a buffer smaller than the header leaves
    // a blank strip at the top of the viewport. Measured rather than
    // configured, so it also covers a caption, a toolbar, or anything else a
    // caller puts above the rows.
    const contentOffset = writable(0)

    // Id of the first row currently rendered. Measuring that row is what
    // reveals the offset, since it sits directly after the top spacer.
    let firstRenderedRowId: string | undefined

    // How much of the viewport's top edge is currently painted over by the
    // header. Zero unless `measureHeaderAction` is attached: an in-flow header
    // needs no such correction, because it scrolls away and `contentOffset`
    // already accounts for the space it occupies.
    const headerOverlap = writable(0)

    // The element the caller declared as overlaying the rows, if any.
    let headerNode: HTMLElement | null = null

    /**
     * The band of row space the container is showing.
     *
     * Two different things sit between the container's scroll origin and the
     * first row the user can see, and they are not the same measurement:
     *
     * `contentOffset` is layout — how far down the *document* the rows begin,
     * because a header occupies space in the flow. It shifts the whole band.
     *
     * `headerOverlap` is paint — how much of the *viewport* the header is
     * covering right now. A `position: sticky` header keeps its in-flow space
     * (so `contentOffset` is unchanged) yet goes on hiding the top of the
     * viewport at every scroll position, so it eats into the band from the top
     * only. An in-flow header reports zero here once it has scrolled away,
     * which is exactly right.
     */
    const rowViewport = derived(
        [scrollTop, viewportHeight, contentOffset, headerOverlap],
        ([$scrollTop, $viewportHeight, $contentOffset, $headerOverlap]) => {
            const top = $scrollTop + $headerOverlap - $contentOffset
            const bottom = $scrollTop + $viewportHeight - $contentOffset
            // `getViewportRange` floors the top at 0, so measure the height
            // from wherever the band actually starts.
            return { top, height: Math.max(0, bottom - Math.max(0, top)) }
        }
    )

    /**
     * Re-read how far the header currently reaches into the viewport.
     *
     * Cheap enough for the scroll path: one rect per element, and only when a
     * header has been declared. Sticky elements move relative to the container
     * on every scroll, so there is no cheaper signal to hang this off.
     */
    const measureHeaderOverlap = () => {
        if (headerNode === null || scrollContainer === null) {
            return
        }
        const containerTop = scrollContainer.getBoundingClientRect().top
        const overlap = Math.max(0, headerNode.getBoundingClientRect().bottom - containerTop)
        if (overlap !== get(headerOverlap)) {
            headerOverlap.set(overlap)
        }
    }

    // Aborted whenever a newer range supersedes the one in flight, so an
    // async handler can drop a response that is no longer current.
    let rangeRequest: AbortController | undefined

    /**
     * Report a new visible range to the caller. Deferred to a microtask so
     * that handlers which update `data` / `dataOffset` don't write to
     * stores from inside a store derivation — which also coalesces several
     * range changes landing in the same tick down to the last one.
     */
    const notifyRangeChange = (range: VisibleRange) => {
        if (onRangeChange === undefined) {
            return
        }
        rangeRequest?.abort()
        const request = new AbortController()
        rangeRequest = request
        queueMicrotask(() => {
            if (request.signal.aborted) {
                return
            }
            onRangeChange(range, { signal: request.signal })
        })
    }

    /**
     * Geometry: the range to render, the container height, and the spacer
     * heights that position it.
     *
     * Dense and sparse are separate strategies with very different cost
     * profiles, so each builds its own stores rather than one store graph
     * branching on every scroll event.
     *
     * Dense offsets are O(rows) walks over measured heights, so they must
     * stay memoized behind `rowIds` and a deduped `visibleRange` — pulling
     * them onto `scrollTop` makes every scroll event walk the whole table.
     * Sparse geometry is uniform-height arithmetic, O(1), so it can hang
     * off the scroll position directly.
     */
    interface Geometry {
        visibleRange: Readable<VisibleRange>
        /** Absolute range actually rendered, clamped to resident rows. */
        renderRange: Readable<VisibleRange>
        /** Absolute range intersecting the viewport, buffer excluded. */
        viewportRange: Readable<VisibleRange>
        totalHeight: Readable<number>
        topSpacerHeight: Readable<number>
        bottomSpacerHeight: Readable<number>
    }

    /**
     * Emit a range only when it actually changes, optionally reporting it
     * onward. `renderRange` and the spacers hang off the result, so the
     * expensive dense derivations stay put while scrolling within a row.
     */
    const dedupedRange = (
        source: Readable<VisibleRange>,
        onChange?: (_range: VisibleRange) => void
    ): Readable<VisibleRange> => {
        let currentRange: VisibleRange = { start: 0, end: 0 }
        return derived(
            source,
            ($range, set) => {
                if ($range.start === currentRange.start && $range.end === currentRange.end) {
                    return
                }
                currentRange = $range
                set($range)
                onChange?.($range)
            },
            currentRange
        )
    }

    const createDenseGeometry = (): Geometry => {
        // One O(rows) walk per scroll event, and the mounted range is the
        // viewport range padded — so containment is a property of the store
        // graph rather than of two calculations agreeing. Padding hangs off
        // the *deduped* viewport, so scrolling within a row does not reach it
        // at all, and the spacers below stay put with it.
        const viewportRange = dedupedRange(
            derived([rowIds, rowViewport], ([$rowIds, $view]) =>
                heightManager.getViewportRange($rowIds, $view.top, $view.height)
            )
        )
        const visibleRange = dedupedRange(
            // `rowIds` stays a direct dependency: appending rows widens the
            // clamp even when the viewport itself has not moved.
            derived([viewportRange, rowIds], ([$viewport, $rowIds]) =>
                heightManager.bufferRange($viewport, $rowIds.length, bufferSize)
            ),
            notifyRangeChange
        )
        const totalHeight = derived(rowIds, ($rowIds) => heightManager.getTotalHeight($rowIds))

        return {
            visibleRange,
            // Every row is resident, so nothing is clamped away.
            renderRange: visibleRange,
            viewportRange,
            totalHeight,
            topSpacerHeight: derived([rowIds, visibleRange], ([$rowIds, $range]) =>
                heightManager.getOffsetForIndex($rowIds, $range.start)
            ),
            bottomSpacerHeight: derived(
                [rowIds, visibleRange, totalHeight],
                ([$rowIds, $range, $total]) =>
                    Math.max(0, $total - heightManager.getOffsetForIndex($rowIds, $range.end))
            )
        }
    }

    const createSparseGeometry = (): Geometry => {
        // `rowIds` participates so new measurements, which move the average
        // row height, re-run the geometry.
        const layout = derived([rowIds, rowViewport, datasetRows], ([, $view, $datasetRows]) =>
            heightManager.getSparseLayout(
                $datasetRows,
                $view.top,
                $view.height,
                bufferSize,
                maxScrollHeight
            )
        )
        const visibleRange = dedupedRange(
            derived(layout, ($layout) => ({ start: $layout.start, end: $layout.end })),
            notifyRangeChange
        )

        // The visible range is absolute and may extend past the resident
        // window. Intersect once here; `derivePageRows` reuses the result so
        // the spacers and the DOM can't disagree.
        const renderRange = derived(
            [visibleRange, rowIds, dataOffset],
            ([$range, $rowIds, $dataOffset]) => {
                const windowEnd = $dataOffset + $rowIds.length
                const start = Math.min(Math.max($range.start, $dataOffset), windowEnd)
                const end = Math.min($range.end, windowEnd)
                // Nothing resident yet: collapse to a zero-width slice where
                // the user is looking, not at the window edge, so the
                // spacers still sum to the full height.
                return end > start ? { start, end } : { start: $range.start, end: $range.start }
            }
        )

        // Rows are placed relative to the anchor row, so the block around
        // the viewport lays out at natural scale even when the overall
        // scroll range is compressed.
        const topSpacerHeight = derived([renderRange, layout], ([$range, $layout]) =>
            Math.max(
                0,
                $layout.anchorOffset + ($range.start - $layout.anchorIndex) * $layout.rowHeight
            )
        )

        return {
            visibleRange,
            renderRange,
            // Already absolute and already decompressed — `layout` computed it
            // from the same anchor that positions the rendered block, so this
            // cannot drift from what is on screen.
            viewportRange: dedupedRange(derived(layout, ($layout) => $layout.viewport)),
            totalHeight: derived(layout, ($layout) => $layout.totalHeight),
            topSpacerHeight,
            bottomSpacerHeight: derived(
                [renderRange, layout, topSpacerHeight],
                ([$range, $layout, $top]) =>
                    Math.max(
                        0,
                        $layout.totalHeight - $top - ($range.end - $range.start) * $layout.rowHeight
                    )
            )
        }
    }

    const {
        visibleRange,
        renderRange,
        viewportRange,
        totalHeight,
        topSpacerHeight,
        bottomSpacerHeight
    } = isSparse ? createSparseGeometry() : createDenseGeometry()

    // Total and rendered row counts
    const totalRows: Readable<number> = isSparse
        ? datasetRows
        : derived(rowIds, ($rowIds) => $rowIds.length)
    const renderedRows: Readable<number> = derived(
        renderRange,
        ($range) => $range.end - $range.start
    )

    /**
     * Check if we should load more data and trigger the callback.
     */
    const checkLoadMore = () => {
        if (!onLoadMore || loadMorePending || !get(hasMoreStore)) {
            return
        }

        const $view = get(rowViewport)
        const $totalHeight = get(totalHeight)

        // `totalHeight` covers the rows only, so compare against the row-space
        // scroll position rather than the container's.
        const distanceFromBottom = $totalHeight - ($view.top + $view.height)

        if (distanceFromBottom <= loadMoreThreshold) {
            loadMorePending = true
            isLoading.set(true)

            const result = onLoadMore()
            if (result instanceof Promise) {
                const resetLoadingState = () => {
                    loadMorePending = false
                    isLoading.set(false)
                }

                // The callback promise only gates loading state; handle either outcome locally.
                void result.then(resetLoadingState, resetLoadingState)
            } else {
                loadMorePending = false
                isLoading.set(false)
            }
        }
    }

    /**
     * Handle scroll events from the container.
     */
    const handleScroll = (event: Event) => {
        const target = event.target as HTMLElement
        scrollTop.set(target.scrollTop)

        measureHeaderOverlap()
        checkLoadMore()
    }

    /**
     * Svelte action to attach to the scroll container.
     */
    const virtualScroll: Action<HTMLElement> = (node) => {
        attachedNodes.add(node)
        scrollContainer = node

        // Disable overflow-anchor to prevent the browser from adjusting
        // scrollTop when spacer heights change. Without this, a feedback
        // loop occurs: spacer change → browser adjusts scrollTop → scroll
        // event → new visible range → spacer change → cascades to bottom.
        // Written before the layout read below so the browser settles once.
        node.style.overflowAnchor = 'none'

        // Viewport height first: the geometry chain is derived from it, and
        // restoring scroll while it is still 0 would walk the whole table
        // against a zero-height viewport only to redo it a line later.
        viewportHeight.set(node.clientHeight)

        // Scroll position now outlives the node, so a remount hands us a
        // fresh container sitting at 0 while `scrollTop` still holds where
        // the user was. Put the node back rather than letting the two
        // disagree — a mismatch renders rows for a range the container is
        // not showing. The browser clamps the assignment to the content
        // height available right now, so trust the node and follow it.
        const retainedScrollTop = get(scrollTop)
        if (retainedScrollTop > 0) {
            node.scrollTop = retainedScrollTop
            scrollTop.set(node.scrollTop)
        }

        // Create ResizeObserver to track viewport size changes
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                viewportHeight.set(entry.contentRect.height)
            }
        })
        resizeObserver.observe(node)

        // Attach scroll listener
        node.addEventListener('scroll', handleScroll, { passive: true })

        // Check if we need to load more initially
        checkLoadMore()

        return {
            destroy() {
                attachedNodes.delete(node)
                node.removeEventListener('scroll', handleScroll)
                resizeObserver.disconnect()

                // State below is plugin-scoped, not node-scoped, so only the
                // node that owns the binding may touch it. A node that has
                // already been superseded is a deferred teardown finishing
                // late — clearing here would strand the live container on a
                // null binding it can never recover from, because the action
                // does not re-run.
                if (scrollContainer !== node) {
                    return
                }

                // Hand the binding to whatever is still mounted.
                scrollContainer = attachedNodes.values().next().value ?? null
                if (scrollContainer !== null) {
                    return
                }

                // Nothing is mounted now. Let callers cancel work for a table
                // that is going away, and drop the row cache — it is only read
                // by `measureRow`, which cannot fire without a container, and
                // `syncedRows` rebuilds it on the way back in. Scroll position,
                // viewport height and measured heights survive: they are what
                // the next mount restores from.
                rangeRequest?.abort()
                rangeRequest = undefined
                allRowsCache = []
            }
        }
    }

    /**
     * Scroll to a specific row index.
     */
    const scrollToIndex = (index: number, options: ScrollToIndexOptions = {}) => {
        if (!scrollContainer) {
            return
        }

        const { align = 'start', behavior = 'auto' } = options
        const $rowIds = get(rowIds)

        // In sparse mode `index` is absolute, so it is bounded by the
        // dataset total rather than by what happens to be loaded.
        const indexLimit = isSparse ? get(datasetRows) : $rowIds.length
        if (index < 0 || index >= indexLimit) {
            return
        }

        const $viewportHeight = get(rowViewport).height

        // Do the alignment maths in dataset coordinates, then map to the
        // container once. Sparse geometry may compress the scroll range, so
        // offsetting an already-compressed position by natural row and
        // viewport heights would land far from the requested row — at 8x
        // compression, centring would overshoot by dozens of rows.
        const rowHeight = isSparse
            ? heightManager.getAverageHeight()
            : heightManager.getHeight($rowIds[index])
        const rowStart = isSparse
            ? index * rowHeight
            : heightManager.getOffsetForIndex($rowIds, index)
        const currentTop = isSparse
            ? heightManager.getSparseNaturalScrollTop(
                  get(datasetRows),
                  get(rowViewport).top,
                  $viewportHeight,
                  maxScrollHeight
              )
            : get(rowViewport).top

        const targetOffset = resolveAlignedOffset(
            align,
            rowStart,
            rowHeight,
            $viewportHeight,
            currentTop
        )
        if (targetOffset === undefined) {
            // Already fully visible
            return
        }

        const scrollPosition = isSparse
            ? heightManager.getSparseScrollTopForOffset(
                  get(datasetRows),
                  targetOffset,
                  $viewportHeight,
                  maxScrollHeight
              )
            : targetOffset

        scrollContainer.scrollTo({
            // Back into container space: the alignment above is in row space,
            // which starts below whatever the caller rendered ahead of the
            // rows. Backing out the overlap too keeps the target row clear of a
            // sticky header rather than parked underneath it.
            top: Math.max(0, scrollPosition + get(contentOffset) - get(headerOverlap)),
            behavior
        })
    }

    /**
     * Svelte action for content that paints over the top of the viewport —
     * in practice a `position: sticky` `<thead>`.
     *
     * Only needed for content that *overlays* the rows. A header that scrolls
     * away with them needs nothing: the plugin already measures the space it
     * occupies. Attaching this to one is harmless, since it reports no overlap
     * once it has scrolled out of view.
     *
     * Usage: `<thead class="sticky top-0" use:measureHeaderAction>`
     */
    const measureHeaderAction: Action<HTMLElement> = (node) => {
        headerNode = node
        measureHeaderOverlap()

        // A header that grows — a filter row appearing, text wrapping — changes
        // how much it covers without any scrolling to trigger a re-read.
        const resizeObserver = new ResizeObserver(() => {
            measureHeaderOverlap()
        })
        resizeObserver.observe(node)

        return {
            destroy() {
                resizeObserver.disconnect()
                if (headerNode !== node) {
                    return
                }
                headerNode = null
                headerOverlap.set(0)
            }
        }
    }

    /**
     * Notify the plugin that a row has been measured.
     */
    const measureRow = (rowId: string, height: number) => {
        // If getRowHeight is provided, prefer that
        if (getRowHeight) {
            const row = allRowsCache[get(rowIndexById).get(rowId) ?? -1]
            if (row?.isData() && row.original) {
                const specifiedHeight = getRowHeight(row.original)
                if (specifiedHeight !== height) {
                    height = specifiedHeight
                }
            }
        }

        const changed = heightManager.setHeight(rowId, height)
        if (changed) {
            // Force recalculation of derived stores by updating rowIds
            // (touching it with the same value)
            rowIds.update((v) => v)
        }
    }

    /**
     * Learn how far the rows sit below the container's scroll origin, from
     * where the first rendered row actually landed.
     *
     * That row is laid out directly after the top spacer, so whatever is left
     * once the spacer is subtracted is the content the caller put above the
     * rows — normally an in-flow `<thead>`. Measured from the DOM because the
     * plugin cannot see the caller's markup, and re-measured on every mount so
     * a header that changes height corrects itself on the next scroll.
     */
    const measureContentOffset = (node: HTMLElement, rowId: string, rect: DOMRect) => {
        if (scrollContainer === null || rowId !== firstRenderedRowId) {
            return
        }
        const containerTop = scrollContainer.getBoundingClientRect().top
        const rowTop = rect.top - containerTop + scrollContainer.scrollTop
        const offset = Math.max(0, rowTop - get(topSpacerHeight))
        if (offset !== get(contentOffset)) {
            contentOffset.set(offset)
        }
    }

    /**
     * Svelte action to automatically measure row height.
     * Attach to each <tr> element: <tr use:measureRowAction={row.id}>
     */
    const measureRowAction: Action<HTMLElement, string> = (node, rowId) => {
        // Measure initial height
        const measure = () => {
            const rect = node.getBoundingClientRect()
            if (rect.height > 0) {
                measureRow(rowId, rect.height)
            }
            measureContentOffset(node, rowId, rect)
        }

        // Measure on mount
        measure()

        // Use ResizeObserver to track height changes
        const resizeObserver = new ResizeObserver(() => {
            measure()
        })
        resizeObserver.observe(node)

        return {
            update(newRowId: string) {
                rowId = newRowId
                measure()
            },
            destroy() {
                resizeObserver.disconnect()
            }
        }
    }

    // Plugin state
    const pluginState: VirtualScrollState<Item> = {
        scrollTop: { subscribe: scrollTop.subscribe },
        viewportHeight: { subscribe: viewportHeight.subscribe },
        visibleRange,
        viewportRange,
        totalHeight,
        topSpacerHeight,
        bottomSpacerHeight,
        isLoading: { subscribe: isLoading.subscribe },
        hasMore: { subscribe: hasMoreStore.subscribe },
        virtualScroll,
        scrollToIndex,
        measureRow,
        measureRowAction,
        measureHeaderAction,
        totalRows,
        renderedRows,
        dataOffset
    }

    /**
     * Derive visible rows from all page rows.
     * Re-runs when rows, scroll position, or viewport height changes.
     */
    const derivePageRows: DeriveRowsFn<Item> = (rows) => {
        // Keep the row ID list and the lookup indexes in sync with the rows
        // handed to us. Split out so the slicing derivation below can depend
        // on `geometry`, which itself depends on `rowIds`.
        const syncedRows = derived(rows, ($rows) => {
            // One pass builds the ID list, the ID->position index, and the
            // changed check. This runs on every window move in sparse mode,
            // so the intermediate arrays are worth avoiding.
            const ids = new Array<string>($rows.length)
            const index = new Map<string, number>()
            const currentIds = get(rowIds)
            let changed = $rows.length !== currentIds.length
            for (let i = 0; i < $rows.length; i++) {
                const id = $rows[i].id
                ids[i] = id
                index.set(id, i)
                if (!changed && id !== currentIds[i]) {
                    changed = true
                }
            }

            // Cache rows for lookup in measureRow
            allRowsCache = $rows
            rowIndexById.set(index)
            if (changed) {
                rowIds.set(ids)
            }

            return $rows
        })

        return derived([syncedRows, renderRange, dataOffset], ([$rows, $range, $dataOffset]) => {
            const { start, end } = $range
            if (!isSparse) {
                const slice = $rows.slice(start, end)
                firstRenderedRowId = slice[0]?.id
                return slice
            }
            // `renderRange` is absolute and already clamped to the resident
            // window, so shifting it into window-local coordinates is all
            // that's left.
            const localStart = Math.min($rows.length, Math.max(0, start - $dataOffset))
            const localEnd = Math.min($rows.length, Math.max(localStart, end - $dataOffset))
            const slice = $rows.slice(localStart, localEnd)
            firstRenderedRowId = slice[0]?.id
            return slice
        })
    }

    // Props for every resident row, keyed by ID. Built once per window
    // rather than once per row: the absolute index is folded in here, so a
    // row's hook is a single lookup against one store instead of its own
    // derived over both the index map and the offset.
    const rowPropsById: Readable<Map<string, VirtualScrollRowProps>> = derived(
        [rowIndexById, dataOffset],
        ([$rowIndexById, $dataOffset]) => {
            const offset = isSparse ? $dataOffset : 0
            const props = new Map<string, VirtualScrollRowProps>()
            for (const [id, index] of $rowIndexById) {
                props.set(id, { virtualIndex: index + offset, isVirtual: true })
            }
            return props
        }
    )

    /** Reported for a row that is no longer in the resident window. */
    const FALLBACK_ROW_PROPS: VirtualScrollRowProps = { virtualIndex: 0, isVirtual: true }

    // Hooks to add virtual index props to rows
    const hooks = {
        'tbody.tr': (row: BodyRow<Item>) => ({
            props: derived(rowPropsById, ($props) => $props.get(row.id) ?? FALLBACK_ROW_PROPS)
        })
    }

    // Geometry and container binding live in this closure, so one
    // `addVirtualScroll(...)` result drives one table — see the note on the
    // factory. Two tables sharing it would share a scroll position and a
    // height cache. Only detectable when they carry different data stores,
    // so warn rather than throw: the shape is legal, the sharing is not.
    let boundData: unknown
    const warnIfShared = (data: unknown) => {
        if (boundData !== undefined && boundData !== data) {
            console.warn(
                'The same `addVirtualScroll()` result is driving more than one table. ' +
                    'Scroll position and measured row heights are shared between them. ' +
                    'Call `addVirtualScroll()` once per table.'
            )
        }
        boundData = data
    }

    // Rebuilding this per view model is what used to strand the mounted
    // container on a dead closure.
    const instance = {
        pluginState,
        derivePageRows,
        hooks
    }

    return ({ tableState }) => {
        warnIfShared(tableState.data)
        return instance
    }
}
