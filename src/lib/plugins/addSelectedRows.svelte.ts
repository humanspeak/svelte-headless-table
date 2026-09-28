import type { BodyRow } from '../bodyRows.js'
import { derivedBox, RecordSet, type Box, type ReadonlyBox } from '../reactivity.svelte.js'
import type { NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { nonNull } from '../utils/filter.js'

/**
 * Configuration options for the addSelectedRows plugin.
 *
 * @template _Item - The type of data items (unused but required for type inference).
 */
export interface SelectedRowsConfig<_Item> {
    /** Initial selection state keyed by data ID. */
    initialSelectedDataIds?: Record<string, boolean> | undefined
    /** If true, selecting a parent row selects all its sub-rows. Defaults to true. */
    linkDataSubRows?: boolean | undefined
}

/**
 * State exposed by the addSelectedRows plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface SelectedRowsState<Item> {
    /** The selected data IDs. */
    selectedDataIds: RecordSet
    /** Whether every row is selected. Writing `true` selects every row; `false` clears the selection. */
    allRowsSelected: Box<boolean>
    /** Whether any row is selected. */
    someRowsSelected: ReadonlyBox<boolean>
    /** Whether every row on the current page is selected. Writing selects or deselects the page's rows. */
    allPageRowsSelected: Box<boolean>
    /** Whether any row on the current page is selected. */
    somePageRowsSelected: ReadonlyBox<boolean>
    /**
     * Gets the selection state of a row. The returned views hold no state of
     * their own (they read `selectedDataIds`), so they never go stale and need
     * no cleanup; the same row object returns the same views.
     */
    getRowState: (_row: BodyRow<Item>) => SelectedRowsRowState
}

/**
 * Selection state for a single row.
 */
export interface SelectedRowsRowState {
    /**
     * Whether the row is selected. Writing selects or deselects the row (and,
     * with `linkDataSubRows`, its sub-rows) and updates its parent.
     */
    isSelected: Box<boolean>
    /** Whether some (but not all) sub-rows are selected. */
    isSomeSubRowsSelected: ReadonlyBox<boolean>
    /** Whether all sub-rows are selected. */
    isAllSubRowsSelected: ReadonlyBox<boolean>
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
    selectedDataIdsValue: Record<string, boolean>,
    linkDataSubRows: boolean
): boolean => {
    if (row.isData()) {
        if (!linkDataSubRows || row.subRows === undefined) {
            return selectedDataIdsValue[row.dataId] === true
        }
    }
    if (row.subRows === undefined) {
        return false
    }
    return row.subRows.every((subRow) =>
        isAllSubRowsSelectedForRow(subRow, selectedDataIdsValue, linkDataSubRows)
    )
}

/**
 * Recursively checks if any sub-rows of a row are selected.
 * @internal
 */
const isSomeSubRowsSelectedForRow = <Item>(
    row: BodyRow<Item>,
    selectedDataIdsValue: Record<string, boolean>,
    linkDataSubRows: boolean
): boolean => {
    if (row.isData()) {
        if (!linkDataSubRows || row.subRows === undefined) {
            return selectedDataIdsValue[row.dataId] === true
        }
    }
    if (row.subRows === undefined) {
        return false
    }
    return row.subRows.some((subRow) =>
        isSomeSubRowsSelectedForRow(subRow, selectedDataIdsValue, linkDataSubRows)
    )
}

/**
 * Recursively writes selection state for a row and its sub-rows.
 * @internal
 */
const writeSelectedDataIds = <Item>(
    row: BodyRow<Item>,
    value: boolean,
    selectedDataIdsValue: Record<string, boolean>,
    linkDataSubRows: boolean
): void => {
    if (row.isData()) {
        selectedDataIdsValue[row.dataId] = value
        if (!linkDataSubRows) {
            return
        }
    }
    if (row.subRows === undefined) {
        return
    }
    row.subRows.forEach((subRow) => {
        writeSelectedDataIds(subRow, value, selectedDataIdsValue, linkDataSubRows)
    })
}

/**
 * Creates a writable view of a row's selection state over `selectedDataIds`.
 * @internal
 */
const getRowIsSelected = <Item>(
    row: BodyRow<Item>,
    selectedDataIds: RecordSet,
    linkDataSubRows: boolean
): Box<boolean> => ({
    get current() {
        const selectedDataIdsValue = selectedDataIds.current
        if (row.isData()) {
            if (!linkDataSubRows) {
                return selectedDataIdsValue[row.dataId] === true
            }
            if (selectedDataIdsValue[row.dataId] === true) {
                return true
            }
        }
        return isAllSubRowsSelectedForRow(row, selectedDataIdsValue, linkDataSubRows)
    },
    set current(value) {
        const updatedSelectedDataIds = { ...selectedDataIds.current }
        writeSelectedDataIds(row, value, updatedSelectedDataIds, linkDataSubRows)
        if (row.parentRow?.isData()) {
            updatedSelectedDataIds[row.parentRow.dataId] = isAllSubRowsSelectedForRow(
                row.parentRow,
                updatedSelectedDataIds,
                linkDataSubRows
            )
        }
        // `RecordSet` drops the `false` entries.
        selectedDataIds.current = updatedSelectedDataIds
    }
})

/**
 * Creates a row selection plugin that enables selecting/deselecting table rows.
 * Supports hierarchical selection with parent-child row linking.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides row selection functionality.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
 *   select: addSelectedRows({
 *     linkDataSubRows: true // Selecting parent selects children
 *   })
 * })
 *
 * // Access selection state
 * const { selectedDataIds, allRowsSelected } = viewModel.pluginStates.select
 *
 * // Select all rows
 * allRowsSelected.current = true
 *
 * // Check if a specific row is selected
 * const rowState = viewModel.pluginStates.select.getRowState(row)
 * rowState.isSelected.current // true or false
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
        const selectedDataIds = new RecordSet<string>(initialSelectedDataIds)

        // Views read `selectedDataIds` on access and own no reactive state, so
        // they cannot go stale. A WeakMap keeps one view per row object without
        // an eviction policy or an `invalidate()` call (v6 keyed an LRU cache by
        // `row.id`, which forced both).
        const rowStates = new WeakMap<BodyRow<Item>, SelectedRowsRowState>()

        const getRowState = (row: BodyRow<Item>): SelectedRowsRowState => {
            const cached = rowStates.get(row)
            if (cached !== undefined) {
                return cached
            }
            const isSelected = getRowIsSelected(row, selectedDataIds, linkDataSubRows)
            const isSomeSubRowsSelected: ReadonlyBox<boolean> = {
                get current() {
                    if (isSelected.current) return false
                    return isSomeSubRowsSelectedForRow(
                        row,
                        selectedDataIds.current,
                        linkDataSubRows
                    )
                }
            }
            const isAllSubRowsSelected: ReadonlyBox<boolean> = {
                get current() {
                    return isAllSubRowsSelectedForRow(row, selectedDataIds.current, linkDataSubRows)
                }
            }
            const state: SelectedRowsRowState = {
                isSelected,
                isSomeSubRowsSelected,
                isAllSubRowsSelected
            }
            rowStates.set(row, state)
            return state
        }

        const dataIdsOf = (rows: BodyRow<Item>[]): string[] =>
            rows.map((row) => (row.isData() ? row.dataId : null)).filter(nonNull)

        const everySelected = (rows: BodyRow<Item>[]): boolean => {
            const selectedDataIdsValue = selectedDataIds.current
            return rows.every((row) => {
                if (!row.isData()) {
                    return true
                }
                return selectedDataIdsValue[row.dataId] === true
            })
        }

        const someSelected = (rows: BodyRow<Item>[]): boolean => {
            const selectedDataIdsValue = selectedDataIds.current
            return rows.some((row) => {
                if (!row.isData()) {
                    return false
                }
                return selectedDataIdsValue[row.dataId] === true
            })
        }

        // all rows
        const allRowsSelectedValue = derivedBox(() => everySelected(tableState.rows()))
        const allRowsSelected: Box<boolean> = {
            get current() {
                return allRowsSelectedValue.current
            },
            set current(value) {
                if (value) {
                    selectedDataIds.addAll(dataIdsOf(tableState.rows()))
                } else {
                    selectedDataIds.clear()
                }
            }
        }

        const someRowsSelected = derivedBox(() => someSelected(tableState.rows()))

        // page rows
        const allPageRowsSelectedValue = derivedBox(() => everySelected(tableState.pageRows()))
        const allPageRowsSelected: Box<boolean> = {
            get current() {
                return allPageRowsSelectedValue.current
            },
            set current(value) {
                const pageDataIds = dataIdsOf(tableState.pageRows())
                if (value) {
                    selectedDataIds.addAll(pageDataIds)
                } else {
                    selectedDataIds.removeAll(pageDataIds)
                }
            }
        }

        const somePageRowsSelected = derivedBox(() => someSelected(tableState.pageRows()))

        const pluginState: SelectedRowsState<Item> = {
            selectedDataIds,
            getRowState,
            allRowsSelected,
            someRowsSelected,
            allPageRowsSelected,
            somePageRowsSelected
        }

        return {
            pluginState,
            hooks: {
                'tbody.tr': (row) => ({
                    props: () => {
                        const selectedDataIdsValue = selectedDataIds.current
                        const someSubRowsSelected = isSomeSubRowsSelectedForRow(
                            row,
                            selectedDataIdsValue,
                            linkDataSubRows
                        )
                        const allSubRowsSelected = isAllSubRowsSelectedForRow(
                            row,
                            selectedDataIdsValue,
                            linkDataSubRows
                        )
                        const selected = row.isData()
                            ? selectedDataIdsValue[row.dataId] === true
                            : allSubRowsSelected
                        return {
                            selected,
                            someSubRowsSelected,
                            allSubRowsSelected
                        }
                    }
                })
            }
        }
    }
