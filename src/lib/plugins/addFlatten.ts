import { derived, writable, type Readable, type Writable } from 'svelte/store'
import type { BodyRow } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Configuration options for the addFlatten plugin.
 */
export interface FlattenConfig {
    /** Initial depth to flatten. 0 means no flattening. Defaults to 0. */
    initialDepth?: number
}

/**
 * State exposed by the addFlatten plugin.
 */
export interface FlattenState {
    /** Writable store for the current flatten depth. */
    depth: Writable<number>
}

/**
 * Column options for the flatten plugin (currently empty).
 *
 * @template _Item - The type of data items (unused).
 */
/* trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars) */
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        flattenedRows.push(...(getFlattenedRows(row.subRows as any, depth - 1) as Row[]))
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
 * const table = createTable(data, {
 *   flatten: addFlatten({
 *     initialDepth: 0 // Start with no flattening
 *   })
 * })
 *
 * // Flatten to show only first-level children
 * table.pluginStates.flatten.depth.set(1)
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
        const depth = writable(initialDepth)
        const pluginState: FlattenState = { depth }
        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            return derived([rows, depth], ([$rows, $depth]) => {
                return getFlattenedRows<Item, (typeof $rows)[number]>($rows, $depth)
            })
        }

        return {
            pluginState,
            deriveRows,
            hooks: {
                'tbody.tr.td': () => {
                    const props: Readable<FlattenPropSet['tbody.tr.td']> = derived([], () => {
                        const flatten = ($depth: number) => {
                            depth.set($depth)
                        }
                        const unflatten = () => flatten(0)
                        return { flatten, unflatten }
                    })
                    return { props }
                }
            }
        }
    }
