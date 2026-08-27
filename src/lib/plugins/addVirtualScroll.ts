import type { Action } from 'svelte/action'
import { derived, get, readable, writable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { HeightManager, type SparseLayout } from '../utils/HeightManager.js'
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
 * Normalize a `Readable<number> | number | undefined` config value into a
 * readable store.
 */
const toNumberStore = (
    value: Readable<number> | number | undefined,
    fallback: number
): Readable<number> =>
    typeof value === 'object' && value !== null ? value : readable(value ?? fallback)

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
        const datasetRows = toNumberStore(totalRowsConfig, 0)
        const dataOffset = toNumberStore(dataOffsetConfig, 0)

        // Loading state
        const isLoading = writable(false)
        const hasMoreStore: Writable<boolean> =
            typeof hasMoreConfig === 'object' && hasMoreConfig !== null
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

        // Sparse layout for the current scroll position: container height, the
        // absolute range to render, and the anchor that positions it.
        // `rowIds` participates so that new measurements (which change the
        // average row height) re-run the geometry.
        const sparseLayout: Readable<SparseLayout> = derived(
            [rowIds, scrollTop, viewportHeight, datasetRows],
            ([, $scrollTop, $viewportHeight, $datasetRows]) =>
                heightManager.getSparseLayout(
                    $datasetRows,
                    $scrollTop,
                    $viewportHeight,
                    bufferSize,
                    maxScrollHeight
                )
        )

        // Visible range calculation.
        // Return the same object reference when the range hasn't changed to avoid
        // unnecessary downstream store updates (spacer heights, rendered rows).
        let currentRange: VisibleRange = { start: 0, end: 0 }
        const visibleRange: Readable<VisibleRange> = derived(
            [rowIds, scrollTop, viewportHeight, sparseLayout],
            ([$rowIds, $scrollTop, $viewportHeight, $layout], set) => {
                const range = isSparse
                    ? { start: $layout.start, end: $layout.end }
                    : heightManager.getVisibleRange(
                          $rowIds,
                          $scrollTop,
                          $viewportHeight,
                          bufferSize
                      )
                if (range.start === currentRange.start && range.end === currentRange.end) {
                    return
                }
                currentRange = range
                set(range)
                notifyRangeChange(range)
            },
            currentRange
        )

        // Absolute range of rows actually rendered. In sparse mode the visible
        // range can extend past the resident window; spacer heights must follow
        // what is really in the DOM or the scroll container mis-sizes.
        const renderRange: Readable<VisibleRange> = derived(
            [visibleRange, rowIds, dataOffset],
            ([$range, $rowIds, $dataOffset]) => {
                if (!isSparse) {
                    return $range
                }
                const windowEnd = $dataOffset + $rowIds.length
                const start = Math.min(Math.max($range.start, $dataOffset), windowEnd)
                const end = Math.max(start, Math.min($range.end, windowEnd))
                if (end <= start) {
                    // Nothing resident for this range yet. Collapse to a
                    // zero-width slice anchored at the range start.
                    return { start: $range.start, end: $range.start }
                }
                return { start, end }
            }
        )

        // Total height of all rows
        const totalHeight: Readable<number> = derived(
            [rowIds, sparseLayout],
            ([$rowIds, $layout]) => {
                return isSparse ? $layout.totalHeight : heightManager.getTotalHeight($rowIds)
            }
        )

        // Spacer heights. In sparse mode rows are placed relative to the anchor
        // row, so the block around the viewport lays out at natural scale even
        // when the overall scroll range is compressed.
        const topSpacerHeight: Readable<number> = derived(
            [rowIds, renderRange, sparseLayout],
            ([$rowIds, $range, $layout]) => {
                if (!isSparse) {
                    return heightManager.getOffsetForIndex($rowIds, $range.start)
                }
                return Math.max(
                    0,
                    $layout.anchorOffset + ($range.start - $layout.anchorIndex) * $layout.rowHeight
                )
            }
        )

        const bottomSpacerHeight: Readable<number> = derived(
            [rowIds, renderRange, totalHeight, topSpacerHeight, sparseLayout],
            ([$rowIds, $range, $total, $top, $layout]) => {
                if (!isSparse) {
                    const endOffset = heightManager.getOffsetForIndex($rowIds, $range.end)
                    return Math.max(0, $total - endOffset)
                }
                const renderedHeight = ($range.end - $range.start) * $layout.rowHeight
                return Math.max(0, $total - $top - renderedHeight)
            }
        )

        // Total and rendered row counts
        const totalRows: Readable<number> = derived(
            [rowIds, datasetRows],
            ([$rowIds, $datasetRows]) => (isSparse ? $datasetRows : $rowIds.length)
        )
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
                const row = allRowsCache.find((r) => r.id === rowId)
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
            // Keep the row ID list (and the lookup cache) in sync with the rows
            // handed to us. Split out so the slicing derivation below can depend
            // on `visibleRange`, which itself depends on `rowIds`.
            const syncedRows = derived(rows, ($rows) => {
                // Cache rows for lookup in measureRow and hooks
                allRowsCache = $rows
                rowIndexById.set(new Map($rows.map((r, i) => [r.id, i])))

                // Extract row IDs and update the store (only if changed)
                const ids = $rows.map((r) => r.id)
                const currentIds = get(rowIds)
                if (ids.length !== currentIds.length || ids.some((id, i) => id !== currentIds[i])) {
                    rowIds.set(ids)
                }

                return $rows
            })

            return derived(
                [syncedRows, visibleRange, dataOffset],
                ([$rows, $range, $dataOffset]) => {
                    if (!isSparse) {
                        return $rows.slice($range.start, $range.end)
                    }

                    // Sparse mode: `$range` is absolute, `$rows` covers
                    // [$dataOffset, $dataOffset + $rows.length). Render the
                    // intersection — anything outside it isn't resident yet.
                    const start = Math.min($rows.length, Math.max(0, $range.start - $dataOffset))
                    const end = Math.min($rows.length, Math.max(start, $range.end - $dataOffset))
                    return $rows.slice(start, end)
                }
            )
        }

        // Hooks to add virtual index props to rows
        const hooks = {
            'tbody.tr': (row: BodyRow<Item>) => {
                return {
                    // In sparse mode the rendered rows are a window into the
                    // dataset, so report the absolute index.
                    props: derived([rowIndexById, dataOffset], ([$rowIndexById, $dataOffset]) => {
                        const localIndex = $rowIndexById.get(row.id)
                        const offset = isSparse ? $dataOffset : 0
                        return {
                            virtualIndex: localIndex !== undefined ? localIndex + offset : offset,
                            isVirtual: true
                        } as VirtualScrollRowProps
                    })
                }
            }
        }

        return {
            pluginState,
            derivePageRows,
            hooks
        }
    }
