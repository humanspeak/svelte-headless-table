import { derived, writable, type Writable } from 'svelte/store'
import type { DeriveFlatColumnsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addHiddenColumns plugin.
 */
export interface HiddenColumnsConfig {
    /** Initial list of column IDs to hide. */
    initialHiddenColumnIds?: string[]
}

/**
 * State exposed by the addHiddenColumns plugin.
 */
export interface HiddenColumnsState {
    /** Writable store containing the list of hidden column IDs. */
    hiddenColumnIds: Writable<string[]>
}

/**
 * Creates a hidden columns plugin that enables showing/hiding table columns.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides column visibility control.
 * @example
 * ```typescript
 * const table = createTable(data, {
 *   hide: addHiddenColumns({
 *     initialHiddenColumnIds: ['internalId', 'createdAt']
 *   })
 * })
 *
 * // Hide/show columns dynamically
 * const { hiddenColumnIds } = table.pluginStates.hide
 * hiddenColumnIds.update(ids => [...ids, 'newColumn'])
 * ```
 */
export const addHiddenColumns =
    <Item>({ initialHiddenColumnIds = [] }: HiddenColumnsConfig = {}): TablePlugin<
        Item,
        HiddenColumnsState,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    () => {
        const hiddenColumnIds = writable<string[]>(initialHiddenColumnIds)

        const pluginState: HiddenColumnsState = { hiddenColumnIds }

        const deriveFlatColumns: DeriveFlatColumnsFn<Item> = (flatColumns) => {
            return derived([flatColumns, hiddenColumnIds], ([$flatColumns, $hiddenColumnIds]) => {
                if ($hiddenColumnIds.length === 0) {
                    return $flatColumns
                }
                return $flatColumns.filter((c) => !$hiddenColumnIds.includes(c.id))
            })
        }

        return {
            pluginState,
            deriveFlatColumns
        }
    }
