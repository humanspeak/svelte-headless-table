import { derived, get, type Readable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { TablePlugin } from '../types/TablePlugin.js'
import { isReadable } from '../utils/store.js'

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
    childrenKey?: string
    /** Export format: 'object', 'json', or 'csv'. Defaults to 'object'. */
    format?: F
}

/**
 * State exposed by the addDataExport plugin.
 *
 * @template F - The export format type.
 */
export interface DataExportState<F extends DataExportFormat> {
    /** Readable store containing the exported data in the specified format. */
    exportedData: Readable<DataExport<F>>
}

/**
 * Per-column configuration options for data export.
 */
export interface DataExportColumnOptions {
    /** If true, this column is excluded from exports. */
    exclude?: boolean
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
            ids.map((id) => {
                const cell = row.cellForId[id]
                if (cell.isData()) {
                    return [id, cell.value]
                }
                if (cell.isDisplay() && cell.column.data !== undefined) {
                    let data = cell.column.data(cell, row.state)
                    if (isReadable(data)) {
                        data = get(data)
                    }
                    return [id, data]
                }
                return [id, null]
            })
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
        const line = ids.map((id) => {
            const cell = row.cellForId[id]
            if (cell.isData()) {
                return cell.value
            }
            if (cell.isDisplay() && cell.column.data !== undefined) {
                let data = cell.column.data(cell, row.state)
                if (isReadable(data)) {
                    data = get(data)
                }
                return data
            }
            return null
        })
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
 * const table = createTable(data, {
 *   export: addDataExport({
 *     format: 'csv',
 *     childrenKey: 'subItems'
 *   })
 * })
 *
 * // Access exported data
 * const { exportedData } = table.pluginStates.export
 * $: csvData = $exportedData
 * ```
 */
export const addDataExport =
    <Item, F extends DataExportFormat = 'object'>({
        format = 'object' as F,
        childrenKey = 'children'
    }: DataExportConfig<F> = {}): TablePlugin<Item, DataExportState<F>, DataExportColumnOptions> =>
    ({ tableState, columnOptions }) => {
        const excludedIds = Object.entries(columnOptions)
            .filter(([, option]) => option.exclude === true)
            .map(([columnId]) => columnId)

        const { visibleColumns, rows } = tableState

        const exportedIds = derived(visibleColumns, ($visibleColumns) =>
            $visibleColumns.map((c) => c.id).filter((id) => !excludedIds.includes(id))
        )

        const exportedData = derived([rows, exportedIds], ([$rows, $exportedIds]) => {
            switch (format) {
                case 'json':
                    return JSON.stringify(
                        getObjectsFromRows($rows, $exportedIds, childrenKey)
                    ) as DataExport<F>
                case 'csv':
                    return getCsvFromRows($rows, $exportedIds) as DataExport<F>
                default:
                    return getObjectsFromRows($rows, $exportedIds, childrenKey) as DataExport<F>
            }
        })

        const pluginState: DataExportState<F> = { exportedData }

        return {
            pluginState
        }
    }
