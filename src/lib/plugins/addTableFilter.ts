import { derived, writable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { recordSetStore } from '../utils/store.js'
import { textPrefixFilter } from './addColumnFilters.js'

export interface TableFilterConfig {
    fn?: TableFilterFn
    initialFilterValue?: string
    includeHiddenColumns?: boolean
    serverSide?: boolean
}

export interface TableFilterState<Item> {
    filterValue: Writable<string>
    preFilteredRows: Readable<BodyRow<Item>[]>
}

// Item generic needed to infer type on `getFilteredRows`
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface TableFilterColumnOptions<Item> {
    exclude?: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFilterValue?: (value: any) => string
}

export type TableFilterFn = (props: TableFilterFnProps) => boolean

export type TableFilterFnProps = {
    filterValue: string
    value: string
}

export type TableFilterPropSet = NewTablePropSet<{
    'tbody.tr.td': {
        matches: boolean
    }
}>

export interface RowMatchesFilterOptions<Item> {
    columnOptions: Record<string, TableFilterColumnOptions<Item>>
    filterValue: string
    fn: TableFilterFn
    includeHiddenColumns: boolean
    tableCellMatches: Record<string, boolean>
}

/**
 * Check if a row matches the filter criteria.
 * Returns true if any cell in the row matches the filter.
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

interface GetFilteredRowsOptions<Item> {
    columnOptions: Record<string, TableFilterColumnOptions<Item>>
    tableCellMatches: Record<string, boolean>
    fn: TableFilterFn
    includeHiddenColumns: boolean
}

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
