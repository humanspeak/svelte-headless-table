import { keyed } from '@humanspeak/svelte-keyed'
import type { RenderConfig } from '@humanspeak/svelte-render'
import { derived, writable, type Readable, type Writable } from 'svelte/store'
import type { DataBodyCell } from '../bodyCells.js'
import type { BodyRow } from '../bodyRows.js'
import type { PluginInitTableState } from '../createViewModel.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addColumnFilters plugin.
 */
export interface ColumnFiltersConfig {
    /** If true, filtering is handled server-side and all rows are returned. */
    serverSide?: boolean
}

/**
 * State exposed by the addColumnFilters plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface ColumnFiltersState<Item> {
    /** Writable store containing filter values keyed by column ID. */
    filterValues: Writable<Record<string, unknown>>
    /** Readable store containing rows before filtering was applied. */
    preFilteredRows: Readable<BodyRow<Item>[]>
}

/**
 * Per-column configuration options for column filters.
 *
 * @template Item - The type of data items in the table.
 * @template FilterValue - The type of the filter value.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ColumnFiltersColumnOptions<Item, FilterValue = any> {
    /** The filter function to use for this column. */
    fn: ColumnFilterFn<FilterValue>
    /** Initial filter value for this column. */
    initialFilterValue?: FilterValue
    /** Optional render function for custom filter UI. */
    /* trunk-ignore(eslint/no-unused-vars) */
    render?: (props: ColumnRenderConfigPropArgs<Item, FilterValue>) => RenderConfig
}

/**
 * Props passed to the column filter render function.
 *
 * @template Item - The type of data items.
 * @template FilterValue - The type of the filter value.
 * @template Value - The type of cell values.
 */
interface ColumnRenderConfigPropArgs<
    Item,
    /* trunk-ignore(eslint/@typescript-eslint/no-explicit-any) */
    FilterValue = any,
    /* trunk-ignore(eslint/@typescript-eslint/no-explicit-any) */
    Value = any
> extends PluginInitTableState<Item> {
    /** The column ID. */
    id: string
    /** Writable store for the filter value. */
    filterValue: Writable<FilterValue>
    /** Readable store of all current column values (after filtering). */
    values: Readable<Value[]>
    /** Readable store of rows before filtering. */
    preFilteredRows: Readable<BodyRow<Item>[]>
    /** Readable store of all column values before filtering. */
    preFilteredValues: Readable<Value[]>
}

/**
 * Function type for column filter implementations.
 *
 * @template FilterValue - The type of the filter value.
 * @template Value - The type of cell values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ColumnFilterFn<FilterValue = any, Value = any> = (
    /* trunk-ignore(eslint/no-unused-vars) */
    props: ColumnFilterFnProps<FilterValue, Value>
) => boolean

/**
 * Props passed to a ColumnFilterFn.
 *
 * @template FilterValue - The type of the filter value.
 * @template Value - The type of cell values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ColumnFilterFnProps<FilterValue = any, Value = any> = {
    /** The current filter value for this column. */
    filterValue: FilterValue
    /** The cell value being tested. */
    value: Value
}

/**
 * Props added to header cells by the column filters plugin.
 */
export type ColumnFiltersPropSet = NewTablePropSet<{
    'thead.tr.th':
        | {
              /** The rendered filter component. */
              render?: RenderConfig
          }
        | undefined
}>

/**
 * Filters rows based on column filter values.
 * @internal
 */
const getFilteredRows = <Item, Row extends BodyRow<Item>>(
    rows: Row[],
    filterValues: Record<string, unknown>,
    columnOptions: Record<string, ColumnFiltersColumnOptions<Item>>
): Row[] => {
    const $filteredRows = rows
        // Filter `subRows`
        .map((row) => {
            const { subRows } = row
            if (subRows === undefined) {
                return row
            }
            const filteredSubRows = getFilteredRows(subRows, filterValues, columnOptions)
            const clonedRow = row.clone() as Row
            clonedRow.subRows = filteredSubRows
            return clonedRow
        })
        .filter((row) => {
            if ((row.subRows?.length ?? 0) !== 0) {
                return true
            }
            for (const [columnId, columnOption] of Object.entries(columnOptions)) {
                const bodyCell = row.cellForId[columnId]
                if (!bodyCell.isData()) {
                    continue
                }
                const { value } = bodyCell
                const filterValue = filterValues[columnId]
                if (filterValue === undefined) {
                    continue
                }
                const isMatch = columnOption.fn({ value, filterValue })
                if (!isMatch) {
                    return false
                }
            }
            return true
        })
    return $filteredRows
}

/**
 * Creates a column filters plugin that enables per-column filtering with custom filter functions.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides column filtering functionality.
 * @example
 * ```typescript
 * const table = createTable(data, {
 *   colFilter: addColumnFilters()
 * })
 *
 * // Configure per-column in column definitions:
 * table.column({
 *   accessor: 'status',
 *   header: 'Status',
 *   plugins: {
 *     colFilter: {
 *       fn: matchFilter,
 *       initialFilterValue: undefined
 *     }
 *   }
 * })
 * ```
 */
export const addColumnFilters =
    <Item>({ serverSide = false }: ColumnFiltersConfig = {}): TablePlugin<
        Item,
        ColumnFiltersState<Item>,
        ColumnFiltersColumnOptions<Item>,
        ColumnFiltersPropSet
    > =>
    ({ columnOptions, tableState }) => {
        const filterValues = writable<Record<string, unknown>>({})
        const preFilteredRows = writable<BodyRow<Item>[]>([])
        const filteredRows = writable<BodyRow<Item>[]>([])

        const pluginState: ColumnFiltersState<Item> = { filterValues, preFilteredRows }

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            return derived([rows, filterValues], ([$rows, $filterValues]) => {
                preFilteredRows.set($rows)
                if (serverSide) {
                    filteredRows.set($rows)
                    return $rows
                }
                const _filteredRows = getFilteredRows($rows, $filterValues, columnOptions)
                filteredRows.set(_filteredRows)
                return _filteredRows
            })
        }

        return {
            pluginState,
            deriveRows,
            hooks: {
                'thead.tr.th': (headerCell) => {
                    const filterValue = keyed(filterValues, headerCell.id)
                    const props = derived([], () => {
                        const columnOption = columnOptions[headerCell.id]
                        if (columnOption === undefined) {
                            return undefined
                        }
                        filterValue.set(columnOption.initialFilterValue)
                        const preFilteredValues = derived(preFilteredRows, ($rows) => {
                            if (headerCell.isData()) {
                                return $rows.map((row) => {
                                    // TODO check and handle different BodyCell types
                                    const cell = row.cellForId[headerCell.id] as DataBodyCell<Item>
                                    return cell?.value
                                })
                            }
                            return []
                        })
                        const values = derived(filteredRows, ($rows) => {
                            if (headerCell.isData()) {
                                return $rows.map((row) => {
                                    // TODO check and handle different BodyCell types
                                    const cell = row.cellForId[headerCell.id] as DataBodyCell<Item>
                                    return cell?.value
                                })
                            }
                            return []
                        })
                        const render = columnOption.render?.({
                            id: headerCell.id,
                            filterValue,
                            ...tableState,
                            values,
                            preFilteredRows,
                            preFilteredValues
                        })
                        return { render }
                    })
                    return { props }
                }
            }
        }
    }

/**
 * A filter function that matches exact values.
 * Returns true if filterValue is undefined or equals the cell value.
 *
 * @param props - The filter props containing filterValue and value.
 * @returns True if the value matches the filter.
 */
export const matchFilter: ColumnFilterFn<unknown, unknown> = ({ filterValue, value }) => {
    if (filterValue === undefined) {
        return true
    }
    return filterValue === value
}

/**
 * A filter function that matches text by prefix (case-insensitive).
 * Returns true if filterValue is empty or value starts with filterValue.
 *
 * @param props - The filter props containing filterValue and value.
 * @returns True if the value starts with the filter text.
 */
export const textPrefixFilter: ColumnFilterFn<string, string> = ({ filterValue, value }) => {
    if (filterValue === '') {
        return true
    }
    return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase())
}

/**
 * A filter function that matches numbers within a range.
 * The range is [min, max] inclusive. Use null for unbounded.
 *
 * @param props - The filter props with a [min, max] filterValue and numeric value.
 * @returns True if the value is within the specified range.
 * @example
 * ```typescript
 * numberRangeFilter({ filterValue: [10, 50], value: 25 }) // true
 * numberRangeFilter({ filterValue: [null, 100], value: 50 }) // true (no min)
 * ```
 */
export const numberRangeFilter: ColumnFilterFn<[number | null, number | null], number> = ({
    filterValue: [min, max],
    value
}) => {
    return (min ?? -Infinity) <= value && value <= (max ?? Infinity)
}
