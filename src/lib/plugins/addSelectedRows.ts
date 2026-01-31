import { MemoryCache } from '@humanspeak/memory-cache'
import { derived, get, type Readable, type Updater, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { nonNull } from '../utils/filter.js'
import { recordSetStore, type RecordSetStore } from '../utils/store.js'
import { DEFAULT_ROW_STATE_CACHE_CONFIG } from './cacheConfig.js'

/**
 * Configuration options for the addSelectedRows plugin.
 *
 * @template _Item - The type of data items (unused but required for type inference).
 */
/* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
export interface SelectedRowsConfig<_Item> {
    /** Initial selection state keyed by data ID. */
    initialSelectedDataIds?: Record<string, boolean>
    /** If true, selecting a parent row selects all its sub-rows. Defaults to true. */
    linkDataSubRows?: boolean
}

/**
 * State exposed by the addSelectedRows plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface SelectedRowsState<Item> {
    /** Store containing selected data IDs. */
    selectedDataIds: RecordSetStore<string>
    /** Writable store for selecting/deselecting all rows. */
    allRowsSelected: Writable<boolean>
    /** Readable store indicating if any rows are selected. */
    someRowsSelected: Readable<boolean>
    /** Writable store for selecting/deselecting all rows on the current page. */
    allPageRowsSelected: Writable<boolean>
    /** Readable store indicating if any rows on the current page are selected. */
    somePageRowsSelected: Readable<boolean>
    /** Gets the selection state stores for a specific row. */
    getRowState: (_row: BodyRow<Item>) => SelectedRowsRowState
    /** Cleans up internal subscriptions and clears the row state cache. Call when destroying the table. */
    invalidate: () => void
}

/**
 * Selection state for a single row.
 */
export interface SelectedRowsRowState {
    /** Writable store for the row's selection state. */
    isSelected: Writable<boolean>
    /** Readable store indicating if some (but not all) sub-rows are selected. */
    isSomeSubRowsSelected: Readable<boolean>
    /** Readable store indicating if all sub-rows are selected. */
    isAllSubRowsSelected: Readable<boolean>
}

/**
 * Props added to table rows by the selected rows plugin.
 */
export type SelectedRowsPropSet = NewTablePropSet<{
    'tbody.tr': {
        /** Whether this row is selected. */
        selected: boolean
        /** Whether some (but not all) sub-rows are selected. */
        someSubRowsSelected: boolean
        /** Whether all sub-rows are selected. */
        allSubRowsSelected: boolean
    }
}>

/**
 * Recursively checks if all sub-rows of a row are selected.
 * @internal
 */
const isAllSubRowsSelectedForRow = <Item>(
    row: BodyRow<Item>,
    $selectedDataIds: Record<string, boolean>,
    linkDataSubRows: boolean
): boolean => {
    if (row.isData()) {
        if (!linkDataSubRows || row.subRows === undefined) {
            return $selectedDataIds[row.dataId] === true
        }
    }
    if (row.subRows === undefined) {
        return false
    }
    return row.subRows.every((subRow) =>
        isAllSubRowsSelectedForRow(subRow, $selectedDataIds, linkDataSubRows)
    )
}

/**
 * Recursively checks if any sub-rows of a row are selected.
 * @internal
 */
const isSomeSubRowsSelectedForRow = <Item>(
    row: BodyRow<Item>,
    $selectedDataIds: Record<string, boolean>,
    linkDataSubRows: boolean
): boolean => {
    if (row.isData()) {
        if (!linkDataSubRows || row.subRows === undefined) {
            return $selectedDataIds[row.dataId] === true
        }
    }
    if (row.subRows === undefined) {
        return false
    }
    return row.subRows.some((subRow) =>
        isSomeSubRowsSelectedForRow(subRow, $selectedDataIds, linkDataSubRows)
    )
}

/**
 * Recursively writes selection state for a row and its sub-rows.
 * @internal
 */
const writeSelectedDataIds = <Item>(
    row: BodyRow<Item>,
    value: boolean,
    $selectedDataIds: Record<string, boolean>,
    linkDataSubRows: boolean
): void => {
    if (row.isData()) {
        $selectedDataIds[row.dataId] = value
        if (!linkDataSubRows) {
            return
        }
    }
    if (row.subRows === undefined) {
        return
    }
    row.subRows.forEach((subRow) => {
        writeSelectedDataIds(subRow, value, $selectedDataIds, linkDataSubRows)
    })
}

/**
 * Creates a writable store for a row's selection state.
 * @internal
 */
const getRowIsSelectedStore = <Item>(
    row: BodyRow<Item>,
    selectedDataIds: RecordSetStore<string>,
    linkDataSubRows: boolean
): Writable<boolean> => {
    const { subscribe } = derived(selectedDataIds, ($selectedDataIds) => {
        if (row.isData()) {
            if (!linkDataSubRows) {
                return $selectedDataIds[row.dataId] === true
            }
            if ($selectedDataIds[row.dataId] === true) {
                return true
            }
        }
        return isAllSubRowsSelectedForRow(row, $selectedDataIds, linkDataSubRows)
    })
    const update = (fn: Updater<boolean>) => {
        selectedDataIds.update(($selectedDataIds) => {
            const oldValue = isAllSubRowsSelectedForRow(row, $selectedDataIds, linkDataSubRows)
            const $updatedSelectedDataIds = { ...$selectedDataIds }
            writeSelectedDataIds(row, fn(oldValue), $updatedSelectedDataIds, linkDataSubRows)
            if (row.parentRow !== undefined && row.parentRow.isData()) {
                $updatedSelectedDataIds[row.parentRow.dataId] = isAllSubRowsSelectedForRow(
                    row.parentRow,
                    $updatedSelectedDataIds,
                    linkDataSubRows
                )
            }
            return $updatedSelectedDataIds
        })
    }
    const set = (value: boolean) => update(() => value)
    return {
        subscribe,
        update,
        set
    }
}

/**
 * Creates a row selection plugin that enables selecting/deselecting table rows.
 * Supports hierarchical selection with parent-child row linking.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides row selection functionality.
 * @example
 * ```typescript
 * const table = createTable(data, {
 *   select: addSelectedRows({
 *     linkDataSubRows: true // Selecting parent selects children
 *   })
 * })
 *
 * // Access selection state
 * const { selectedDataIds, allRowsSelected } = table.pluginStates.select
 *
 * // Toggle all rows
 * allRowsSelected.set(true)
 *
 * // Check if a specific row is selected
 * const rowState = table.pluginStates.select.getRowState(row)
 * $rowState.isSelected // true or false
 * ```
 */
export const addSelectedRows =
    <Item>({
        initialSelectedDataIds = {},
        linkDataSubRows = true
    }: SelectedRowsConfig<Item> = {}): TablePlugin<
        Item,
        SelectedRowsState<Item>,
        Record<string, never>,
        SelectedRowsPropSet
    > =>
    ({ tableState }) => {
        const selectedDataIds = recordSetStore(initialSelectedDataIds)

        // LRU cache for memoized row state with automatic eviction.
        // Prevents unbounded memory growth when row identities change.
        const rowStateCache = new MemoryCache<SelectedRowsRowState>(DEFAULT_ROW_STATE_CACHE_CONFIG)

        const getRowState = (row: BodyRow<Item>): SelectedRowsRowState => {
            const cached = rowStateCache.get(row.id)
            if (cached !== undefined) {
                return cached
            }

            const isSelected = getRowIsSelectedStore(row, selectedDataIds, linkDataSubRows)
            const isSomeSubRowsSelected = derived(
                [isSelected, selectedDataIds],
                ([$isSelected, $selectedDataIds]) => {
                    if ($isSelected) return false
                    return isSomeSubRowsSelectedForRow(row, $selectedDataIds, linkDataSubRows)
                }
            )
            const isAllSubRowsSelected = derived(selectedDataIds, ($selectedDataIds) => {
                return isAllSubRowsSelectedForRow(row, $selectedDataIds, linkDataSubRows)
            })
            const state: SelectedRowsRowState = {
                isSelected,
                isSomeSubRowsSelected,
                isAllSubRowsSelected
            }
            rowStateCache.set(row.id, state)
            return state
        }

        // Clear cache when selectedDataIds store is cleared (data reset scenario)
        const unsubscribeSelectedDataIds = selectedDataIds.subscribe(($selectedDataIds) => {
            if (Object.keys($selectedDataIds).length === 0) {
                rowStateCache.clear()
            }
        })

        // Cleanup function to prevent subscription leaks when table is destroyed
        const invalidate = () => {
            unsubscribeSelectedDataIds()
            rowStateCache.clear()
        }

        // all rows
        const _allRowsSelected = derived(
            [tableState.rows, selectedDataIds],
            ([$rows, $selectedDataIds]) => {
                return $rows.every((row) => {
                    if (!row.isData()) {
                        return true
                    }
                    return $selectedDataIds[row.dataId] === true
                })
            }
        )
        const setAllRowsSelected = ($allRowsSelected: boolean) => {
            if ($allRowsSelected) {
                const $rows = get(tableState.rows)
                const allDataIds = $rows
                    .map((row) => (row.isData() ? row.dataId : null))
                    .filter(nonNull)
                selectedDataIds.addAll(allDataIds)
            } else {
                selectedDataIds.clear()
            }
        }
        const allRowsSelected: Writable<boolean> = {
            subscribe: _allRowsSelected.subscribe,
            update(fn) {
                const $allRowsSelected = get(_allRowsSelected)
                setAllRowsSelected(fn($allRowsSelected))
            },
            set: setAllRowsSelected
        }

        const someRowsSelected = derived(
            [tableState.rows, selectedDataIds],
            ([$rows, $selectedDataIds]) => {
                return $rows.some((row) => {
                    if (!row.isData()) {
                        return false
                    }
                    return $selectedDataIds[row.dataId] === true
                })
            }
        )

        // page rows
        const _allPageRowsSelected = derived(
            [tableState.pageRows, selectedDataIds],
            ([$pageRows, $selectedDataIds]) => {
                return $pageRows.every((row) => {
                    if (!row.isData()) {
                        return true
                    }
                    return $selectedDataIds[row.dataId] === true
                })
            }
        )
        const setAllPageRowsSelected = ($allPageRowsSelected: boolean) => {
            const $pageRows = get(tableState.pageRows)
            const pageDataIds = $pageRows
                .map((row) => (row.isData() ? row.dataId : null))
                .filter(nonNull)
            if ($allPageRowsSelected) {
                selectedDataIds.addAll(pageDataIds)
            } else {
                selectedDataIds.removeAll(pageDataIds)
            }
        }
        const allPageRowsSelected: Writable<boolean> = {
            subscribe: _allPageRowsSelected.subscribe,
            update(fn) {
                const $allPageRowsSelected = get(_allPageRowsSelected)
                setAllPageRowsSelected(fn($allPageRowsSelected))
            },
            set: setAllPageRowsSelected
        }

        const somePageRowsSelected = derived(
            [tableState.pageRows, selectedDataIds],
            ([$pageRows, $selectedDataIds]) => {
                return $pageRows.some((row) => {
                    if (!row.isData()) {
                        return false
                    }
                    return $selectedDataIds[row.dataId] === true
                })
            }
        )

        const pluginState = {
            selectedDataIds,
            getRowState,
            allRowsSelected,
            someRowsSelected,
            allPageRowsSelected,
            somePageRowsSelected,
            invalidate
        }

        return {
            pluginState,
            hooks: {
                'tbody.tr': (row) => {
                    const props = derived(selectedDataIds, ($selectedDataIds) => {
                        const someSubRowsSelected = isSomeSubRowsSelectedForRow(
                            row,
                            $selectedDataIds,
                            linkDataSubRows
                        )
                        const allSubRowsSelected = isAllSubRowsSelectedForRow(
                            row,
                            $selectedDataIds,
                            linkDataSubRows
                        )
                        const selected = row.isData()
                            ? $selectedDataIds[row.dataId] === true
                            : allSubRowsSelected
                        return {
                            selected,
                            someSubRowsSelected,
                            allSubRowsSelected
                        }
                    })
                    return { props }
                }
            }
        }
    }
