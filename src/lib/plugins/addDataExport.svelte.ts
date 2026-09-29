import type { BodyCell } from '../bodyCells.js'
import type { BodyRow } from '../bodyRows.js'
import { derivedBox, type ReadonlyBox } from '../reactivity.svelte.js'
import { componentState } from '../tableComponent.svelte.js'
import type { NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Supported export formats for the data export plugin.
 */
export type DataExportFormat = 'object' | 'json' | 'csv'

/**
 * Maps export formats to their output types.
 * @internal
 */
type ExportForFormat = {
    object: Record<string, unknown>[]
    json: string
    csv: string
}

/**
 * The export output type based on the format.
 *
 * @template F - The export format.
 */
export type DataExport<F extends DataExportFormat> = ExportForFormat[F]

/**
 * Configuration options for the addDataExport plugin.
 *
 * @template F - The export format type.
 */
export interface DataExportConfig<F extends DataExportFormat> {
    /** Key used for nested children in hierarchical exports. Defaults to 'children'. */
    childrenKey?: string | undefined
    /** Export format: 'object', 'json', or 'csv'. Defaults to 'object'. */
    format?: F | undefined
}

/**
 * State exposed by the addDataExport plugin.
 *
 * @template F - The export format type.
 */
export interface DataExportState<F extends DataExportFormat> {
    /** The exported data in the specified format, recomputed when rows or columns change. */
    exportedData: ReadonlyBox<DataExport<F>>
}

/**
 * Per-column configuration options for data export.
 */
export interface DataExportColumnOptions {
    /** If true, this column is excluded from exports. */
    exclude?: boolean | undefined
}

/** addDataExport adds no per-component props; the key exists so `current.props` stays precisely typed. */
export type DataExportPropSet = NewTablePropSet<never>

/**
 * Resolves a cell's exported value: data cells export their value, display
 * cells the result of their column's `data` callback (a getter result is
 * called), anything else `null`.
 * @internal
 */
const getExportValue = <Item>(cell: BodyCell<Item> | undefined, row: BodyRow<Item>): unknown => {
    if (cell === undefined) {
        return null
    }
    if (cell.isData()) {
        return cell.value
    }
    if (cell.isDisplay() && cell.column.data !== undefined) {
        const data = cell.column.data(cell, componentState(row))
        return typeof data === 'function' ? (data as () => unknown)() : data
    }
    return null
}

/**
 * Converts rows to an array of plain objects.
 * @internal
 */
const getObjectsFromRows = <Item>(
    rows: BodyRow<Item>[],
    ids: string[],
    childrenKey: string
): Record<string, unknown>[] => {
    return rows.map((row) => {
        const dataObject = Object.fromEntries(
            ids.map((id) => [id, getExportValue(row.cellForId[id], row)])
        )
        if (row.subRows !== undefined) {
            dataObject[childrenKey] = getObjectsFromRows(row.subRows, ids, childrenKey)
        }
        return dataObject
    })
}

/**
 * Converts rows to CSV format.
 * @internal
 */
const getCsvFromRows = <Item>(rows: BodyRow<Item>[], ids: string[]): string => {
    const dataLines = rows.map((row) => {
        const line = ids.map((id) => getExportValue(row.cellForId[id], row))
        return line.join(',')
    })
    const headerLine = ids.join(',')
    return headerLine + '\n' + dataLines.join('\n')
}

/**
 * Creates a data export plugin that provides reactive exports of table data.
 * Supports exporting to objects, JSON, or CSV formats.
 *
 * @template Item - The type of data items in the table.
 * @template F - The export format type.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides data export functionality.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
 *   export: addDataExport({
 *     format: 'csv',
 *     childrenKey: 'subItems'
 *   })
 * })
 *
 * // Access exported data
 * const { exportedData } = viewModel.pluginStates.export
 * const csvData = $derived(exportedData.current)
 * ```
 */
export const addDataExport =
    <Item, F extends DataExportFormat = 'object'>({
        format = 'object' as F,
        childrenKey = 'children'
    }: DataExportConfig<F> = {}): TablePlugin<
        Item,
        DataExportState<F>,
        DataExportColumnOptions,
        DataExportPropSet
    > =>
    ({ tableState, columnOptions }) => {
        const excludedIds = Object.entries(columnOptions)
            .filter(([, option]) => option.exclude === true)
            .map(([columnId]) => columnId)

        const exportedData = derivedBox((): DataExport<F> => {
            const rows = tableState.rows()
            const exportedIds = tableState
                .visibleColumns()
                .map((c) => c.id)
                .filter((id) => !excludedIds.includes(id))
            switch (format) {
                case 'json':
                    return JSON.stringify(
                        getObjectsFromRows(rows, exportedIds, childrenKey)
                    ) as DataExport<F>
                case 'csv':
                    return getCsvFromRows(rows, exportedIds) as DataExport<F>
                case 'object':
                default:
                    return getObjectsFromRows(rows, exportedIds, childrenKey) as DataExport<F>
            }
        })

        const pluginState: DataExportState<F> = { exportedData }

        return {
            pluginState
        }
    }
