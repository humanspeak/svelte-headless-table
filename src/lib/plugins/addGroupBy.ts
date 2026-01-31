import { derived, writable, type Readable } from 'svelte/store'
import { DataBodyCell } from '../bodyCells.js'
import { BodyRow, DisplayBodyRow } from '../bodyRows.js'
import type { DataColumn } from '../columns.js'
import type { DataLabel } from '../types/Label.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'
import { isShiftClick } from '../utils/event.js'
import { nonUndefined } from '../utils/filter.js'
import { arraySetStore, type ArraySetStore } from '../utils/store.js'

/**
 * Configuration options for the addGroupBy plugin.
 */
export interface GroupByConfig {
    /** Initial list of column IDs to group by. */
    initialGroupByIds?: string[]
    /** If true, prevents grouping by multiple columns. Defaults to false. */
    disableMultiGroup?: boolean
    /** Function to detect multi-group events (e.g., shift+click). Defaults to isShiftClick. */
    isMultiGroupEvent?: (_event: Event) => boolean
}

/**
 * State exposed by the addGroupBy plugin.
 */
export interface GroupByState {
    /** Store containing the list of column IDs to group by. */
    groupByIds: ArraySetStore<string>
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Value = any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GroupOn extends string | number = any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deepenIdAndDepth = <Row extends BodyRow<any, any>>(row: Row, parentId: string) => {
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
 * @template GroupOn - The grouping key type.
 * @param rows - The rows to group.
 * @param groupByIds - Column IDs to group by, in order.
 * @param columnOptions - Per-column grouping configuration.
 * @param props - Internal state tracking objects.
 * @returns The grouped rows array.
 */
export const getGroupedRows = <
    Item,
    Row extends BodyRow<Item>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GroupOn extends string | number = any
>(
    rows: Row[],
    groupByIds: string[],
    columnOptions: Record<string, GroupByColumnOptions<Item>>,
    { repeatCellIds, aggregateCellIds, groupCellIds, allGroupByIds }: GetGroupedRowsProps
): Row[] => {
    if (groupByIds.length === 0) {
        return rows
    }
    if (rows.length === 0) {
        return rows
    }
    const idPrefix = getIdPrefix(rows[0].id)
    const [groupById, ...restIds] = groupByIds

    const subRowsForGroupOnValue = new Map<GroupOn, Row[]>()
    for (const row of rows) {
        const cell = row.cellForId[groupById]
        if (!cell.isData()) {
            break
        }
        const columnOption = columnOptions[groupById] ?? {}
        const { getGroupOn } = columnOption
        const groupOnValue = getGroupOn?.(cell.value) ?? cell.value
        if (typeof groupOnValue === 'function' || typeof groupOnValue === 'object') {
            console.warn(
                `Missing \`getGroupOn\` column option to aggregate column "${groupById}" with object values`
            )
        }
        const subRows = subRowsForGroupOnValue.get(groupOnValue) ?? []
        subRowsForGroupOnValue.set(groupOnValue, [...subRows, row])
    }

    const groupedRows: Row[] = []
    let groupRowIdx = 0
    for (const [groupOnValue, subRows] of subRowsForGroupOnValue.entries()) {
        // Guaranteed to have at least one subRow.
        const firstRow = subRows[0]
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
                const columnCells = subRows.map((row) => row.cellForId[id]).filter(nonUndefined)
                if (!columnCells[0].isData()) {
                    const clonedCell = columnCells[0].clone()
                    clonedCell.row = groupRow
                    return [id, clonedCell]
                }
                const { cell: label, getAggregateValue } = columnOptions[id] ?? {}
                const columnValues = (columnCells as DataBodyCell<Item>[]).map((cell) => cell.value)
                const value = getAggregateValue === undefined ? '' : getAggregateValue(columnValues)
                const newCell = new DataBodyCell({
                    column: cell.column as DataColumn<Item>,
                    row: groupRow,
                    value,
                    label
                })
                return [id, newCell]
            })
        )
        const groupRowCells = firstRow.cells.map((cell) => {
            return groupRowCellForId[cell.id]
        })
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
 * const table = createTable(data, {
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

        const groupByIds = arraySetStore(initialGroupByIds)

        const repeatCellIds = writable<Record<string, boolean>>({})
        const aggregateCellIds = writable<Record<string, boolean>>({})
        const groupCellIds = writable<Record<string, boolean>>({})

        const pluginState: GroupByState = {
            groupByIds
        }

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            return derived([rows, groupByIds], ([$rows, $groupByIds]) => {
                const $repeatCellIds = {}
                const $aggregateCellIds = {}
                const $groupCellIds = {}
                const $groupedRows = getGroupedRows($rows, $groupByIds, columnOptions, {
                    repeatCellIds: $repeatCellIds,
                    aggregateCellIds: $aggregateCellIds,
                    groupCellIds: $groupCellIds,
                    allGroupByIds: $groupByIds
                })
                repeatCellIds.set($repeatCellIds)
                aggregateCellIds.set($aggregateCellIds)
                groupCellIds.set($groupCellIds)
                return $groupedRows
            })
        }

        return {
            pluginState,
            deriveRows,
            hooks: {
                'thead.tr.th': (cell) => {
                    const disabled = disabledGroupIds.includes(cell.id) || !cell.isData()
                    const props = derived(groupByIds, ($groupByIds) => {
                        const grouped = $groupByIds.includes(cell.id)
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
                            grouped,
                            toggle,
                            clear,
                            disabled
                        }
                    })
                    return { props }
                },
                'tbody.tr.td': (cell) => {
                    const props: Readable<GroupByPropSet['tbody.tr.td']> = derived(
                        [repeatCellIds, aggregateCellIds, groupCellIds],
                        ([$repeatCellIds, $aggregateCellIds, $groupCellIds]) => {
                            return {
                                repeated: $repeatCellIds[cell.rowColId()] === true,
                                aggregated: $aggregateCellIds[cell.rowColId()] === true,
                                grouped: $groupCellIds[cell.rowColId()] === true
                            }
                        }
                    )
                    return { props }
                }
            }
        }
    }
