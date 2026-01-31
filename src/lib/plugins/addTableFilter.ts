import { derived, writable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { recordSetStore } from '../utils/store.js'
import { textPrefixFilter } from './addColumnFilters.js'

/**
 * Configuration options for the addTableFilter plugin.
 */
export interface TableFilterConfig {
    /** Custom filter function. Defaults to textPrefixFilter. */
    fn?: TableFilterFn
    /** Initial filter value. Defaults to empty string. */
    initialFilterValue?: string
    /** Whether to include hidden columns in the filter. Defaults to false. */
    includeHiddenColumns?: boolean
    /** If true, filtering is handled server-side and all rows are returned. Defaults to false. */
    serverSide?: boolean
}

/**
 * State exposed by the addTableFilter plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface TableFilterState<Item> {
    /** Writable store containing the current filter value. */
    filterValue: Writable<string>
    /** Readable store containing the rows before filtering was applied. */
    preFilteredRows: Readable<BodyRow<Item>[]>
}

/**
 * Per-column configuration options for the table filter.
 *
 * @template _Item - The type of data items (unused but required for type inference).
 */
// Item generic needed to infer type on `getFilteredRows`
/* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
export interface TableFilterColumnOptions<_Item> {
    /** If true, this column is excluded from filtering. */
    exclude?: boolean
    /** Custom function to extract the filter value from the cell value. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFilterValue?: (_value: any) => string
}

/**
 * Function type for custom filter implementations.
 *
 * @param props - The filter function props containing the filter value and cell value.
 * @returns True if the value matches the filter.
 */
export type TableFilterFn = (_props: TableFilterFnProps) => boolean

/**
 * Props passed to a TableFilterFn.
 */
export type TableFilterFnProps = {
    /** The current filter value entered by the user. */
    filterValue: string
    /** The string value of the cell being tested. */
    value: string
}

/**
 * Props added to tbody.tr.td elements by the table filter plugin.
 */
export type TableFilterPropSet = NewTablePropSet<{
    'tbody.tr.td': {
        /** True if this cell matches the current filter. */
        matches: boolean
    }
}>

/**
 * Options for the rowMatchesFilter function.
 *
 * @template Item - The type of data items in the table.
 */
export interface RowMatchesFilterOptions<Item> {
    /** Per-column filter configuration. */
    columnOptions: Record<string, TableFilterColumnOptions<Item>>
    /** The current filter value. */
    filterValue: string
    /** The filter function to use. */
    fn: TableFilterFn
    /** Whether to include hidden columns in filtering. */
    includeHiddenColumns: boolean
    /** Record to track which cells matched the filter. */
    tableCellMatches: Record<string, boolean>
}

/**
 * Checks if a row matches the filter criteria.
 * Uses O(1) Set-based lookups for visibility checks instead of O(m) array searches.
 *
 * @template Item - The type of data items in the table.
 * @param row - The row to check.
 * @param options - The filter options.
 * @returns True if any cell in the row matches the filter, or if the row has subRows.
 */
export const rowMatchesFilter = <Item>(
    row: BodyRow<Item>,
    options: RowMatchesFilterOptions<Item>
): boolean => {
    const { columnOptions, filterValue, fn, includeHiddenColumns, tableCellMatches } = options

    // Parent rows with children are always included
    if ((row.subRows?.length ?? 0) !== 0) {
        return true
    }

    // Pre-compute visible cell IDs once per row - O(m)
    // This is the optimization: uses Set.has() which is O(1) instead of .find() which is O(m)
    const visibleCellIds = new Set(row.cells.map((c) => c.id))

    const rowCellMatches = Object.values(row.cellForId).map((cell) => {
        const cellOptions = columnOptions[cell.id] as TableFilterColumnOptions<Item> | undefined
        if (cellOptions?.exclude === true) {
            return false
        }

        // O(1) lookup instead of O(m) .find()
        const isHidden = !visibleCellIds.has(cell.id)
        if (isHidden && !includeHiddenColumns) {
            return false
        }

        if (!cell.isData()) {
            return false
        }

        let value = cell.value
        if (cellOptions?.getFilterValue !== undefined) {
            value = cellOptions.getFilterValue(value)
        }

        const matches = fn({ value: String(value), filterValue })
        if (matches) {
            const dataRowColId = cell.dataRowColId()
            if (dataRowColId !== undefined) {
                tableCellMatches[dataRowColId] = matches
            }
        }
        return matches
    })

    return rowCellMatches.includes(true)
}

/**
 * Internal options for the getFilteredRows function.
 * @internal
 */
interface GetFilteredRowsOptions<Item> {
    columnOptions: Record<string, TableFilterColumnOptions<Item>>
    tableCellMatches: Record<string, boolean>
    fn: TableFilterFn
    includeHiddenColumns: boolean
}

/**
 * Recursively filters rows and their subRows based on the filter criteria.
 *
 * @template Item - The type of data items in the table.
 * @template Row - The row type.
 * @param rows - The rows to filter.
 * @param filterValue - The current filter value.
 * @param options - The filter options.
 * @returns The filtered rows array.
 * @internal
 */
const getFilteredRows = <Item, Row extends BodyRow<Item>>(
    rows: Row[],
    filterValue: string,
    options: GetFilteredRowsOptions<Item>
): Row[] => {
    const { columnOptions, tableCellMatches, fn, includeHiddenColumns } = options
    const $filteredRows = rows
        // Filter `subRows`
        .map((row) => {
            const { subRows } = row
            if (subRows === undefined) {
                return row
            }
            const filteredSubRows = getFilteredRows(subRows, filterValue, options)
            const clonedRow = row.clone() as Row
            clonedRow.subRows = filteredSubRows
            return clonedRow
        })
        .filter((row) =>
            rowMatchesFilter(row, {
                columnOptions,
                filterValue,
                fn,
                includeHiddenColumns,
                tableCellMatches
            })
        )
    return $filteredRows
}

/**
 * Creates a table filter plugin that enables filtering rows by text search across columns.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options for the filter.
 * @returns A TablePlugin that provides filtering functionality.
 * @example
 * ```typescript
 * const table = createTable(data, {
 *   filter: addTableFilter({
 *     fn: ({ filterValue, value }) => value.toLowerCase().includes(filterValue.toLowerCase()),
 *     initialFilterValue: '',
 *     includeHiddenColumns: false
 *   })
 * })
 *
 * // Access the filter state
 * const { filterValue } = table.pluginStates.filter
 * filterValue.set('search term')
 * ```
 */
export const addTableFilter =
    <Item>({
        fn = textPrefixFilter,
        initialFilterValue = '',
        includeHiddenColumns = false,
        serverSide = false
    }: TableFilterConfig = {}): TablePlugin<
        Item,
        TableFilterState<Item>,
        TableFilterColumnOptions<Item>,
        TableFilterPropSet
    > =>
    ({ columnOptions }) => {
        const filterValue = writable(initialFilterValue)
        const preFilteredRows = writable<BodyRow<Item>[]>([])
        const tableCellMatches = recordSetStore()

        const pluginState: TableFilterState<Item> = { filterValue, preFilteredRows }

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            return derived([rows, filterValue], ([$rows, $filterValue]) => {
                preFilteredRows.set($rows)
                tableCellMatches.clear()
                const $tableCellMatches: Record<string, boolean> = {}
                const $filteredRows = getFilteredRows($rows, $filterValue, {
                    columnOptions,
                    tableCellMatches: $tableCellMatches,
                    fn,
                    includeHiddenColumns
                })
                tableCellMatches.set($tableCellMatches)
                if (serverSide) {
                    return $rows
                }
                return $filteredRows
            })
        }

        return {
            pluginState,
            deriveRows,
            hooks: {
                'tbody.tr.td': (cell) => {
                    const props = derived(
                        [filterValue, tableCellMatches],
                        ([$filterValue, $tableCellMatches]) => {
                            const dataRowColId = cell.dataRowColId()
                            return {
                                matches:
                                    $filterValue !== '' &&
                                    dataRowColId !== undefined &&
                                    ($tableCellMatches[dataRowColId] ?? false)
                            }
                        }
                    )
                    return { props }
                }
            }
        }
    }
