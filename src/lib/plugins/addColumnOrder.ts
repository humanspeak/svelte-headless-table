import { derived, writable, type Writable } from 'svelte/store'
import type { DeriveFlatColumnsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addColumnOrder plugin.
 */
export interface ColumnOrderConfig {
    /** Initial order of column IDs. Columns are ordered in this sequence. */
    initialColumnIdOrder?: string[]
    /** If true, columns not in the order list are hidden. Defaults to false. */
    hideUnspecifiedColumns?: boolean
}

/**
 * State exposed by the addColumnOrder plugin.
 */
export interface ColumnOrderState {
    /** Writable store containing the ordered list of column IDs. */
    columnIdOrder: Writable<string[]>
}

/**
 * Creates a column order plugin that enables reordering table columns.
 * Columns are displayed in the order specified by columnIdOrder.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides column ordering functionality.
 * @example
 * ```typescript
 * const table = createTable(data, {
 *   order: addColumnOrder({
 *     initialColumnIdOrder: ['name', 'age', 'email'],
 *     hideUnspecifiedColumns: false
 *   })
 * })
 *
 * // Reorder columns dynamically
 * const { columnIdOrder } = table.pluginStates.order
 * columnIdOrder.set(['email', 'name', 'age'])
 * ```
 */
export const addColumnOrder =
    <Item>({
        initialColumnIdOrder = [],
        hideUnspecifiedColumns = false
    }: ColumnOrderConfig = {}): TablePlugin<
        Item,
        ColumnOrderState,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    () => {
        const columnIdOrder = writable<string[]>(initialColumnIdOrder)

        const pluginState: ColumnOrderState = { columnIdOrder }

        const deriveFlatColumns: DeriveFlatColumnsFn<Item> = (flatColumns) => {
            return derived([flatColumns, columnIdOrder], ([$flatColumns, $columnIdOrder]) => {
                const _flatColumns = [...$flatColumns]
                const orderedFlatColumns: typeof $flatColumns = []
                $columnIdOrder.forEach((id) => {
                    const colIdx = _flatColumns.findIndex((c) => c.id === id)
                    orderedFlatColumns.push(..._flatColumns.splice(colIdx, 1))
                })
                if (!hideUnspecifiedColumns) {
                    // Push the remaining unspecified columns.
                    orderedFlatColumns.push(..._flatColumns)
                }
                return orderedFlatColumns
            })
        }

        return {
            pluginState,
            deriveFlatColumns
        }
    }
