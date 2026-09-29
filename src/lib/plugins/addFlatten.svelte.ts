import type { BodyRow } from '../bodyRows.js'
import { box, type Box } from '../reactivity.svelte.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addFlatten plugin.
 */
export interface FlattenConfig {
    /** Initial depth to flatten. 0 means no flattening. Defaults to 0. */
    initialDepth?: number | undefined
}

/**
 * State exposed by the addFlatten plugin.
 */
export interface FlattenState {
    /** The current flatten depth. */
    depth: Box<number>
}

/**
 * Column options for the flatten plugin (currently empty).
 *
 * @template _Item - The type of data items (unused).
 */
export type FlattenColumnOptions<_Item> = Record<string, never>

/**
 * Props added to table cells by the flatten plugin.
 */
export type FlattenPropSet = NewTablePropSet<{
    'tbody.tr.td': {
        /** Function to set the flatten depth. */
        flatten: (_depth: number) => void
        /** Function to reset flattening (set depth to 0). */
        unflatten: () => void
    }
}>

/**
 * Recursively extracts rows at a specific depth from the hierarchy.
 *
 * @template Item - The type of data items.
 * @template Row - The row type.
 * @param rows - The rows to flatten.
 * @param depth - The depth to extract (0 returns current level).
 * @returns The flattened rows array.
 */
export const getFlattenedRows = <Item, Row extends BodyRow<Item>>(
    rows: Row[],
    depth: number
): Row[] => {
    if (depth === 0) return rows
    const flattenedRows: Row[] = []
    for (const row of rows) {
        if (row.subRows === undefined) continue
        // Sub-rows share their parent's concrete row type.
        flattenedRows.push(
            ...(getFlattenedRows<Item, BodyRow<Item>>(row.subRows, depth - 1) as Row[])
        )
    }
    return flattenedRows
}

/**
 * Creates a flatten plugin that enables displaying rows at a specific depth level.
 * Useful for showing only leaf nodes or a specific level of hierarchical data.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration options.
 * @returns A TablePlugin that provides flattening functionality.
 * @example
 * ```typescript
 * const table = createTable(() => data, {
 *   flatten: addFlatten({
 *     initialDepth: 0 // Start with no flattening
 *   })
 * })
 *
 * // Flatten to show only first-level children
 * viewModel.pluginStates.flatten.depth.current = 1
 * ```
 */
export const addFlatten =
    <Item>({ initialDepth = 0 }: FlattenConfig = {}): TablePlugin<
        Item,
        FlattenState,
        FlattenColumnOptions<Item>,
        FlattenPropSet
    > =>
    () => {
        const depth = box(initialDepth)
        const pluginState: FlattenState = { depth }
        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            const flattened = $derived.by(() => {
                const rowsValue = rows()
                return getFlattenedRows<Item, (typeof rowsValue)[number]>(rowsValue, depth.current)
            })
            return () => flattened
        }

        // The handlers do not depend on the cell, so one constant object is
        // shared by every cell's props getter.
        const cellProps: FlattenPropSet['tbody.tr.td'] = {
            flatten: (nextDepth: number) => {
                depth.current = nextDepth
            },
            unflatten: () => {
                depth.current = 0
            }
        }
        const getCellProps = () => cellProps

        return {
            pluginState,
            deriveRows,
            hooks: {
                'tbody.tr.td': () => ({ props: getCellProps })
            }
        }
    }
