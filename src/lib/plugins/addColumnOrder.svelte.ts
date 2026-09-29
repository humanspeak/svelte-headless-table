import { box, type Box } from '../reactivity.svelte.js'
import type { DeriveFlatColumnsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addColumnOrder plugin.
 */
export interface ColumnOrderConfig {
    /** Initial order of column IDs. Columns are ordered in this sequence. */
    initialColumnIdOrder?: string[] | undefined
    /** If true, columns not in the order list are hidden. Defaults to false. */
    hideUnspecifiedColumns?: boolean | undefined
}

/**
 * State exposed by the addColumnOrder plugin.
 */
export interface ColumnOrderState {
    /** The ordered list of column IDs. Assign a new array to reorder. */
    columnIdOrder: Box<string[]>
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
 * const table = createTable(() => data, {
 *   order: addColumnOrder({
 *     initialColumnIdOrder: ['name', 'age', 'email'],
 *     hideUnspecifiedColumns: false
 *   })
 * })
 *
 * // Reorder columns dynamically
 * const { columnIdOrder } = viewModel.pluginStates.order
 * columnIdOrder.current = ['email', 'name', 'age']
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
        const columnIdOrder = box<string[]>(initialColumnIdOrder)

        const pluginState: ColumnOrderState = { columnIdOrder }

        const deriveFlatColumns: DeriveFlatColumnsFn<Item> = (flatColumns) => {
            const ordered = $derived.by(() => {
                const columns = flatColumns()
                // A lookup table local to this derivation, not state.
                // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
                const colById = new Map(columns.map((c) => [c.id, c]))
                const orderedFlatColumns: typeof columns = []
                columnIdOrder.current.forEach((id) => {
                    const col = colById.get(id)
                    if (col !== undefined) {
                        orderedFlatColumns.push(col)
                        colById.delete(id)
                    }
                })
                if (!hideUnspecifiedColumns) {
                    // Remaining entries preserve the original column order.
                    for (const col of colById.values()) {
                        orderedFlatColumns.push(col)
                    }
                }
                return orderedFlatColumns
            })
            return () => ordered
        }

        return {
            pluginState,
            deriveFlatColumns
        }
    }
