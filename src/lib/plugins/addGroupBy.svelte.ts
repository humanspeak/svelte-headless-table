import { DataBodyCell } from '../bodyCells.js'
import { type BodyRow, DisplayBodyRow } from '../bodyRows.js'
import type { DataColumn } from '../columns.js'
import { ArraySet, type Getter } from '../reactivity.svelte.js'
import type { DataLabel } from '../types/Label.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { isShiftClick } from '../utils/event.js'
import { nonUndefined } from '../utils/filter.js'

/**
 * Configuration options for the addGroupBy plugin.
 */
export interface GroupByConfig {
    /** Initial list of column IDs to group by. */
    initialGroupByIds?: string[] | undefined
    /** If true, prevents grouping by multiple columns. Defaults to false. */
    disableMultiGroup?: boolean | undefined
    /** Function to detect multi-group events (e.g., shift+click). Defaults to isShiftClick. */
    isMultiGroupEvent?: ((_event: Event) => boolean) | undefined
}

/**
 * State exposed by the addGroupBy plugin.
 */
export interface GroupByState {
    /** The column IDs to group by, in grouping order. */
    groupByIds: ArraySet<string>
}

/**
 * Per-column configuration options for grouping.
 *
 * @template Item - The type of data items.
 * @template Value - The type of the cell value.
 * @template GroupOn - The type to group on (must be string or number).
 * @template Aggregate - The type of the aggregated value.
 */
export interface GroupByColumnOptions<
    Item,
    // `any` defaults keep user callbacks free to treat the cell value as their own type.
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    Value = any,
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    GroupOn extends string | number = any,
    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    Aggregate = any
> {
    /** If true, grouping is disabled for this column. */
    disable?: boolean
    /** Function to compute an aggregate value from grouped values. */
    getAggregateValue?: (_values: GroupOn[]) => Aggregate
    /** Function to extract the grouping key from a cell value. */
    getGroupOn?: (_value: Value) => GroupOn
    /** Custom cell renderer for grouped rows. */
    cell?: DataLabel<Item>
}

/**
 * Props added to table elements by the group by plugin.
 */
export type GroupByPropSet = NewTablePropSet<{
    'thead.tr.th': {
        /** Whether this column is currently grouped. */
        grouped: boolean
        /** Function to toggle grouping on this column. */
        toggle: (_event: Event) => void
        /** Function to clear grouping on this column. */
        clear: () => void
        /** Whether grouping is disabled for this column. */
        disabled: boolean
    }
    'tbody.tr.td': {
        /** Whether this cell is a repeated group value (not the first in group). */
        repeated: boolean
        /** Whether this cell displays an aggregated value. */
        aggregated: boolean
        /** Whether this cell is the primary grouped column. */
        grouped: boolean
    }
}>

/**
 * Internal options for getGroupedRows.
 * @internal
 */
interface GetGroupedRowsProps {
    repeatCellIds: Record<string, boolean>
    aggregateCellIds: Record<string, boolean>
    groupCellIds: Record<string, boolean>
    allGroupByIds: string[]
}

/**
 * The per-cell flags produced while grouping, keyed by `cell.rowColId()`.
 * @internal
 */
interface GroupedCellFlags {
    repeatCellIds: Record<string, boolean>
    aggregateCellIds: Record<string, boolean>
    groupCellIds: Record<string, boolean>
}

const EMPTY_CELL_FLAGS: GroupedCellFlags = {
    repeatCellIds: {},
    aggregateCellIds: {},
    groupCellIds: {}
}

/**
 * Extracts the ID prefix from a row ID.
 * @internal
 */
const getIdPrefix = (id: string): string => {
    const prefixTokens = id.split('>').slice(0, -1)
    if (prefixTokens.length === 0) {
        return ''
    }
    return `${prefixTokens.join('>')}>`
}

/**
 * Recursively updates row IDs and depths for nested grouped rows.
 * @internal
 */
const deepenIdAndDepth = (row: BodyRow<unknown>, parentId: string) => {
    row.id = `${parentId}>${row.id}`
    row.depth = row.depth + 1
    row.subRows?.forEach((subRow) => deepenIdAndDepth(subRow, parentId))
}

/**
 * Groups rows by the specified column IDs, creating hierarchical grouped rows.
 * Computes aggregate values for non-grouped columns.
 *
 * @template Item - The type of data items.
 * @template Row - The row type.
 * @param rows - The rows to group.
 * @param groupByIds - Column IDs to group by, in order.
 * @param columnOptions - Per-column grouping configuration.
 * @param props - Internal state tracking objects.
 * @returns The grouped rows array.
 */
export const getGroupedRows = <Item, Row extends BodyRow<Item>>(
    rows: Row[],
    groupByIds: string[],
    columnOptions: Record<string, GroupByColumnOptions<Item>>,
    { repeatCellIds, aggregateCellIds, groupCellIds, allGroupByIds }: GetGroupedRowsProps
): Row[] => {
    const [groupById, ...restIds] = groupByIds
    const firstInputRow = rows[0]
    if (groupById === undefined || firstInputRow === undefined) {
        return rows
    }
    const idPrefix = getIdPrefix(firstInputRow.id)

    // Keys are whatever `getGroupOn` (or the raw cell value) yields; Map compares them by identity.
    // A lookup table local to this call, not state.
    // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
    const subRowsForGroupOnValue = new Map<unknown, Row[]>()
    for (const row of rows) {
        const cell = row.cellForId[groupById]
        if (!cell?.isData()) {
            break
        }
        const columnOption = columnOptions[groupById] ?? {}
        const { getGroupOn } = columnOption
        const groupOnValue: unknown = getGroupOn?.(cell.value) ?? cell.value
        if (typeof groupOnValue === 'function' || typeof groupOnValue === 'object') {
            console.warn(
                `Missing \`getGroupOn\` column option to aggregate column "${groupById}" with object values`
            )
        }
        let subRows = subRowsForGroupOnValue.get(groupOnValue)
        if (subRows === undefined) {
            subRows = []
            subRowsForGroupOnValue.set(groupOnValue, subRows)
        }
        subRows.push(row)
    }

    const groupedRows: Row[] = []
    let groupRowIdx = 0
    for (const [groupOnValue, subRows] of subRowsForGroupOnValue.entries()) {
        // Every group is created together with its first row, so this never skips.
        const firstRow = subRows.at(0)
        if (firstRow === undefined) {
            continue
        }
        const groupRow = new DisplayBodyRow<Item>({
            id: `${idPrefix}${groupRowIdx++}`,
            // TODO Differentiate data rows and grouped rows.
            depth: firstRow.depth,
            cells: [],
            cellForId: {}
        })
        const groupRowCellForId = Object.fromEntries(
            Object.entries(firstRow.cellForId).map(([id, cell]) => {
                if (id === groupById) {
                    const newCell = new DataBodyCell({
                        column: cell.column as DataColumn<Item>,
                        row: groupRow,
                        value: groupOnValue
                    })
                    return [id, newCell]
                }
                // `cell` is `firstRow`'s cell, i.e. the first entry of `columnCells`.
                if (!cell.isData()) {
                    const clonedCell = cell.clone()
                    clonedCell.row = groupRow
                    return [id, clonedCell]
                }
                const columnCells = subRows.map((row) => row.cellForId[id]).filter(nonUndefined)
                const { cell: label, getAggregateValue } = columnOptions[id] ?? {}
                const columnValues = (columnCells as DataBodyCell<Item>[]).map((cell) => cell.value)
                const value: unknown =
                    getAggregateValue === undefined ? '' : getAggregateValue(columnValues)
                const newCell = new DataBodyCell({
                    column: cell.column,
                    row: groupRow,
                    value,
                    label
                })
                return [id, newCell]
            })
        )
        const groupRowCells = firstRow.cells
            .map((cell) => groupRowCellForId[cell.id])
            .filter(nonUndefined)
        groupRow.cellForId = groupRowCellForId
        groupRow.cells = groupRowCells
        const groupRowSubRows = subRows.map((subRow) => {
            const clonedSubRow = subRow.clone({ includeCells: true, includeSubRows: true })
            deepenIdAndDepth(clonedSubRow, groupRow.id)
            return clonedSubRow
        })
        groupRow.subRows = getGroupedRows(groupRowSubRows, restIds, columnOptions, {
            repeatCellIds,
            aggregateCellIds,
            groupCellIds,
            allGroupByIds
        })
        groupedRows.push(groupRow as unknown as Row)
        groupRow.cells.forEach((cell) => {
            if (cell.id === groupById) {
                groupCellIds[cell.rowColId()] = true
            } else {
                aggregateCellIds[cell.rowColId()] = true
            }
        })
        groupRow.subRows.forEach((subRow) => {
            subRow.parentRow = groupRow
            subRow.cells.forEach((cell) => {
                if (allGroupByIds.includes(cell.id) && groupCellIds[cell.rowColId()] !== true) {
                    repeatCellIds[cell.rowColId()] = true
                }
            })
        })
    }
    return groupedRows
}

/**
 * Creates a group by plugin that enables grouping rows by column values.
 * Groups are hierarchical - grouping by multiple columns creates nested groups.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides grouping functionality.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
 *   group: addGroupBy({
 *     initialGroupByIds: ['department']
 *   })
 * })
 *
 * // Configure aggregation for columns
 * table.column({
 *   accessor: 'salary',
 *   header: 'Salary',
 *   plugins: {
 *     group: {
 *       getAggregateValue: (values) => values.reduce((a, b) => a + b, 0)
 *     }
 *   }
 * })
 * ```
 */
export const addGroupBy =
    <Item>({
        initialGroupByIds = [],
        disableMultiGroup = false,
        isMultiGroupEvent = isShiftClick
    }: GroupByConfig = {}): TablePlugin<
        Item,
        GroupByState,
        GroupByColumnOptions<Item>,
        GroupByPropSet
    > =>
    ({ columnOptions }) => {
        const disabledGroupIds = Object.entries(columnOptions)
            .filter(([, option]) => option.disable === true)
            .map(([columnId]) => columnId)

        const groupByIds = new ArraySet(initialGroupByIds)

        const pluginState: GroupByState = {
            groupByIds
        }

        // The cell flags are produced by the same pass that groups the rows and
        // read through a getter captured when the view model calls
        // `deriveRows`; nothing is written while deriving.
        let cellFlags: Getter<GroupedCellFlags> = () => EMPTY_CELL_FLAGS

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            const grouped = $derived.by(() => {
                const rowsValue = rows()
                const groupByIdsValue = groupByIds.current
                const flags: GroupedCellFlags = {
                    repeatCellIds: {},
                    aggregateCellIds: {},
                    groupCellIds: {}
                }
                const groupedRows = getGroupedRows(rowsValue, groupByIdsValue, columnOptions, {
                    ...flags,
                    allGroupByIds: groupByIdsValue
                })
                return { rows: groupedRows, flags }
            })
            cellFlags = () => grouped.flags
            return () => grouped.rows
        }

        return {
            pluginState,
            deriveRows,
            hooks: {
                'thead.tr.th': (cell) => {
                    const disabled = disabledGroupIds.includes(cell.id) || !cell.isData()
                    // Handlers are allocated once per cell, not per read.
                    const toggle = (event: Event) => {
                        if (!cell.isData()) return
                        if (disabled) return
                        groupByIds.toggle(cell.id, {
                            clearOthers: disableMultiGroup || !isMultiGroupEvent(event)
                        })
                    }
                    const clear = () => {
                        groupByIds.remove(cell.id)
                    }
                    return {
                        props: () => ({
                            grouped: groupByIds.has(cell.id),
                            toggle,
                            clear,
                            disabled
                        })
                    }
                },
                'tbody.tr.td': (cell) => ({
                    props: (): GroupByPropSet['tbody.tr.td'] => {
                        const { repeatCellIds, aggregateCellIds, groupCellIds } = cellFlags()
                        const rowColId = cell.rowColId()
                        return {
                            repeated: repeatCellIds[rowColId] === true,
                            aggregated: aggregateCellIds[rowColId] === true,
                            grouped: groupCellIds[rowColId] === true
                        }
                    }
                })
            }
        }
    }
