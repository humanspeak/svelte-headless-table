import { MemoryCache } from '@humanspeak/memory-cache'
import { keyed } from '@humanspeak/svelte-keyed'
import { derived, readable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { recordSetStore, type RecordSetStore } from '../utils/store.js'
import { DEFAULT_ROW_STATE_CACHE_CONFIG } from './cacheConfig.js'

/**
 * Configuration options for the addExpandedRows plugin.
 *
 * @template _Item - The type of data items (unused but required for type inference).
 */
/* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
export interface ExpandedRowsConfig<_Item> {
    /** Initial expanded state keyed by row ID. */
    initialExpandedIds?: Record<string, boolean>
}

/**
 * State exposed by the addExpandedRows plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface ExpandedRowsState<Item> {
    /** Store containing expanded row IDs. */
    expandedIds: RecordSetStore<string>
    /** Gets the expansion state stores for a specific row. */
    getRowState: (_row: BodyRow<Item>) => ExpandedRowsRowState
    /** Cleans up internal subscriptions and clears the row state cache. Call when destroying the table. */
    invalidate: () => void
}

/**
 * Expansion state for a single row.
 */
export interface ExpandedRowsRowState {
    /** Writable store for the row's expanded state. */
    isExpanded: Writable<boolean>
    /** Readable store indicating if this row can be expanded (has sub-rows). */
    canExpand: Readable<boolean>
    /** Readable store indicating if all expandable sub-rows are expanded. */
    isAllSubRowsExpanded: Readable<boolean>
}

/**
 * Recursively expands rows based on the expanded IDs map.
 * @internal
 */
const withExpandedRows = <Item, Row extends BodyRow<Item>>(
    row: Row,
    expandedIds: Record<string, boolean>
): Row[] => {
    if (row.subRows === undefined) {
        return [row]
    }
    if (expandedIds[row.id] !== true) {
        return [row]
    }
    const expandedSubRows = row.subRows.flatMap((subRow) =>
        withExpandedRows<Item, Row>(subRow as Row, expandedIds)
    )
    return [row, ...expandedSubRows]
}

/**
 * Creates an expanded rows plugin that enables expanding/collapsing rows with sub-rows.
 * When a row is expanded, its sub-rows are included in the flattened row list.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides row expansion functionality.
 * @example
 * ```typescript
 * const table = createTable(data, {
 *   expand: addExpandedRows({
 *     initialExpandedIds: { '0': true } // Row 0 starts expanded
 *   })
 * })
 *
 * // Toggle expansion
 * const rowState = table.pluginStates.expand.getRowState(row)
 * rowState.isExpanded.update(v => !v)
 * ```
 */
export const addExpandedRows =
    <Item>({ initialExpandedIds = {} }: ExpandedRowsConfig<Item> = {}): TablePlugin<
        Item,
        ExpandedRowsState<Item>,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    () => {
        const expandedIds = recordSetStore(initialExpandedIds)

        // LRU cache for memoized row state with automatic eviction.
        // Prevents unbounded memory growth when row identities change.
        const rowStateCache = new MemoryCache<ExpandedRowsRowState>(DEFAULT_ROW_STATE_CACHE_CONFIG)

        const getRowState = (row: BodyRow<Item>): ExpandedRowsRowState => {
            const cached = rowStateCache.get(row.id)
            if (cached !== undefined) {
                return cached
            }

            const isExpanded = keyed(expandedIds, row.id) as Writable<boolean>
            const canExpand = readable((row.subRows?.length ?? 0) > 0)
            const subRowExpandedIds = derived(expandedIds, ($expandedIds) => {
                // Check prefix with '>' to match child ids while ignoring this row's id.
                return Object.entries($expandedIds).filter(
                    ([id, expanded]) => id.startsWith(`${row.id}>`) && expanded
                )
            })
            // If the number of expanded subRows is equal to the number of subRows
            // that can expand, then all subRows are expanded.
            const isAllSubRowsExpanded = derived(subRowExpandedIds, ($subRowExpandedIds) => {
                if (row.subRows === undefined) {
                    return true
                }
                // canExpand is derived from the presence of the `subRows` property.
                const expandableSubRows = row.subRows.filter(
                    (subRow) => subRow.subRows !== undefined
                )
                return $subRowExpandedIds.length === expandableSubRows.length
            })
            const state: ExpandedRowsRowState = {
                isExpanded,
                canExpand,
                isAllSubRowsExpanded
            }
            rowStateCache.set(row.id, state)
            return state
        }

        // Clear cache when expandedIds store is cleared (data reset scenario)
        const unsubscribeExpandedIds = expandedIds.subscribe(($expandedIds) => {
            if (Object.keys($expandedIds).length === 0) {
                rowStateCache.clear()
            }
        })

        // Cleanup function to prevent subscription leaks when table is destroyed
        const invalidate = () => {
            unsubscribeExpandedIds()
            rowStateCache.clear()
        }

        const pluginState = { expandedIds, getRowState, invalidate }

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            return derived([rows, expandedIds], ([$rows, $expandedIds]) => {
                return $rows.flatMap((row) => {
                    return withExpandedRows<Item, typeof row>(row, $expandedIds)
                })
            })
        }

        return {
            pluginState,
            deriveRows
        }
    }
