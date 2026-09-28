import { untrack } from 'svelte'
import type { BodyRow } from '../bodyRows.js'
import type { PluginInitTableState } from '../createViewModel.svelte.js'
import {
    box,
    derivedBox,
    keyedBox,
    type Box,
    type Getter,
    type ReadonlyBox
} from '../reactivity.svelte.js'
import type { RenderConfig } from '../render/createRender.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addColumnFilters plugin.
 */
export interface ColumnFiltersConfig {
    /** If true, filtering is handled server-side and all rows are returned. */
    serverSide?: boolean | undefined
    /**
     * How rows with sub-rows are matched.
     *
     * - `'self-or-descendants'` (default): a row is kept when it matches or
     *   when any of its descendants match, so a non-matching parent still
     *   appears above its matching children.
     * - `'self'`: every kept row must match on its own values; a parent that
     *   does not match is removed together with its subtree.
     */
    matchMode?: ColumnFiltersMatchMode | undefined
}

/** Sub-row matching strategy for {@link addColumnFilters}. */
export type ColumnFiltersMatchMode = 'self-or-descendants' | 'self'

/**
 * State exposed by the addColumnFilters plugin.
 *
 * @template Item - The type of data items in the table.
 */
export interface ColumnFiltersState<Item> {
    /**
     * Filter values keyed by column ID. Assign a new record to change them; a
     * column without a value (or with `undefined`) is not filtered.
     */
    filterValues: Box<Record<string, unknown>>
    /** The rows before filtering was applied. */
    preFilteredRows: ReadonlyBox<BodyRow<Item>[]>
}

/**
 * Per-column configuration options for column filters.
 *
 * @template Item - The type of data items in the table.
 * @template FilterValue - The type of the filter value.
 */
// `any` default: column options are not tied to the column's value type, so user
// callbacks must be free to treat the filter value as their own type.
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
export interface ColumnFiltersColumnOptions<Item, FilterValue = any> {
    /** The filter function to use for this column. */
    fn: ColumnFilterFn<FilterValue>
    /** Initial filter value for this column, applied when the view model is created. */
    initialFilterValue?: FilterValue
    /**
     * Optional render function for custom filter UI. Called once per header
     * cell (untracked); read the boxes it receives inside the returned
     * component or snippet to stay reactive.
     */
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
    // `any` defaults: user render callbacks read these as their own filter/cell value types.
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    FilterValue = any,
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    Value = any
> extends PluginInitTableState<Item> {
    /** The column ID. */
    id: string
    /** The column's filter value; writing `undefined` clears it. */
    filterValue: Box<FilterValue>
    /** All current column values (after filtering). */
    values: ReadonlyBox<Value[]>
    /** The rows before filtering. */
    preFilteredRows: ReadonlyBox<BodyRow<Item>[]>
    /** All column values before filtering. */
    preFilteredValues: ReadonlyBox<Value[]>
}

/**
 * Function type for column filter implementations.
 *
 * @template FilterValue - The type of the filter value.
 * @template Value - The type of cell values.
 */
// `any` defaults: user filter functions read these as their own filter/cell value types.
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
export type ColumnFilterFn<FilterValue = any, Value = any> = (
    props: ColumnFilterFnProps<FilterValue, Value>
) => boolean

/**
 * Props passed to a ColumnFilterFn.
 *
 * @template FilterValue - The type of the filter value.
 * @template Value - The type of cell values.
 */
// trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
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
              render?: RenderConfig | undefined
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
    columnOptions: Record<string, ColumnFiltersColumnOptions<Item>>,
    matchMode: ColumnFiltersMatchMode = 'self-or-descendants'
): Row[] => {
    const filteredRows = rows
        // Filter `subRows`
        .map((row) => {
            const { subRows } = row
            if (subRows === undefined) {
                return row
            }
            const filteredSubRows = getFilteredRows(subRows, filterValues, columnOptions, matchMode)
            const clonedRow = row.clone() as Row
            clonedRow.subRows = filteredSubRows
            return clonedRow
        })
        .filter((row) => {
            if (matchMode === 'self-or-descendants' && (row.subRows?.length ?? 0) !== 0) {
                return true
            }
            for (const [columnId, columnOption] of Object.entries(columnOptions)) {
                const bodyCell = row.cellForId[columnId]
                if (!bodyCell?.isData()) {
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
    return filteredRows
}

/**
 * Creates a column filters plugin that enables per-column filtering with custom filter functions.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides column filtering functionality.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
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
    <Item>({
        serverSide = false,
        matchMode = 'self-or-descendants'
    }: ColumnFiltersConfig = {}): TablePlugin<
        Item,
        ColumnFiltersState<Item>,
        ColumnFiltersColumnOptions<Item>,
        ColumnFiltersPropSet
    > =>
    ({ columnOptions, tableState }) => {
        // Initial filter values are applied here, when the view model creates
        // the plugin: hooks run while the view model derives, where writing
        // state is not allowed.
        const initialFilterValues: Record<string, unknown> = {}
        for (const [columnId, option] of Object.entries(columnOptions)) {
            if (option.initialFilterValue !== undefined) {
                initialFilterValues[columnId] = option.initialFilterValue
            }
        }
        const filterValues = box<Record<string, unknown>>(initialFilterValues)

        // Read through getters captured when the view model calls
        // `deriveRows`; nothing is written while deriving.
        let upstreamRows: Getter<BodyRow<Item>[]> = () => []
        let filteredRows: Getter<BodyRow<Item>[]> = () => []
        const preFilteredRows: ReadonlyBox<BodyRow<Item>[]> = {
            get current() {
                return upstreamRows()
            }
        }

        const pluginState: ColumnFiltersState<Item> = { filterValues, preFilteredRows }

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            upstreamRows = rows
            const filtered = $derived.by(() => {
                const rowsValue = rows()
                if (serverSide) {
                    return rowsValue
                }
                return getFilteredRows(rowsValue, filterValues.current, columnOptions, matchMode)
            })
            filteredRows = () => filtered
            return () => filtered
        }

        // Per-column value lists, created with the plugin (not inside a hook,
        // which runs during a derivation that may be owned by a short-lived
        // effect). Display columns have no values.
        const columnValues = (rows: BodyRow<Item>[], columnId: string): unknown[] =>
            rows.map((row) => {
                const cell = row.cellForId[columnId]
                return cell?.isData() ? cell.value : undefined
            })
        const valueBoxes: Record<
            string,
            { values: ReadonlyBox<unknown[]>; preFilteredValues: ReadonlyBox<unknown[]> }
        > = {}
        for (const columnId of Object.keys(columnOptions)) {
            const isData = tableState.flatColumns.some((c) => c.id === columnId && c.isData())
            valueBoxes[columnId] = {
                values: derivedBox(() => (isData ? columnValues(filteredRows(), columnId) : [])),
                preFilteredValues: derivedBox(() =>
                    isData ? columnValues(upstreamRows(), columnId) : []
                )
            }
        }

        return {
            pluginState,
            deriveRows,
            hooks: {
                'thead.tr.th': (headerCell) => {
                    const columnOption = columnOptions[headerCell.id]
                    const boxes = valueBoxes[headerCell.id]
                    if (columnOption === undefined || boxes === undefined) {
                        return { props: () => undefined }
                    }
                    // Called once per header cell. Untracked, so reads inside a
                    // user `render` do not become dependencies of the header rows.
                    const render = untrack(() =>
                        columnOption.render?.({
                            id: headerCell.id,
                            filterValue: keyedBox(filterValues, headerCell.id),
                            ...tableState,
                            values: boxes.values,
                            preFilteredRows,
                            preFilteredValues: boxes.preFilteredValues
                        })
                    )
                    const props = { render }
                    return { props: () => props }
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
export const textPrefixFilter: ColumnFilterFn<unknown, unknown> = ({ filterValue, value }) => {
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
