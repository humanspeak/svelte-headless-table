import type { Action } from 'svelte/action'
import { derived, get, readable, writable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { HeightManager } from '../utils/HeightManager.js'
import { isReadable, isWritable } from '../utils/store.js'
import type {
    ScrollToIndexOptions,
    VirtualScrollConfig,
    VirtualScrollRowProps,
    VirtualScrollState,
    VisibleRange
} from './addVirtualScroll.types.js'

export type { ScrollToIndexOptions, VirtualScrollConfig, VirtualScrollState, VisibleRange }

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
 */
export const addVirtualScroll =
    <Item>({
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
    > =>
    () => {
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

        // Scroll container reference (set by the action)
        let scrollContainer: HTMLElement | null = null

        // Cache for row lookup (set by derivePageRows)
        let allRowsCache: BodyRow<Item>[] = []

        // Position of each row within the current data window, by row ID. Kept
        // as a store so `virtualIndex` stays reactive: rows are keyed by ID in
        // the template, so a row reused across two different windows would
        // otherwise keep the index it was first rendered with.
        const rowIndexById = writable(new Map<string, number>())

        /**
         * Report a new visible range to the caller. Deferred to a microtask so
         * that handlers which update `data` / `dataOffset` don't write to
         * stores from inside a store derivation.
         */
        const notifyRangeChange = (range: VisibleRange) => {
            if (onRangeChange === undefined) {
                return
            }
            queueMicrotask(() => onRangeChange(range))
        }

        /**
         * Geometry: container height, the range to render, and the spacer
         * heights that position it. Dense and sparse are separate strategies,
         * so the store graph is built once for the chosen one rather than
         * branching on every scroll event — a dense table must not pay for
         * sparse geometry it never reads.
         *
         * The four values are only meaningful when mutually consistent, so
         * they are produced together by a single derivation.
         */
        interface Geometry {
            totalHeight: number
            /** Absolute range requested by the viewport, before residency. */
            range: VisibleRange
            /** Absolute range actually rendered, clamped to resident rows. */
            renderRange: VisibleRange
            topSpacer: number
            bottomSpacer: number
        }

        // The visible range is reported to `onRangeChange` from here rather
        // than from `visibleRange`, so the callback fires whenever any geometry
        // consumer is subscribed — not only when something happens to read
        // `visibleRange`. Returns a stable reference while the range is
        // unchanged so downstream dedup stays cheap.
        let currentRange: VisibleRange = { start: 0, end: 0 }
        const trackRange = (range: VisibleRange): VisibleRange => {
            if (range.start === currentRange.start && range.end === currentRange.end) {
                return currentRange
            }
            currentRange = range
            notifyRangeChange(range)
            return range
        }

        const EMPTY_GEOMETRY: Geometry = {
            totalHeight: 0,
            range: { start: 0, end: 0 },
            renderRange: { start: 0, end: 0 },
            topSpacer: 0,
            bottomSpacer: 0
        }

        /**
         * Dense geometry: every row is resident, so the range is the render
         * range and offsets come from the measured per-row heights.
         *
         * `rowIds` carries the measurement signal — `measureRow` touches it
         * when a height changes.
         */
        const denseGeometry: Readable<Geometry> = derived(
            [rowIds, scrollTop, viewportHeight],
            ([$rowIds, $scrollTop, $viewportHeight]) => {
                const range = heightManager.getVisibleRange(
                    $rowIds,
                    $scrollTop,
                    $viewportHeight,
                    bufferSize
                )
                const totalHeight = heightManager.getTotalHeight($rowIds)
                const topSpacer = heightManager.getOffsetForIndex($rowIds, range.start)
                const endOffset = heightManager.getOffsetForIndex($rowIds, range.end)
                const tracked = trackRange(range)
                return {
                    totalHeight,
                    range: tracked,
                    renderRange: tracked,
                    topSpacer,
                    bottomSpacer: Math.max(0, totalHeight - endOffset)
                }
            }
        )

        /**
         * Sparse geometry: the visible range is absolute and may extend past
         * the resident window, so the rendered range is the intersection with
         * it — computed once here, and reused by `derivePageRows` so the
         * spacers and the DOM can't disagree.
         *
         * Rows are placed relative to the anchor row, so the block around the
         * viewport lays out at natural scale even when the overall scroll range
         * is compressed.
         */
        const sparseGeometry: Readable<Geometry> = derived(
            [rowIds, scrollTop, viewportHeight, datasetRows, dataOffset],
            ([$rowIds, $scrollTop, $viewportHeight, $datasetRows, $dataOffset]) => {
                const layout = heightManager.getSparseLayout(
                    $datasetRows,
                    $scrollTop,
                    $viewportHeight,
                    bufferSize,
                    maxScrollHeight
                )
                const range = trackRange({ start: layout.start, end: layout.end })

                const windowEnd = $dataOffset + $rowIds.length
                const start = Math.min(Math.max(range.start, $dataOffset), windowEnd)
                const end = Math.min(range.end, windowEnd)
                // Nothing resident for this range yet: collapse to a zero-width
                // slice anchored where the user is looking, not at the window
                // edge, so the spacers still sum to the full height.
                const renderRange =
                    end > start ? { start, end } : { start: range.start, end: range.start }

                const topSpacer = Math.max(
                    0,
                    layout.anchorOffset +
                        (renderRange.start - layout.anchorIndex) * layout.rowHeight
                )
                const renderedHeight = (renderRange.end - renderRange.start) * layout.rowHeight
                return {
                    totalHeight: layout.totalHeight,
                    range,
                    renderRange,
                    topSpacer,
                    bottomSpacer: Math.max(0, layout.totalHeight - topSpacer - renderedHeight)
                }
            }
        )

        const geometry = isSparse ? sparseGeometry : denseGeometry

        // Suppress no-op emissions so consumers don't churn on every scroll
        // pixel; `trackRange` already gives us a stable reference to compare.
        let lastEmittedRange: VisibleRange = EMPTY_GEOMETRY.range
        const visibleRange: Readable<VisibleRange> = derived(
            geometry,
            ($geometry, set) => {
                if ($geometry.range === lastEmittedRange) {
                    return
                }
                lastEmittedRange = $geometry.range
                set($geometry.range)
            },
            lastEmittedRange
        )

        const renderRange: Readable<VisibleRange> = derived(
            geometry,
            ($geometry) => $geometry.renderRange
        )
        const totalHeight: Readable<number> = derived(geometry, ($g) => $g.totalHeight)
        const topSpacerHeight: Readable<number> = derived(geometry, ($g) => $g.topSpacer)
        const bottomSpacerHeight: Readable<number> = derived(geometry, ($g) => $g.bottomSpacer)

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

            const $scrollTop = get(scrollTop)
            const $viewportHeight = get(viewportHeight)
            const $totalHeight = get(totalHeight)

            const distanceFromBottom = $totalHeight - ($scrollTop + $viewportHeight)

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

            checkLoadMore()
        }

        /**
         * Svelte action to attach to the scroll container.
         */
        const virtualScroll: Action<HTMLElement> = (node) => {
            scrollContainer = node

            // Disable overflow-anchor to prevent the browser from adjusting
            // scrollTop when spacer heights change. Without this, a feedback
            // loop occurs: spacer change → browser adjusts scrollTop → scroll
            // event → new visible range → spacer change → cascades to bottom.
            node.style.overflowAnchor = 'none'

            // Set initial viewport height
            const initialHeight = node.clientHeight
            viewportHeight.set(initialHeight)

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
                    scrollContainer = null
                    node.removeEventListener('scroll', handleScroll)
                    resizeObserver.disconnect()
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

            const $viewportHeight = get(viewportHeight)
            const targetOffset = isSparse
                ? heightManager.getSparseScrollTopForIndex(
                      get(datasetRows),
                      index,
                      $viewportHeight,
                      maxScrollHeight
                  )
                : heightManager.getOffsetForIndex($rowIds, index)
            const rowHeight = isSparse
                ? heightManager.getAverageHeight()
                : heightManager.getHeight($rowIds[index])

            let scrollPosition: number
            switch (align) {
                case 'center':
                    scrollPosition = targetOffset - ($viewportHeight - rowHeight) / 2
                    break
                case 'end':
                    scrollPosition = targetOffset - $viewportHeight + rowHeight
                    break
                case 'auto': {
                    // Check if already visible
                    const $scrollTop = get(scrollTop)
                    const visibleStart = $scrollTop
                    const visibleEnd = $scrollTop + $viewportHeight
                    const rowStart = targetOffset
                    const rowEnd = targetOffset + rowHeight

                    if (rowStart >= visibleStart && rowEnd <= visibleEnd) {
                        // Already fully visible
                        return
                    } else if (rowStart < visibleStart) {
                        scrollPosition = rowStart
                    } else {
                        scrollPosition = rowEnd - $viewportHeight
                    }
                    break
                }
                case 'start':
                default:
                    scrollPosition = targetOffset
                    break
            }

            scrollContainer.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior
            })
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
         * Svelte action to automatically measure row height.
         * Attach to each <tr> element: <tr use:measureRowAction={row.id}>
         */
        const measureRowAction: Action<HTMLElement, string> = (node, rowId) => {
            // Measure initial height
            const measure = () => {
                const height = node.getBoundingClientRect().height
                if (height > 0) {
                    measureRow(rowId, height)
                }
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
            totalHeight,
            topSpacerHeight,
            bottomSpacerHeight,
            isLoading: { subscribe: isLoading.subscribe },
            hasMore: { subscribe: hasMoreStore.subscribe },
            virtualScroll,
            scrollToIndex,
            measureRow,
            measureRowAction,
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

            return derived(
                [syncedRows, geometry, dataOffset],
                ([$rows, $geometry, $dataOffset]) => {
                    const { start, end } = $geometry.renderRange
                    if (!isSparse) {
                        return $rows.slice(start, end)
                    }
                    // `renderRange` is absolute and already clamped to the resident
                    // window, so shifting it into window-local coordinates is all
                    // that's left.
                    const localStart = Math.min($rows.length, Math.max(0, start - $dataOffset))
                    const localEnd = Math.min($rows.length, Math.max(localStart, end - $dataOffset))
                    return $rows.slice(localStart, localEnd)
                }
            )
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

        return {
            pluginState,
            derivePageRows,
            hooks
        }
    }
