import { box, type Box } from '../reactivity.svelte.js'
import type { DeriveFlatColumnsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addHiddenColumns plugin.
 */
export interface HiddenColumnsConfig {
    /** Initial list of column IDs to hide. */
    initialHiddenColumnIds?: string[] | undefined
}

/**
 * State exposed by the addHiddenColumns plugin.
 */
export interface HiddenColumnsState {
    /** The IDs of the hidden columns. Assign a new array to change them. */
    hiddenColumnIds: Box<string[]>
}

/**
 * Creates a hidden columns plugin that enables showing/hiding table columns.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides column visibility control.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
 *   hide: addHiddenColumns({
 *     initialHiddenColumnIds: ['internalId', 'createdAt']
 *   })
 * })
 *
 * // Hide/show columns dynamically
 * const { hiddenColumnIds } = viewModel.pluginStates.hide
 * hiddenColumnIds.current = [...hiddenColumnIds.current, 'newColumn']
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
        const hiddenColumnIds = box<string[]>(initialHiddenColumnIds)

        const pluginState: HiddenColumnsState = { hiddenColumnIds }

        const deriveFlatColumns: DeriveFlatColumnsFn<Item> = (flatColumns) => {
            const visible = $derived.by(() => {
                const columns = flatColumns()
                const hiddenIds = hiddenColumnIds.current
                if (hiddenIds.length === 0) {
                    return columns
                }
                return columns.filter((c) => !hiddenIds.includes(c.id))
            })
            return () => visible
        }

        return {
            pluginState,
            deriveFlatColumns
        }
    }
