import { derived } from 'svelte/store'
import { DataBodyRow, getSubRows } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

/**
 * Utility type that extracts keys from Item whose values are arrays of Item.
 * Used to infer valid children property keys.
 *
 * @template Item - The type of data items.
 */
export type ValidChildrenKey<Item> = {
    [Key in keyof Item]: Item[Key] extends Item[] ? Key : never
}[keyof Item]

/**
 * Function type for extracting child items from a parent item.
 *
 * @template Item - The type of data items.
 */
export type ValidChildrenFn<Item> = (_item: Item) => Item[] | undefined

/**
 * Configuration options for the addSubRows plugin.
 *
 * @template Item - The type of data items.
 */
export interface SubRowsConfig<Item> {
    /** Property key or function to extract child items from each item. */
    children: ValidChildrenKey<Item> | ValidChildrenFn<Item>
}

/**
 * Recursively adds sub-rows to a row based on the children accessor.
 * @internal
 */
const withSubRows = <Item, Row extends DataBodyRow<Item>>(
    row: Row,
    getChildren: ValidChildrenFn<Item>
): Row => {
    const subItems = getChildren(row.original)
    if (subItems === undefined) {
        return row
    }
    const subRows = getSubRows(subItems, row) as (typeof row)[]
    row.subRows = subRows.map((row) => withSubRows(row, getChildren))
    return row
}

/**
 * Creates a sub-rows plugin that enables hierarchical data display.
 * Extracts child items from each row using the specified children accessor.
 *
 * @template Item - The type of data items in the table.
 * @param config - Configuration with the children accessor.
 * @returns A TablePlugin that creates hierarchical row structure.
 * @example
 * ```typescript
 * interface Employee {
 *   name: string
 *   directReports?: Employee[]
 * }
 *
 * const table = createTable(data, {
 *   subRows: addSubRows({
 *     children: 'directReports' // or: (item) => item.directReports
 *   })
 * })
 * ```
 */
export const addSubRows =
    <Item>({
        children
    }: SubRowsConfig<Item>): TablePlugin<
        Item,
        Record<string, never>,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    () => {
        const getChildren: ValidChildrenFn<Item> =
            children instanceof Function ? children : (item) => item[children] as unknown as Item[]

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            return derived(rows, ($rows) => {
                return $rows.map((row) => {
                    if (row.isData()) {
                        return withSubRows(row, getChildren)
                    }
                    return row
                })
            })
        }

        return {
            pluginState: {},
            deriveRows
        }
    }
