import { keyed } from '@humanspeak/svelte-keyed'
import { derived, readable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { recordSetStore, type RecordSetStore } from '../utils/store.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ExpandedRowsConfig<Item> {
    initialExpandedIds?: Record<string, boolean>
}

export interface ExpandedRowsState<Item> {
    expandedIds: RecordSetStore<string>
    getRowState: (row: BodyRow<Item>) => ExpandedRowsRowState
}

export interface ExpandedRowsRowState {
    isExpanded: Writable<boolean>
    canExpand: Readable<boolean>
    isAllSubRowsExpanded: Readable<boolean>
}

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

export const addExpandedRows =
    <Item>({ initialExpandedIds = {} }: ExpandedRowsConfig<Item> = {}): TablePlugin<
        Item,
        ExpandedRowsState<Item>,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    () => {
        const expandedIds = recordSetStore(initialExpandedIds)

        // Cache for memoized row state to avoid creating new store instances on each call
        const rowStateCache = new Map<string, ExpandedRowsRowState>()

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
        const pluginState = { expandedIds, getRowState }

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
