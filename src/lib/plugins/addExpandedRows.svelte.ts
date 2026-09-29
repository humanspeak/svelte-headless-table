import type { BodyRow } from '../bodyRows.js'
import { RecordSet, type Box, type ReadonlyBox } from '../reactivity.svelte.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addExpandedRows plugin.
 *
 * @template _Item - The type of data items (unused but required for type inference).
 */
export interface ExpandedRowsConfig<_Item> {
    /** Initial expanded state keyed by row ID. */
    initialExpandedIds?: Record<string, boolean> | undefined
}

/**
 * State exposed by the addExpandedRows plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface ExpandedRowsState<Item> {
    /** The expanded row IDs. */
    expandedIds: RecordSet
    /**
     * Gets the expansion state of a row. The returned object holds no state of
     * its own (it reads `expandedIds`), so it is safe to call anywhere,
     * including inside a template; the same row object returns the same view.
     */
    getRowState: (_row: BodyRow<Item>) => ExpandedRowsRowState
}

/**
 * Expansion state for a single row.
 */
export interface ExpandedRowsRowState {
    /** Whether the row is expanded. Writing adds or removes the row's ID in `expandedIds`. */
    isExpanded: Box<boolean>
    /** Whether the row can be expanded: `true` while it has sub-rows. Read on access. */
    canExpand: boolean
    /** Whether every expandable sub-row is expanded. */
    isAllSubRowsExpanded: ReadonlyBox<boolean>
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
    if (!expandedIds[row.id]) {
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
 * const table = createTable(() => data, {
 *   expand: addExpandedRows({
 *     initialExpandedIds: { '0': true } // Row 0 starts expanded
 *   })
 * })
 *
 * // Toggle expansion
 * const rowState = viewModel.pluginStates.expand.getRowState(row)
 * rowState.isExpanded.current = !rowState.isExpanded.current
 * ```
 */
export const addExpandedRows =
    <Item>({ initialExpandedIds = {} }: ExpandedRowsConfig<Item> = {}): TablePlugin<
        Item,
        ExpandedRowsState<Item>,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    ({ tableState }) => {
        const expandedIds = new RecordSet(initialExpandedIds)

        // Every member of a view, including `canExpand`, is read on access
        // (from `expandedIds` and the row), and views own no reactive state,
        // so they cannot go stale. A WeakMap keeps one view per row object
        // without an eviction policy or an `invalidate()` call.
        const rowStates = new WeakMap<BodyRow<Item>, ExpandedRowsRowState>()

        const getRowState = (row: BodyRow<Item>): ExpandedRowsRowState => {
            const cached = rowStates.get(row)
            if (cached !== undefined) {
                return cached
            }
            const isExpanded: Box<boolean> = {
                get current() {
                    return expandedIds.has(row.id)
                },
                set current(expanded) {
                    if (expanded) {
                        expandedIds.add(row.id)
                    } else {
                        expandedIds.remove(row.id)
                    }
                }
            }
            const isAllSubRowsExpanded: ReadonlyBox<boolean> = {
                get current() {
                    if (row.subRows === undefined) {
                        return true
                    }
                    // Check prefix with '>' to match child ids while ignoring this row's id.
                    const expandedSubRowCount = Object.keys(expandedIds.current).filter((id) =>
                        id.startsWith(`${row.id}>`)
                    ).length
                    // canExpand is derived from the presence of the `subRows` property.
                    const expandableSubRows = row.subRows.filter(
                        (subRow) => subRow.subRows !== undefined
                    )
                    return expandedSubRowCount === expandableSubRows.length
                }
            }
            const state: ExpandedRowsRowState = {
                isExpanded,
                get canExpand() {
                    // Tracks the rows derivation, so a template re-reads this when
                    // sub-rows are attached by a re-derive.
                    tableState.rows()
                    return (row.subRows?.length ?? 0) > 0
                },
                isAllSubRowsExpanded
            }
            rowStates.set(row, state)
            return state
        }

        const pluginState: ExpandedRowsState<Item> = { expandedIds, getRowState }

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            const expanded = $derived.by(() => {
                const expandedValue = expandedIds.current
                return rows().flatMap((row) =>
                    withExpandedRows<Item, typeof row>(row, expandedValue)
                )
            })
            return () => expanded
        }

        return {
            pluginState,
            deriveRows
        }
    }
