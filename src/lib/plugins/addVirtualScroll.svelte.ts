import { untrack } from 'svelte'
import type { Action } from 'svelte/action'
import type { BodyRow } from '../bodyRows.js'
import { box, type Getter, type ReadonlyBox } from '../reactivity.svelte.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { HeightManager } from '../utils/HeightManager.js'
import { resolveAlignedOffset } from '../utils/scrollAlign.js'
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

/** Props addVirtualScroll contributes to `row.current.props.<key>` on body rows. */
export type VirtualScrollPropSet = NewTablePropSet<{
    'tbody.tr': VirtualScrollRowProps
}>

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

const STORE_CONFIG_ERROR = (name: string) =>
    `addVirtualScroll: ${name} must be a number, a getter or a box; Svelte stores are not accepted in v7 — see the migration guide`

const isBox = <T>(value: unknown): value is ReadonlyBox<T> =>
    typeof value === 'object' && value !== null && 'current' in value

/**
 * Normalise a `number | Getter<number> | ReadonlyBox<number> | undefined`
 * config value into a getter, rejecting Svelte stores.
 */
const toGetter = (
    name: string,
    value: number | Getter<number> | ReadonlyBox<number> | undefined,
    fallback: number
): Getter<number> => {
    if (value === undefined) {
        return () => fallback
    }
    if (typeof value === 'number') {
        return () => value
    }
    if (typeof value === 'function') {
        return value
    }
    if (isBox<number>(value)) {
        return () => value.current
    }
    throw new Error(STORE_CONFIG_ERROR(name))
}

/** Wraps a getter as a {@link ReadonlyBox}. */
const readonlyBox = <T>(get: Getter<T>): ReadonlyBox<T> => ({
    get current() {
        return get()
    }
})

const EMPTY_RANGE: VisibleRange = { start: 0, end: 0 }

/**
 * The rows handed to `derivePageRows`, with their ID list and ID->position
 * index. Produced by one derivation; nothing is written while deriving.
 */
interface SyncedRows<Item> {
    rows: BodyRow<Item>[]
    ids: string[]
    index: Map<string, number>
}

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
 * const hasMore = box(true)
 * const table = createTable(() => items, {
 *   virtualScroll: addVirtualScroll({
 *     estimatedRowHeight: 48,
 *     bufferSize: 5,
 *     onLoadMore: async () => {
 *       const more = await fetchMoreItems()
 *       items = [...items, ...more]
 *     },
 *     hasMore
 *   })
 * })
 *
 * const {
 *   virtualScroll,
 *   topSpacerHeight,
 *   bottomSpacerHeight,
 *   visibleRange
 * } = viewModel.pluginStates.virtualScroll
 * topSpacerHeight.current // px
 * ```
 *
 * @example Sparse mode — window over a server-paged dataset
 * ```typescript
 * // `data` holds only the resident window; `offset` is where it starts.
 * const table = createTable(() => items, {
 *   virtualScroll: addVirtualScroll({
 *     estimatedRowHeight: 32,
 *     totalRows: () => rowCount,  // the whole dataset's size
 *     dataOffset: () => offset,   // absolute index of items[0]
 *     onRangeChange: async ({ start, end }) => {
 *       const window = await fetchWindow(start, end)  // fetches + evicts
 *       offset = window.start
 *       items = window.items
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
 * the same `data`, each with its own `addVirtualScroll()`. Two view
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
    VirtualScrollPropSet
> => {
    // Height management
    const heightManager = new HeightManager(estimatedRowHeight)

    // Bumped whenever `heightManager` learns a new height. The manager is a
    // plain class, so every derivation that reads heights also reads this.
    const heightsVersion = box(0)

    // Scroll state
    const scrollTop = box(0)
    const viewportHeight = box(0)

    // Sparse mode: the caller owns fetching and eviction, the plugin owns
    // geometry. `data` holds only the resident window; `datasetRows` is the
    // size of the full dataset and `dataOffset` is the absolute index of
    // the first resident row.
    const isSparse = totalRowsConfig !== undefined
    const datasetRows = toGetter('totalRows', totalRowsConfig, 0)
    const dataOffset = toGetter('dataOffset', dataOffsetConfig, 0)

    // Loading state
    const isLoading = box(false)
    const hasMore: ReadonlyBox<boolean> = isBox<boolean>(hasMoreConfig)
        ? hasMoreConfig
        : box(hasMoreConfig ?? false)

    // Track whether we've already triggered a load to prevent duplicates
    let loadMorePending = false

    // The container the plugin currently drives — the most recently mounted.
    let scrollContainer: HTMLElement | null = null

    // Every container currently bound. Normally one. Two appear transiently
    // whenever an out-transition defers the outgoing node's teardown past its
    // replacement's mount, which is why teardown checks ownership instead of
    // assuming it.
    // A plain registry of DOM nodes, not state.
    // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
    const attachedNodes = new Set<HTMLElement>()

    // The rows the most recent view model hands to `derivePageRows`. A box, so
    // the geometry below follows a rebuilt view model instead of the one that
    // happened to be built first. Written only when a view model is built.
    const upstreamRows = box<Getter<BodyRow<Item>[]>>(() => [])

    // One pass builds the ID list, the ID->position index, and the changed
    // check. This runs on every window move in sparse mode, so the
    // intermediate arrays are worth avoiding. The previous ID list is reused
    // when nothing changed, so the geometry keyed on it stays put.
    let previousIds: string[] = []
    const synced: SyncedRows<Item> = $derived.by(() => {
        const rows = upstreamRows.current()
        // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
        const index = new Map<string, number>()
        const ids = new Array<string>(rows.length)
        let changed = rows.length !== previousIds.length
        for (const [i, { id }] of rows.entries()) {
            ids[i] = id
            index.set(id, i)
            if (!changed && id !== previousIds[i]) {
                changed = true
            }
        }
        if (changed) {
            previousIds = ids
        }
        return { rows, ids: previousIds, index }
    })

    // Row IDs (used for calculations). Its own derived so that a re-derivation
    // with the same IDs keeps the same array and skips the geometry below.
    const rowIdsValue = $derived(synced.ids)
    const rowIds: Getter<string[]> = () => rowIdsValue
    // Row IDs for geometry that also depends on measured heights.
    const measuredRowIds: Getter<string[]> = () => {
        // Read for tracking only: the heights live in the plain HeightManager.
        const _heightsVersion = heightsVersion.current
        return rowIdsValue
    }

    // Position of each row within the current data window, by row ID. Read
    // reactively so `virtualIndex` stays reactive: rows are keyed by ID in
    // the template, so a row reused across two different windows would
    // otherwise keep the index it was first rendered with.
    const rowIndexById: Getter<Map<string, number>> = () => synced.index

    // Distance from the container's scroll origin to where row 0 begins.
    // The documented markup puts `<thead>` inside the scroll container, so it
    // is normally the header's height: without it every range is reported
    // that far down the dataset, and a buffer smaller than the header leaves
    // a blank strip at the top of the viewport. Measured rather than
    // configured, so it also covers a caption, a toolbar, or anything else a
    // caller puts above the rows.
    const contentOffset = box(0)

    // Id of the first row currently rendered. Measuring that row is what
    // reveals the offset, since it sits directly after the top spacer. A
    // plain variable assigned while page rows derive: it is not reactive state.
    let firstRenderedRowId: string | undefined

    // How much of the viewport's top edge is currently painted over by the
    // header. Zero unless `measureHeaderAction` is attached: an in-flow header
    // needs no such correction, because it scrolls away and `contentOffset`
    // already accounts for the space it occupies.
    const headerOverlap = box(0)

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
    const rowViewport = $derived.by(() => {
        const top = scrollTop.current + headerOverlap.current - contentOffset.current
        const bottom = scrollTop.current + viewportHeight.current - contentOffset.current
        // `getViewportRange` floors the top at 0, so measure the height
        // from wherever the band actually starts.
        return { top, height: Math.max(0, bottom - Math.max(0, top)) }
    })

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
        if (overlap !== headerOverlap.current) {
            headerOverlap.current = overlap
        }
    }

    // Aborted whenever a newer range supersedes the one in flight, so an
    // async handler can drop a response that is no longer current.
    let rangeRequest: AbortController | undefined

    /**
     * Report a new visible range to the caller. Deferred to a microtask so
     * that handlers which update `data` / `dataOffset` don't write state
     * while Svelte is flushing — which also coalesces several range changes
     * landing in the same tick down to the last one.
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

    // The last range reported to `onRangeChange`. Plugin-scoped, like the
    // geometry, so a remount (or a second container mounted during an
    // out-transition) does not report the same range twice.
    let reportedRange: VisibleRange = EMPTY_RANGE
    const reportRange = (range: VisibleRange) => {
        if (range.start === reportedRange.start && range.end === reportedRange.end) {
            return
        }
        reportedRange = range
        notifyRangeChange(range)
    }

    /**
     * Geometry: the range to render, the container height, and the spacer
     * heights that position it.
     *
     * Dense and sparse are separate strategies with very different cost
     * profiles, so each builds its own derivations rather than one graph
     * branching on every scroll event.
     *
     * Dense offsets are O(rows) walks over measured heights, so they must
     * stay memoized behind `rowIds` and a deduped `visibleRange` — pulling
     * them onto `scrollTop` makes every scroll event walk the whole table.
     * Sparse geometry is uniform-height arithmetic, O(1), so it can hang
     * off the scroll position directly.
     */
    interface Geometry {
        visibleRange: Getter<VisibleRange>
        /** Absolute range actually rendered, clamped to resident rows. */
        renderRange: Getter<VisibleRange>
        /** Absolute range intersecting the viewport, buffer excluded. */
        viewportRange: Getter<VisibleRange>
        totalHeight: Getter<number>
        topSpacerHeight: Getter<number>
        bottomSpacerHeight: Getter<number>
    }

    /**
     * A range that keeps its previous object while `start` / `end` are
     * unchanged, so derivations downstream see the same reference and skip.
     * `renderRange` and the spacers hang off the result, so the expensive
     * dense derivations stay put while scrolling within a row.
     */
    const dedupedRange = (compute: Getter<VisibleRange>): Getter<VisibleRange> => {
        // A plain variable, not state: it only remembers the last result.
        let currentRange: VisibleRange = EMPTY_RANGE
        const range = $derived.by(() => {
            const next = compute()
            if (next.start === currentRange.start && next.end === currentRange.end) {
                return currentRange
            }
            currentRange = next
            return next
        })
        return () => range
    }

    const createDenseGeometry = (): Geometry => {
        // One O(rows) walk per scroll event, and the mounted range is the
        // viewport range padded — so containment is a property of the
        // derivation graph rather than of two calculations agreeing. Padding
        // hangs off the *deduped* viewport, so scrolling within a row does not
        // reach it at all, and the spacers below stay put with it.
        const viewportRange = dedupedRange(() => {
            const ids = measuredRowIds()
            const view = rowViewport
            return heightManager.getViewportRange(ids, view.top, view.height)
        })
        const visibleRange = dedupedRange(() => {
            // `rowIds` stays a direct dependency: appending rows widens the
            // clamp even when the viewport itself has not moved.
            const viewport = viewportRange()
            return heightManager.bufferRange(viewport, measuredRowIds().length, bufferSize)
        })
        const totalHeight = $derived.by(() => heightManager.getTotalHeight(measuredRowIds()))
        const topSpacerHeight = $derived.by(() =>
            heightManager.getOffsetForIndex(measuredRowIds(), visibleRange().start)
        )
        const bottomSpacerHeight = $derived.by(() =>
            Math.max(
                0,
                totalHeight - heightManager.getOffsetForIndex(measuredRowIds(), visibleRange().end)
            )
        )

        return {
            visibleRange,
            // Every row is resident, so nothing is clamped away.
            renderRange: visibleRange,
            viewportRange,
            totalHeight: () => totalHeight,
            topSpacerHeight: () => topSpacerHeight,
            bottomSpacerHeight: () => bottomSpacerHeight
        }
    }

    const createSparseGeometry = (): Geometry => {
        // `measuredRowIds` participates so new measurements, which move the
        // average row height, re-run the geometry.
        const layout = $derived.by(() => {
            const _measuredRowIds = measuredRowIds()
            const view = rowViewport
            return heightManager.getSparseLayout(
                datasetRows(),
                view.top,
                view.height,
                bufferSize,
                maxScrollHeight
            )
        })
        const visibleRange = dedupedRange(() => ({ start: layout.start, end: layout.end }))

        // The visible range is absolute and may extend past the resident
        // window. Intersect once here; `derivePageRows` reuses the result so
        // the spacers and the DOM can't disagree.
        const renderRange = $derived.by(() => {
            const range = visibleRange()
            const offset = dataOffset()
            const windowEnd = offset + measuredRowIds().length
            const start = Math.min(Math.max(range.start, offset), windowEnd)
            const end = Math.min(range.end, windowEnd)
            // Nothing resident yet: collapse to a zero-width slice where
            // the user is looking, not at the window edge, so the
            // spacers still sum to the full height.
            return end > start ? { start, end } : { start: range.start, end: range.start }
        })

        // Rows are placed relative to the anchor row, so the block around
        // the viewport lays out at natural scale even when the overall
        // scroll range is compressed.
        const topSpacerHeight = $derived(
            Math.max(
                0,
                layout.anchorOffset + (renderRange.start - layout.anchorIndex) * layout.rowHeight
            )
        )
        const bottomSpacerHeight = $derived(
            Math.max(
                0,
                layout.totalHeight -
                    topSpacerHeight -
                    (renderRange.end - renderRange.start) * layout.rowHeight
            )
        )

        return {
            visibleRange,
            renderRange: () => renderRange,
            // Already absolute and already decompressed — `layout` computed it
            // from the same anchor that positions the rendered block, so this
            // cannot drift from what is on screen.
            viewportRange: dedupedRange(() => layout.viewport),
            totalHeight: () => layout.totalHeight,
            topSpacerHeight: () => topSpacerHeight,
            bottomSpacerHeight: () => bottomSpacerHeight
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
    const totalRows: Getter<number> = isSparse ? datasetRows : () => rowIds().length
    const renderedRows: Getter<number> = () => {
        const range = renderRange()
        return range.end - range.start
    }

    /**
     * Check if we should load more data and trigger the callback.
     */
    const checkLoadMore = () => {
        if (!onLoadMore || loadMorePending || !hasMore.current) {
            return
        }

        const view = rowViewport
        const total = totalHeight()

        // `totalHeight` covers the rows only, so compare against the row-space
        // scroll position rather than the container's.
        const distanceFromBottom = total - (view.top + view.height)

        if (distanceFromBottom <= loadMoreThreshold) {
            loadMorePending = true
            isLoading.current = true

            const result = onLoadMore()
            if (result instanceof Promise) {
                const resetLoadingState = () => {
                    loadMorePending = false
                    isLoading.current = false
                }

                // The callback promise only gates loading state; handle either outcome locally.
                void result.then(resetLoadingState, resetLoadingState)
            } else {
                loadMorePending = false
                isLoading.current = false
            }
        }
    }

    /**
     * Handle scroll events from the container.
     */
    const handleScroll = (event: Event) => {
        const target = event.target as HTMLElement
        scrollTop.current = target.scrollTop

        measureHeaderOverlap()
        checkLoadMore()
    }

    /**
     * Svelte action to attach to the scroll container.
     */
    const virtualScroll: Action = (node) => {
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
        viewportHeight.current = node.clientHeight

        // Scroll position now outlives the node, so a remount hands us a
        // fresh container sitting at 0 while `scrollTop` still holds where
        // the user was. Put the node back rather than letting the two
        // disagree — a mismatch renders rows for a range the container is
        // not showing. The browser clamps the assignment to the content
        // height available right now, so trust the node and follow it.
        const retainedScrollTop = untrack(() => scrollTop.current)
        if (retainedScrollTop > 0) {
            node.scrollTop = retainedScrollTop
            scrollTop.current = node.scrollTop
        }

        // Create ResizeObserver to track viewport size changes
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                viewportHeight.current = entry.contentRect.height
            }
        })
        resizeObserver.observe(node)

        // Attach scroll listener
        node.addEventListener('scroll', handleScroll, { passive: true })

        // Report range changes for as long as this container is mounted. The
        // one effect in the library: it is tied to the node's lifetime, and it
        // keeps `onRangeChange` out of the derivations (which must not have
        // side effects). `reportRange` dedupes across containers and remounts.
        const stopRangeReports = $effect.root(() => {
            $effect(() => {
                const range = visibleRange()
                untrack(() => reportRange(range))
            })
        })

        // Check if we need to load more initially
        untrack(checkLoadMore)

        return {
            destroy() {
                stopRangeReports()
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
                // that is going away. Scroll position, viewport height and
                // measured heights survive: they are what the next mount
                // restores from.
                rangeRequest?.abort()
                rangeRequest = undefined
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
        const ids = rowIds()

        // In sparse mode `index` is absolute, so it is bounded by the
        // dataset total rather than by what happens to be loaded.
        const indexLimit = isSparse ? datasetRows() : ids.length
        if (index < 0 || index >= indexLimit) {
            return
        }

        const view = rowViewport
        const viewportHeightValue = view.height

        // Do the alignment maths in dataset coordinates, then map to the
        // container once. Sparse geometry may compress the scroll range, so
        // offsetting an already-compressed position by natural row and
        // viewport heights would land far from the requested row — at 8x
        // compression, centring would overshoot by dozens of rows.
        const rowId = ids[index]
        const rowHeight =
            isSparse || rowId === undefined
                ? heightManager.getAverageHeight()
                : heightManager.getHeight(rowId)
        const rowStart = isSparse ? index * rowHeight : heightManager.getOffsetForIndex(ids, index)
        const currentTop = isSparse
            ? heightManager.getSparseNaturalScrollTop(
                  datasetRows(),
                  view.top,
                  viewportHeightValue,
                  maxScrollHeight
              )
            : view.top

        const targetOffset = resolveAlignedOffset(
            align,
            rowStart,
            rowHeight,
            viewportHeightValue,
            currentTop
        )
        if (targetOffset === undefined) {
            // Already fully visible
            return
        }

        const scrollPosition = isSparse
            ? heightManager.getSparseScrollTopForOffset(
                  datasetRows(),
                  targetOffset,
                  viewportHeightValue,
                  maxScrollHeight
              )
            : targetOffset

        scrollContainer.scrollTo({
            // Back into container space: the alignment above is in row space,
            // which starts below whatever the caller rendered ahead of the
            // rows. Backing out the overlap too keeps the target row clear of a
            // sticky header rather than parked underneath it.
            top: Math.max(0, scrollPosition + contentOffset.current - headerOverlap.current),
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
    const measureHeaderAction: Action = (node) => {
        headerNode = node
        untrack(measureHeaderOverlap)

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
                headerOverlap.current = 0
            }
        }
    }

    /**
     * Notify the plugin that a row has been measured.
     */
    const measureRow = (rowId: string, height: number) => {
        // If getRowHeight is provided, prefer that
        if (getRowHeight) {
            // Resolve the row from the derivation that produced the index, so
            // the two can never disagree.
            const { index, rows } = synced
            const rowIndex = index.get(rowId)
            const row = rowIndex === undefined ? undefined : rows[rowIndex]
            if (row?.isData() && row.original) {
                const specifiedHeight = getRowHeight(row.original)
                if (specifiedHeight !== height) {
                    height = specifiedHeight
                }
            }
        }

        const changed = heightManager.setHeight(rowId, height)
        if (changed) {
            // Re-run every derivation that reads heights.
            heightsVersion.current = untrack(() => heightsVersion.current) + 1
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
        const offset = Math.max(0, rowTop - topSpacerHeight())
        if (offset !== contentOffset.current) {
            contentOffset.current = offset
        }
    }

    /**
     * Svelte action to automatically measure row height.
     * Attach to each <tr> element: <tr use:measureRowAction={row.id}>
     */
    const measureRowAction: Action<HTMLElement, string> = (node, rowId) => {
        // Measure initial height. Reads happen outside any tracking context,
        // so an action run inside a template effect does not subscribe it to
        // the geometry it updates.
        const measure = () =>
            untrack(() => {
                const rect = node.getBoundingClientRect()
                if (rect.height > 0) {
                    measureRow(rowId, rect.height)
                }
                measureContentOffset(node, rowId, rect)
            })

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
        scrollTop: readonlyBox(() => scrollTop.current),
        viewportHeight: readonlyBox(() => viewportHeight.current),
        visibleRange: readonlyBox(visibleRange),
        viewportRange: readonlyBox(viewportRange),
        totalHeight: readonlyBox(totalHeight),
        topSpacerHeight: readonlyBox(topSpacerHeight),
        bottomSpacerHeight: readonlyBox(bottomSpacerHeight),
        isLoading: readonlyBox(() => isLoading.current),
        hasMore: readonlyBox(() => hasMore.current),
        virtualScroll,
        scrollToIndex,
        measureRow,
        measureRowAction,
        measureHeaderAction,
        totalRows: readonlyBox(totalRows),
        renderedRows: readonlyBox(renderedRows),
        dataOffset: readonlyBox(dataOffset)
    }

    /**
     * Derive visible rows from all page rows.
     * Re-runs when rows, scroll position, or viewport height changes.
     */
    const derivePageRows: DeriveRowsFn<Item> = (rows) => {
        // Point the shared geometry at this view model's rows. This runs while
        // the view model is being built, not while anything derives; `untrack`
        // keeps it legal even if a caller builds the view model inside a
        // `$derived`.
        untrack(() => {
            upstreamRows.current = rows
        })

        const sliced = $derived.by(() => {
            const rowsValue = rows()
            const { start, end } = renderRange()
            if (!isSparse) {
                const slice = rowsValue.slice(start, end)
                firstRenderedRowId = slice[0]?.id
                return slice
            }
            // `renderRange` is absolute and already clamped to the resident
            // window, so shifting it into window-local coordinates is all
            // that's left.
            const offset = dataOffset()
            const localStart = Math.min(rowsValue.length, Math.max(0, start - offset))
            const localEnd = Math.min(rowsValue.length, Math.max(localStart, end - offset))
            const slice = rowsValue.slice(localStart, localEnd)
            firstRenderedRowId = slice[0]?.id
            return slice
        })
        return () => sliced
    }

    // Props for every resident row, keyed by ID. Built once per window
    // rather than once per row: the absolute index is folded in here, so a
    // row's hook is a single lookup against one derivation instead of its
    // own over both the index map and the offset.
    const rowPropsById = $derived.by(() => {
        const offset = isSparse ? dataOffset() : 0
        // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
        const props = new Map<string, VirtualScrollRowProps>()
        for (const [id, index] of rowIndexById()) {
            props.set(id, { virtualIndex: index + offset, isVirtual: true })
        }
        return props
    })

    /** Reported for a row that is no longer in the resident window. */
    const FALLBACK_ROW_PROPS: VirtualScrollRowProps = { virtualIndex: 0, isVirtual: true }

    // Hooks to add virtual index props to rows
    const hooks = {
        'tbody.tr': (row: BodyRow<Item>) => ({
            props: () => rowPropsById.get(row.id) ?? FALLBACK_ROW_PROPS
        })
    }

    // Geometry and container binding live in this closure, so one
    // `addVirtualScroll(...)` result drives one table — see the note on the
    // factory. Two tables sharing it would share a scroll position and a
    // height cache. Only detectable when they carry different data getters,
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
