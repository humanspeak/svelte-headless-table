import type { Action } from 'svelte/action'
import { derived, get, readable, writable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { HeightManager } from '../utils/HeightManager.js'
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
    loadMoreThreshold: 200
} as const

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
 */
export const addVirtualScroll =
    <Item>({
        onLoadMore,
        hasMore: hasMoreConfig,
        loadMoreThreshold = DEFAULTS.loadMoreThreshold,
        estimatedRowHeight = DEFAULTS.estimatedRowHeight,
        bufferSize = DEFAULTS.bufferSize,
        getRowHeight
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

        // Visible range calculation
        const visibleRange: Readable<VisibleRange> = derived(
            [rowIds, scrollTop, viewportHeight],
            ([$rowIds, $scrollTop, $viewportHeight]) => {
                return heightManager.getVisibleRange(
                    $rowIds,
                    $scrollTop,
                    $viewportHeight,
                    bufferSize
                )
            }
        )

        // Total height of all rows
        const totalHeight: Readable<number> = derived(rowIds, ($rowIds) => {
            return heightManager.getTotalHeight($rowIds)
        })

        // Spacer heights
        const topSpacerHeight: Readable<number> = derived(
            [rowIds, visibleRange],
            ([$rowIds, $range]) => {
                return heightManager.getOffsetForIndex($rowIds, $range.start)
            }
        )

        const bottomSpacerHeight: Readable<number> = derived(
            [rowIds, visibleRange, totalHeight],
            ([$rowIds, $range, $total]) => {
                const endOffset = heightManager.getOffsetForIndex($rowIds, $range.end)
                return Math.max(0, $total - endOffset)
            }
        )

        // Total and rendered row counts
        const totalRows: Readable<number> = derived(rowIds, ($rowIds) => $rowIds.length)
        const renderedRows: Readable<number> = derived(
            visibleRange,
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
                    result.finally(() => {
                        loadMorePending = false
                        isLoading.set(false)
                    })
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
            const newScrollTop = target.scrollTop

            scrollTop.set(newScrollTop)

            checkLoadMore()
        }

        /**
         * Svelte action to attach to the scroll container.
         */
        const virtualScroll: Action<HTMLElement> = (node) => {
            scrollContainer = node

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

            if (index < 0 || index >= $rowIds.length) {
                return
            }

            const targetOffset = heightManager.getOffsetForIndex($rowIds, index)
            const rowHeight = heightManager.getHeight($rowIds[index])
            const $viewportHeight = get(viewportHeight)

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
            renderedRows
        }

        /**
         * Derive visible rows from all page rows.
         * Re-runs when rows, scroll position, or viewport height changes.
         */
        const derivePageRows: DeriveRowsFn<Item> = (rows) => {
            return derived(
                [rows, scrollTop, viewportHeight],
                ([$rows, $scrollTop, $viewportHeight], set) => {
                    // Cache rows for lookup in measureRow and hooks
                    allRowsCache = $rows

                    // Extract row IDs and update the store (only if changed)
                    const ids = $rows.map((r) => r.id)
                    const currentIds = get(rowIds)
                    if (
                        ids.length !== currentIds.length ||
                        ids.some((id, i) => id !== currentIds[i])
                    ) {
                        rowIds.set(ids)
                    }

                    // Calculate visible range
                    const range = heightManager.getVisibleRange(
                        ids,
                        $scrollTop,
                        $viewportHeight,
                        bufferSize
                    )

                    // Return only the visible subset
                    const visibleRows = $rows.slice(range.start, range.end)

                    set(visibleRows)
                }
            )
        }

        // Hooks to add virtual index props to rows
        const hooks = {
            'tbody.tr': (row: BodyRow<Item>) => {
                const virtualIndex = allRowsCache.findIndex((r) => r.id === row.id)

                return {
                    props: readable({
                        virtualIndex: virtualIndex >= 0 ? virtualIndex : 0,
                        isVirtual: true
                    } as VirtualScrollRowProps)
                }
            }
        }

        return {
            pluginState,
            derivePageRows,
            hooks
        }
    }
